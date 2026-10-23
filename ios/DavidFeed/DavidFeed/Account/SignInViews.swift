import SafariServices
import SwiftUI

/// The sign-in sheet, raised when a signed-out reader saves or highlights --
/// the web's AuthSheet.tsx (modelled on YouVersion's account prompt): a
/// grabber, the promise, a ruled checklist, Continue with Google as the light
/// primary pill, Continue with Apple, and the privacy link.
struct SignInSheet: View {
    @State private var showPrivacy = false
    private var account: Account { .shared }

    private static let checklist = ["Save films to watch again", "Highlight verses", "On every device"]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Save the verses that speak to you. 100% free.")
                .font(.system(size: 28, weight: .bold))
                .tracking(-0.6)
                .foregroundStyle(DF.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text("No ads or purchases")
                .font(.system(size: 17))
                .foregroundStyle(DF.ink.opacity(0.7))
                .padding(.top, 8)

            VStack(spacing: 0) {
                ForEach(Self.checklist, id: \.self) { line in
                    HStack(spacing: 12) {
                        CheckRing()
                        Text(line).font(.system(size: 17)).foregroundStyle(DF.ink)
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .overlay(alignment: .bottom) { Rectangle().fill(Color.white.opacity(0.12)).frame(height: 0.5) }
                }
            }
            .padding(.top, 20)

            ProviderButtons(compactApple: true)
                .padding(.top, 24)

            Button("Privacy") { showPrivacy = true }
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(DF.ink.opacity(0.6))
                .frame(maxWidth: .infinity)
                .padding(.top, 14)
        }
        .padding(.horizontal, 24)
        .padding(.top, 28)
        .padding(.bottom, 12)
        .presentationDetents([.height(560), .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(DF.surface)
        .sheet(isPresented: $showPrivacy) { SafariView(url: URL(string: "https://www.dafod.app/privacy")!) }
    }
}

/// Continue with Google (the light primary pill) and Continue with Apple,
/// with the status line under them. Shared by the sheet and the You prompt
/// (the web's SignIn.tsx). In the sheet Apple is a white link, as the web
/// sheet has it; on You both are full pills.
struct ProviderButtons: View {
    var compactApple = false
    private var account: Account { .shared }

    var body: some View {
        VStack(spacing: 12) {
            Button {
                Task { await account.signInWithGoogle() }
            } label: {
                HStack(spacing: 10) {
                    Image("GoogleLogo").resizable().frame(width: 20, height: 20)
                    Text(account.busy == .google ? "Opening Google…" : "Continue with Google")
                }
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color(hex: "#111111"))
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(Color(hex: "#EDEDED"), in: .capsule)
            }
            .buttonStyle(.plain)
            .disabled(account.busy != nil)

            Button {
                Task { await account.signInWithApple() }
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "apple.logo").font(.system(size: 19, weight: .medium))
                    Text(account.busy == .apple ? "Opening Apple…" : "Continue with Apple")
                }
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(DF.ink)
                .frame(maxWidth: .infinity, minHeight: compactApple ? 44 : 56)
                .background(compactApple ? Color.clear : Color(hex: "#2C2C2C"), in: .capsule)
            }
            .buttonStyle(.plain)
            .disabled(account.busy != nil)

            if let error = account.errorMessage {
                Text(error)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color(hex: "#FF6B6B"))
                    .multilineTextAlignment(.center)
            }
        }
        .opacity(account.busy == nil ? 1 : 0.85)
    }
}

/// The web sheet's green check ring.
private struct CheckRing: View {
    var body: some View {
        ZStack {
            Circle().strokeBorder(Color(hex: "#30D158"), lineWidth: 1.75)
            Image(systemName: "checkmark")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Color(hex: "#30D158"))
        }
        .frame(width: 24, height: 24)
    }
}

/// A web page inside the app (the privacy policy), so the reader is never sent
/// out to Safari and back.
struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let vc = SFSafariViewController(url: url)
        vc.preferredBarTintColor = .black
        vc.preferredControlTintColor = .white
        return vc
    }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}
