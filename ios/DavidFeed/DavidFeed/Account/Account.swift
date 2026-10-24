import AuthenticationServices
import OSLog
import CryptoKit
import Observation
import SwiftUI

/// Accounts, and the Library that belongs to one -- the web's src/lib/auth.ts.
///
/// Saving a film and highlighting a verse need a reader who is signed in, as on
/// dafod.app; the feed, the Bible and sound work for anyone. The Library stays
/// in AppState exactly as before and is still what every screen reads, so the
/// app is as instant as it was: it is now a cache of the reader's row in
/// Supabase's `library` table, pushed up after each change (debounced 400ms)
/// and pulled down on sign-in and whenever the app comes back to the front.
///
/// The same account works on the web and here: the row's ids and keys are the
/// web's (films.ts ids, "Psalms 23" chapter keys), so a film saved on one is
/// saved on the other.
@Observable
@MainActor
final class Account: NSObject {
    static let shared = Account()
    private static let log = Logger(subsystem: "com.davidfeed.ios", category: "account")

    enum Status: Equatable { case loading, signedOut, signedIn }
    enum Provider { case apple, google }

    private(set) var status: Status = .loading
    private(set) var session: AccountSession?
    /// Whether the sign-in sheet is up.
    var sheetShown = false
    /// The provider whose sign-in is running, for the buttons' "Opening…".
    private(set) var busy: Provider?
    var errorMessage: String?

    /// What the reader was doing when they were asked to sign in: applied once
    /// they have, dropped if they close the sheet. A closure is enough here --
    /// the app never leaves this process to sign in, unlike the web page.
    private var pending: (() -> Void)?
    private weak var app: AppState?
    private var appleContinuation: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?

    /// The web client's id (Google Cloud project "Dafod"). Google returns to the
    /// web's own callback, https://www.dafod.app/auth/google, which the app
    /// catches before the page loads (see signInWithGoogle).
    private static let googleClientID = "62034029832-8od42qjc3laha1g25i7j47feebmfn1qu.apps.googleusercontent.com"

    // MARK: start-up

    /// Once, at launch: the session the Keychain holds, refreshed if it has run
    /// out, then the Library synced.
    func start(app: AppState) async {
        self.app = app
        app.onLocalChange = { [weak self] in self?.schedulePush() }
        // App Store screenshots: a sample reader and Library, so You, Saved and
        // the reader's highlights can be shown. Nothing is stored or sent --
        // no Keychain, no sync (syncedFor stays nil, so changes don't push).
        if ScreenshotMode.on {
            session = try? AccountSession(["access_token": "screenshot", "refresh_token": "screenshot",
                                           "expires_in": 1e9,
                                           "user": ["id": "screenshot", "email": "reader@dafod.app",
                                                    "user_metadata": ["full_name": "Dafod Reader"]]])
            status = .signedIn
            app.apply(row: ScreenshotMode.sampleLibrary)
            return
        }
        guard var saved = AccountSession.load() else { status = .signedOut; return }
        if saved.isExpiring {
            guard let fresh = try? await Supabase.refresh(saved) else {
                // Offline at launch: stay signed in on what we have and try again
                // when the app is next brought to the front.
                session = saved
                status = .signedIn
                return
            }
            saved = fresh
            saved.save()
        }
        session = saved
        status = .signedIn
        await startSync()
    }

    /// The app came back to the front: the web's visibilitychange.
    func foreground() async {
        guard status == .signedIn else { return }
        guard syncedFor == session?.userID else { await startSync(); return }
        if dirty { await push(); return }
        guard let s = await validSession(), let remote = try? await Supabase.pullLibrary(s),
              syncedFor == s.userID, !dirty
        else { return }
        app?.apply(row: remote)
    }

    /// A session whose access token has at least a minute left, refreshing it
    /// if not. Nil when signed out or when the refresh can't be made.
    func validSession() async -> AccountSession? {
        guard var s = session else { return nil }
        if s.isExpiring {
            guard let fresh = try? await Supabase.refresh(s) else { return nil }
            s = fresh
            s.save()
            session = s
        }
        return s
    }

    // MARK: gating

    /// Do it if the reader is signed in; otherwise hold it and ask them to sign
    /// in. Returns whether it was done, so a caller plays its confirmation (the
    /// bookmark's pop, the heart) only for a save that actually happened. The
    /// closure must set an END STATE ("saved", "this colour"), never toggle --
    /// replayed after sign-in it may land on a Library that already holds it.
    @discardableResult
    func gated(_ apply: @escaping () -> Void) -> Bool {
        if status == .signedIn {
            apply()
            return true
        }
        pending = apply
        errorMessage = nil
        sheetShown = true
        return false
    }

    /// The sheet was closed without signing in: what was held goes too.
    func dismissSheet() {
        pending = nil
        sheetShown = false
    }

    // MARK: signing in

