import SwiftUI

/// You: the account centre -- the web's /you (Library.tsx).
///
/// Signed out, it is the sign-in prompt alone: "Keep what speaks to you", what
/// an account does, Continue with Google and Continue with Apple, and a small
/// Privacy link. Signed in: the "Account" title, the reader (initial, name,
/// email), then one card of rows -- Saved (the old Library, as its own page),
/// Privacy, Delete account, Sign out.
struct YouView: View {
    @State private var showPrivacy = false
    @State private var showTerms = false
    @State private var confirmDelete = false
    @State private var deleting = false
    @State private var deleteFailure: String?
    @State private var leaving = false
    @Environment(\.openURL) private var openURL
    private var account: Account { .shared }

    private static let contact = "lakesofmotion@gmail.com"

    var body: some View {
        NavigationStack {
            ScrollView {
                if account.status == .signedIn { signedIn } else { prompt }
            }
            .scrollBounceBehavior(.basedOnSize)
            .background(DF.ground)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: String.self) { _ in
                LibraryView()
                    .navigationTitle("Saved")
                    .navigationBarTitleDisplayMode(.large)
                    .toolbar(.visible, for: .navigationBar)
            }
        }
        .sheet(isPresented: $showPrivacy) { SafariView(url: URL(string: "https://www.dafod.app/privacy")!) }
        .sheet(isPresented: $showTerms) { SafariView(url: URL(string: "https://www.dafod.app/terms")!) }
        .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete account", role: .destructive) { Task { await delete() } }
        } message: {
            Text("This removes your account and everything saved to it, on every device. It can't be undone.")
        }
        .alert("Couldn't delete your account", isPresented: Binding(
            get: { deleteFailure != nil }, set: { if !$0 { deleteFailure = nil } }
        )) {
            Button("Email us instead") { emailDeletionRequest() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(deleteFailure ?? "")
        }
    }

    // MARK: signed out

    private var prompt: some View {
        VStack(spacing: 0) {
            Text("Keep what speaks to you")
                .font(.system(size: 32, weight: .bold))
                .tracking(-0.8)
                .foregroundStyle(DF.ink)
                .multilineTextAlignment(.center)
            Text("Create a free account to save films and verses, keep your highlights, and find them all on every device. No ads or purchases, ever.")
                .font(.system(size: 17))
                .lineSpacing(4)
                .foregroundStyle(DF.ink.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.top, 16)
            ProviderButtons()
                .padding(.top, 28)
            LegalLinks()
                .padding(.top, 18)
        }
        .padding(.horizontal, 24)
        .padding(.top, 96)
        .frame(maxWidth: .infinity)
    }

    // MARK: signed in

    private var signedIn: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Account")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(DF.ink)

            if let s = account.session {
                HStack(spacing: 14) {
                    Text(initial(s))
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(DF.ink)
                        .frame(width: 56, height: 56)
                        .background(DF.surfaceRaised, in: .circle)
                    VStack(alignment: .leading, spacing: 2) {
                        if let name = s.name {
                            Text(name).font(.system(size: 17, weight: .semibold)).foregroundStyle(DF.ink)
                        }
                        if let email = s.email {
                            Text(email).font(.system(size: 15)).foregroundStyle(DF.inkDim)
                        }
                    }
                }
            }

            VStack(spacing: 0) {
                NavigationLink(value: "saved") { row("Saved") }
                hairline
                Button { showPrivacy = true } label: { row("Privacy") }
                hairline
                Button { showTerms = true } label: { row("Terms") }
                hairline
                Button { confirmDelete = true } label: { row(deleting ? "Deleting…" : "Delete account") }
                    .disabled(deleting)
                hairline
                Button {
                    leaving = true
                    Task { await account.signOut(); leaving = false }
                } label: { row(leaving ? "Signing out…" : "Sign out", onward: false) }
                    .disabled(leaving)
            }
            .buttonStyle(.plain)
            .background(DF.surface, in: .rect(cornerRadius: 18.83))
        }
        .padding(.horizontal, 24)
        .padding(.top, 72)
    }

    private func row(_ title: String, onward: Bool = true) -> some View {
        HStack {
            Text(title).font(.system(size: 17)).foregroundStyle(DF.ink)
            Spacer()
            if onward { Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(DF.inkDim) }
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .contentShape(Rectangle())
    }

    private var hairline: some View {
        Rectangle().fill(Color.white.opacity(0.1)).frame(height: 0.5).padding(.leading, 16)
    }

    private func initial(_ s: AccountSession) -> String {
        String((s.name ?? s.email ?? "?").prefix(1)).uppercased()
    }

    // MARK: deleting

    private func delete() async {
        deleting = true
        defer { deleting = false }
        do {
            try await account.deleteAccount()
        } catch {
            deleteFailure = "\(error.localizedDescription) You can ask us to delete it by email."
        }
    }

    private func emailDeletionRequest() {
        let subject = "Delete my Dafod account".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "mailto:\(Self.contact)?subject=\(subject)") { openURL(url) }
    }
}
