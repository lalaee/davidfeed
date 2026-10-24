import Foundation
import Security

/// The account service: dafod.app's Supabase project, spoken to directly.
///
/// The web uses supabase-js; the app needs a handful of its calls and no more,
/// so they are made here over plain HTTPS rather than through a package: sign
/// in with an ID token (Apple's or Google's), refresh, sign out, the reader's
/// one row in `public.library`, and the delete-account function. The anon key
/// is the public one the website ships in its own JavaScript -- it grants
/// nothing by itself; the table's row-level security is the access control
/// (supabase/migrations in the web repo).
enum Supabase {
    static let url = URL(string: "https://ulmptivzgvcpbygpkkfv.supabase.co")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbXB0aXZ6Z3ZjcGJ5Z3Bra2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NDIzMTUsImV4cCI6MjEwODAxODMxNX0.hhuxSbEAZuFiNMlcy_DaZZUOeGUnsPVnjj1Vkb5fKZM"

    struct Failure: LocalizedError {
        let status: Int
        let message: String
        var errorDescription: String? { message }
    }

    // MARK: auth

    /// Trades an Apple or Google ID token for a session. `nonce` is the RAW
    /// nonce; the provider was given its SHA-256, and Supabase checks one
    /// against the other.
    static func signIn(provider: String, idToken: String, nonce: String) async throws -> AccountSession {
        let json = try await call("auth/v1/token?grant_type=id_token", body: [
            "provider": provider, "id_token": idToken, "nonce": nonce,
        ])
        return try AccountSession(json)
    }

    static func refresh(_ session: AccountSession) async throws -> AccountSession {
        let json = try await call("auth/v1/token?grant_type=refresh_token", body: [
            "refresh_token": session.refreshToken,
        ])
        return try AccountSession(json)
    }

    /// Apple gives the reader's name only on their first authorisation, and
    /// not in the token; it is written onto the account so You can show it.
    static func setName(_ name: String, session: AccountSession) async throws -> AccountSession {
        let json = try await call("auth/v1/user", method: "PUT", token: session.accessToken,
                                  body: ["data": ["full_name": name]])
        var next = session
        next.name = (json["user_metadata"] as? [String: Any]).flatMap(AccountSession.name) ?? name
        return next
    }

    static func signOut(_ session: AccountSession) async {
        _ = try? await call("auth/v1/logout?scope=local", token: session.accessToken, body: [:])
    }

    // MARK: the Library row

    static func pullLibrary(_ session: AccountSession) async throws -> [String: Any]? {
        let rows = try await callArray(
            "rest/v1/library?select=saved_posts,saved_verses,highlights&user_id=eq.\(session.userID)",
            token: session.accessToken)
        return rows.first
    }

    static func pushLibrary(_ row: [String: Any], session: AccountSession) async throws {
        var body = row
        body["user_id"] = session.userID
        _ = try await raw("rest/v1/library", method: "POST", token: session.accessToken, body: body,
                          headers: ["Prefer": "resolution=merge-duplicates,return=minimal"])
    }

    /// The providers the reader's account is linked to ("apple", "google"),
    /// from the auth server rather than the cached session, so an account that
    /// gained Apple on the web is seen.
    static func providers(_ session: AccountSession) async throws -> [String] {
        let user = try await call("auth/v1/user", method: "GET", token: session.accessToken, body: nil)
        let meta = user["app_metadata"] as? [String: Any] ?? [:]
        return meta["providers"] as? [String] ?? (meta["provider"] as? String).map { [$0] } ?? []
    }

    /// Revokes the reader's Sign in with Apple authorization: the apple-revoke
    /// Edge Function trades this fresh authorization code for Apple's refresh
    /// token and revokes it (supabase/functions/apple-revoke).
    static func revokeApple(code: String, session: AccountSession) async throws {
        _ = try await raw("functions/v1/apple-revoke", method: "POST", token: session.accessToken,
                          body: ["code": code])
    }

    /// public.delete_my_account() (supabase/migrations/20261023000000_delete_account.sql):
    /// removes the signed-in reader's account and, by cascade, their Library.
    static func deleteAccount(_ session: AccountSession) async throws {
        _ = try await raw("rest/v1/rpc/delete_my_account", method: "POST", token: session.accessToken, body: [:])
    }

    // MARK: plumbing

    private static func call(_ path: String, method: String = "POST", token: String? = nil,
                             body: [String: Any]?) async throws -> [String: Any] {
        let data = try await raw(path, method: method, token: token, body: body)
        if data.isEmpty { return [:] }
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw Failure(status: 0, message: "Unexpected reply from the account service.")
        }
        return json
    }

    private static func callArray(_ path: String, token: String) async throws -> [[String: Any]] {
        let data = try await raw(path, method: "GET", token: token, body: nil)
        return (try JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }

    @discardableResult
    private static func raw(_ path: String, method: String, token: String?, body: [String: Any]?,
                            headers: [String: String] = [:]) async throws -> Data {
        var request = URLRequest(url: URL(string: path, relativeTo: url)!)
        request.httpMethod = method
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token ?? anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        for (k, v) in headers { request.setValue(v, forHTTPHeaderField: k) }
        if let body, method != "GET" { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let message = (json?["msg"] ?? json?["message"] ?? json?["error_description"] ?? json?["error"]) as? String
            throw Failure(status: status, message: message ?? "The account service answered \(status).")
        }
        return data
    }
}

/// A signed-in reader's session, as the app keeps it (in the Keychain).
struct AccountSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
    var userID: String
    var email: String?
    var name: String?

    init(_ json: [String: Any]) throws {
        guard let access = json["access_token"] as? String,
              let refresh = json["refresh_token"] as? String,
              let user = json["user"] as? [String: Any],
              let id = user["id"] as? String
        else { throw Supabase.Failure(status: 0, message: "The sign-in reply was incomplete.") }
        accessToken = access
        refreshToken = refresh
        if let at = json["expires_at"] as? Double {
            expiresAt = Date(timeIntervalSince1970: at)
        } else {
            expiresAt = Date().addingTimeInterval((json["expires_in"] as? Double) ?? 3600)
        }
        userID = id
        email = user["email"] as? String
        name = (user["user_metadata"] as? [String: Any]).flatMap(Self.name)
    }

    static func name(_ meta: [String: Any]) -> String? {
        for key in ["full_name", "name"] {
            if let n = meta[key] as? String, !n.isEmpty { return n }
        }
        return nil
    }

    var isExpiring: Bool { expiresAt.timeIntervalSinceNow < 60 }

    // MARK: Keychain

    private static let service = "app.dafod.session"

    static func load() -> AccountSession? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecReturnData as String: true]
        var out: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess, let data = out as? Data
        else { return nil }
        return try? JSONDecoder().decode(AccountSession.self, from: data)
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        Self.clear()
        let item: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                   kSecAttrService as String: Self.service,
                                   kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
                                   kSecValueData as String: data]
        SecItemAdd(item as CFDictionary, nil)
    }

    static func clear() {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword,
                       kSecAttrService as String: service] as CFDictionary)
    }
}
