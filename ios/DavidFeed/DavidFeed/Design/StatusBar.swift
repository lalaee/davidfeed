import UIKit

/// The status bar's colour, set from the content behind it.
///
/// SwiftUI only offers the colour scheme, and the app is dark throughout, so
/// the clock was always white -- and all but vanished over the films that
/// open on paper. With view-controller-based appearance off
/// (UIViewControllerBasedStatusBarAppearance = NO), the application sets the
/// style itself. The setter is deprecated in favour of view controllers, but
/// SwiftUI's hosting controller does not expose that hook.
enum StatusBar {
    @MainActor
    static func set(dark: Bool) {
        let style: UIStatusBarStyle = dark ? .darkContent : .lightContent
        if UIApplication.shared.statusBarStyle != style {
            UIApplication.shared.setStatusBarStyle(style, animated: true)
        }
    }
}

/// App Store screenshots, taken from the simulator with the app launched with
/// `-AppStoreScreenshots`. The status bar is hidden and the cards' top corners
/// are square, so a capture is the film flush to the top with no clock. The
/// Dynamic Island is drawn into simulator captures regardless; the capture
/// script crops its band. Never set in normal use.
enum ScreenshotMode {
    static let on = ProcessInfo.processInfo.arguments.contains("-AppStoreScreenshots")

    @MainActor
    static func apply() {
        guard on else { return }
        UIApplication.shared.isStatusBarHidden = true
    }

    /// The Library the screenshots show: six saved films and two highlighted
    /// verses of Psalm 46 (where the reader opens), in the account row's shape (AppState.apply).
    static let sampleLibrary: [String: Any] = [
        "saved_posts": ["2301": true, "2302": true, "302": true, "4501": true, "41001": true, "303": true],
        "saved_verses": [String: Any](),
        "highlights": ["Psalms 46": ["1": "#FFFE54", "5": "#FF548D"]],
    ]
}

