import SwiftUI

@main
struct DavidFeedApp: App {
    @State private var app = AppState()

    init() {
        Playback.configureSession()
        MainActor.assumeIsolated {
            Playback.shared.startRemoteControl()
            Playback.shared.observeInterruptions()
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .preferredColorScheme(.dark)
                // Starting the engine up front avoids the first tap paying for
                // it and arriving late.
                .task { Haptics.prepare() }
                // The Keychain's session (if any), then the Library synced.
                .task { await Account.shared.start(app: app) }
        }
    }
}
