import SwiftUI

/// Values measured off the web app rather than invented here. Where a comment
/// cites a number, it is davidfeed's own — see src/app/globals.css and the
/// component headers, which record the Figma measurements they were built from.
enum DF {
    // MARK: colour
    /// globals.css --background / --foreground
    static let ground = Color.black
    static let ink = Color.white
    /// The nav pill's fill: "#0E0E0E, lifted off pure black by eye so the pill
    /// reads as a surface over dark artwork instead of a hole in it."
    static let surface = Color(red: 0x0E / 255, green: 0x0E / 255, blue: 0x0E / 255)
    static let surfaceRaised = Color(red: 0x21 / 255, green: 0x21 / 255, blue: 0x21 / 255)
    static let inkDim = Color.white.opacity(0.62)

    // MARK: card geometry
    /// The web reserves "100dvh-138" for its own bottom nav plus the peek of the
    /// next card. Here the value cannot carry over: a Tab's content area already
    /// stops above the system tab bar, so subtracting 138 from it double-counts
    /// the nav and leaves a ~140pt slab of the next card showing. 48 is the peek
    /// alone, which is what the number has to mean once the nav is already gone.
    static let cardInsetBottom: CGFloat = 48
    static let cardGap: CGFloat = 12
    /// The gap between films. The film and the screen are fixed, so the tip of
    /// the next one is what is left: ~135pt on a 17 Pro.
    static let filmGap: CGFloat = 24
    /// "It has to clear the 53px corner radius to read as a card"
    static let cardRadius: CGFloat = 53

    // MARK: type
    /// The web app is Inter throughout. SF is the native equivalent and is what
    /// the system tab bar and sheets already use, so the app stays coherent
    /// rather than shipping a second grotesque for the sake of matching.
    static func title(_ size: CGFloat = 30) -> Font { .system(size: size, weight: .bold) }
    static func label(_ size: CGFloat = 15) -> Font { .system(size: size, weight: .semibold) }
    static func caption(_ size: CGFloat = 21) -> Font { .system(size: size, weight: .semibold) }
}

extension View {
    /// Legibility scrim under text laid over artwork. The web app leans on a
    /// bottom gradient for the verse label; this is the same idea as a modifier.
    func bottomScrim(_ height: CGFloat = 260) -> some View {
        overlay(alignment: .bottom) {
            LinearGradient(
                colors: [.clear, .black.opacity(0.55), .black.opacity(0.82)],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: height)
            .allowsHitTesting(false)
        }
    }
}