    private func signedIn(_ s: AccountSession) async {
        s.save()
        session = s
        status = .signedIn
        busy = nil
        errorMessage = nil
        await startSync()
        pending?()
        pending = nil
        sheetShown = false
    }

    /// Sign in with Apple, natively. com.davidfeed.ios is one of the Apple
    /// provider's client ids in Supabase, so Apple's token goes straight to it.
    func signInWithApple() async {
        guard busy == nil else { return }
        busy = .apple
        errorMessage = nil
        defer { if busy == .apple { busy = nil } }
        let raw = Self.randomNonce()
        do {
            let credential = try await appleAuthorization(scopes: [.fullName, .email], nonce: Self.sha256(raw))
            guard let data = credential.identityToken, let token = String(data: data, encoding: .utf8) else {
                throw Supabase.Failure(status: 0, message: "Apple didn't return a sign-in token.")
            }
            var s = try await Supabase.signIn(provider: "apple", idToken: token, nonce: raw)
            // Apple names the reader only on their first sign-in, and not in the
            // token: write it onto the account so You can greet them.
            if s.name == nil, let full = credential.fullName {
                let name = PersonNameComponentsFormatter().string(from: full)
                if !name.isEmpty { s = (try? await Supabase.setName(name, session: s)) ?? s }
            }
            await signedIn(s)
        } catch let error as ASAuthorizationError where error.code == .canceled {
            // Closed Apple's sheet: nothing to say.
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Google, through the web's own sign-in: Google's OpenID endpoint with the
    /// web client, returning an ID token to https://www.dafod.app/auth/google --
    /// the redirect Google already allows. The app runs it in Apple's secure
    /// browser sheet and takes the return the moment Google sends it there
    /// (an https callback, iOS 17.4+; it needs dafod.app's
    /// apple-app-site-association to name this app under webcredentials).
    /// The token then goes to Supabase as the web page would send it.
    func signInWithGoogle() async {
        guard busy == nil else { return }
        busy = .google
        errorMessage = nil
        defer { if busy == .google { busy = nil } }
        let raw = Self.randomNonce(), state = Self.randomNonce()
        var url = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        url.queryItems = [
            .init(name: "client_id", value: Self.googleClientID),
            .init(name: "redirect_uri", value: "https://www.dafod.app/auth/google"),
            .init(name: "response_type", value: "id_token"),
            .init(name: "scope", value: "openid email profile"),
            .init(name: "nonce", value: Self.sha256(raw)),
            .init(name: "state", value: state),
            .init(name: "prompt", value: "select_account"),
        ]
        do {
            let returned: URL = try await withCheckedThrowingContinuation { continuation in
                let web = ASWebAuthenticationSession(
                    url: url.url!, callback: .https(host: "www.dafod.app", path: "/auth/google")
                ) { url, error in
                    if let url { continuation.resume(returning: url) }
                    else { continuation.resume(throwing: error ?? URLError(.cancelled)) }
                }
                web.presentationContextProvider = self
                if !web.start() {
                    Self.log.error("Google sign-in: the web session refused to start")
                    continuation.resume(throwing: Supabase.Failure(status: 0, message: "Couldn't open Google sign-in."))
                }
            }
            var fragment = URLComponents()
            fragment.query = returned.fragment
            let values = Dictionary((fragment.queryItems ?? []).map { ($0.name, $0.value ?? "") },
                                    uniquingKeysWith: { a, _ in a })
            guard values["state"] == state else {
                throw Supabase.Failure(status: 0, message: "This sign-in did not start here.")
            }
            guard let token = values["id_token"] else {
                throw Supabase.Failure(status: 0, message: values["error"] ?? "Google did not return a token.")
            }
            await signedIn(try await Supabase.signIn(provider: "google", idToken: token, nonce: raw))
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            // Closed the sheet -- or iOS refused the https return because
            // dafod.app doesn't yet name this app (its apple-app-site-
            // association isn't live), which it also reports as a cancel.
            Self.log.notice("Google sign-in ended: canceledLogin \(error.localizedDescription, privacy: .public)")
            if error.localizedDescription.localizedCaseInsensitiveContains("not associated") {
                errorMessage = "Google sign-in isn't ready in the app yet. Use Continue with Apple for now."
            }
        } catch {
            Self.log.error("Google sign-in failed: \(String(describing: error), privacy: .public)")
            errorMessage = error.localizedDescription
        }
    }

    /// Apple's sign-in sheet, returning the credential: the identity token
    /// (to sign in) and a one-time authorization code (to revoke on deletion).
    private func appleAuthorization(scopes: [ASAuthorization.Scope], nonce: String?) async throws
        -> ASAuthorizationAppleIDCredential {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = scopes
        request.nonce = nonce
        return try await withCheckedThrowingContinuation { continuation in
            appleContinuation = continuation
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    // MARK: signing out, deleting

    func signOut() async {
        if let s = session { await Supabase.signOut(s) }
        endSession()
    }

    /// Deletes the account and everything saved to it, on every device
    /// (public.delete_my_account in the web repo's supabase/migrations).
    ///
    /// An account linked to Apple first has its Sign in with Apple authorization
    /// revoked, as Apple asks: the reader confirms with Apple (a fresh
    /// authorization code, good for five minutes), and the apple-revoke function
    /// revokes it. Closing Apple's sheet stops the deletion. If the revocation
    /// itself fails (the function not deployed, Apple unreachable), the account
    /// is still deleted -- that is what the reader asked for -- and it's logged;
    /// the reader can also remove Dafod in Settings › Apple Account › Sign in
    /// with Apple.
    func deleteAccount() async throws {
        guard let s = await validSession() else {
            throw Supabase.Failure(status: 401, message: "Sign in again to delete your account.")
        }
        let providers = (try? await Supabase.providers(s)) ?? []
        if providers.contains("apple") {
            let credential: ASAuthorizationAppleIDCredential
            do {
                credential = try await appleAuthorization(scopes: [], nonce: nil)
            } catch let error as ASAuthorizationError where error.code == .canceled {
                throw Supabase.Failure(status: 0, message: "Deletion cancelled. Confirm with Apple to delete your account.")
            }
            if let data = credential.authorizationCode, let code = String(data: data, encoding: .utf8) {
                do {
                    try await Supabase.revokeApple(code: code, session: s)
                    Self.log.notice("Apple authorization revoked")
                } catch {
                    Self.log.error("Apple revocation failed: \(String(describing: error), privacy: .public)")
                }
            }
        }
        try await Supabase.deleteAccount(s)
        endSession()
    }

    private func endSession() {
        AccountSession.clear()
        session = nil
        status = .signedOut
        stopSync()
    }

    // MARK: the Library row (lib/auth.ts startSync / push / stopSync)

    /// Whose Library the local cache holds. Absent means saves made on this
    /// phone before accounts -- they join whichever account signs in first. A
    /// different id means someone else's, dropped rather than merged.
    private static let ownerKey = "dafod.libraryOwner"
    /// Set by a local change until the server has it, so an offline save is
    /// pushed on the next sync instead of being overwritten by the older row.
    private static let dirtyKey = "dafod.libraryDirty"

    private var syncedFor: String?
    private var pushTask: Task<Void, Never>?

    private var dirty: Bool {
        get { UserDefaults.standard.bool(forKey: Self.dirtyKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.dirtyKey) }
    }

    private func startSync() async {
        guard let app, let s = await validSession() else { return }
        syncedFor = s.userID
        let remote: [String: Any]?
        do { remote = try await Supabase.pullLibrary(s) } catch { syncedFor = nil; return }
        guard syncedFor == s.userID else { return }
        let owner = UserDefaults.standard.string(forKey: Self.ownerKey)
        var send = remote == nil
        let server = remote ?? AppState.emptyRow
        if owner == s.userID {
            if dirty { send = true } else { app.apply(row: server) }
        } else if owner == nil {
            app.apply(row: AppState.merge(remote: server, device: app.libraryRow()))
            send = true
        } else {
            app.apply(row: server)
        }
        UserDefaults.standard.set(s.userID, forKey: Self.ownerKey)
        if send { await push() }
    }

    private func schedulePush() {
        guard syncedFor != nil else { return }
        dirty = true
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await self?.push()
        }
    }

    private func push() async {
        guard let app, let id = syncedFor, let s = await validSession(), s.userID == id else { return }
        do {
            try await Supabase.pushLibrary(app.libraryRow(), session: s)
            if syncedFor == id { dirty = false }
        } catch {
            // Stays dirty; the next foreground or change sends it.
        }
    }

    private func stopSync() {
        syncedFor = nil
        pushTask?.cancel()
        pushTask = nil
        app?.apply(row: AppState.emptyRow)
        UserDefaults.standard.removeObject(forKey: Self.ownerKey)
        dirty = false
    }

    // MARK: nonces

    private static func randomNonce() -> String {
        (UUID().uuidString + UUID().uuidString).replacingOccurrences(of: "-", with: "").lowercased()
    }

    private static func sha256(_ text: String) -> String {
        SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: Apple's callbacks, and where the sheets present from

extension Account: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding,
    ASWebAuthenticationPresentationContextProviding {
    nonisolated func authorizationController(controller: ASAuthorizationController,
                                             didCompleteWithAuthorization authorization: ASAuthorization) {
        MainActor.assumeIsolated {
            if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
                appleContinuation?.resume(returning: credential)
            } else {
                appleContinuation?.resume(throwing: ASAuthorizationError(.unknown))
            }
            appleContinuation = nil
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        MainActor.assumeIsolated {
            appleContinuation?.resume(throwing: error)
            appleContinuation = nil
        }
    }

    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated { Self.keyWindow() }
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated { Self.keyWindow() }
    }

    private static func keyWindow() -> UIWindow {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? scenes.first.map { UIWindow(windowScene: $0) } ?? UIWindow()
    }
}
