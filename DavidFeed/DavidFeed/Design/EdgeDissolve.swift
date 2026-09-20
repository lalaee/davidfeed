import SwiftUI

/// A card, or a verse, going out of focus and out of light as it passes under
/// the chrome -- the desktop web's `.desk-bar-edge`, built its way.
///
/// iOS 26 has a native version, `.scrollEdgeEffectStyle(.soft)`, and that was
/// the first attempt. It rendered on the iOS 26.0 simulator and did not render
/// on an iPhone running 26.6.1 -- at the bottom edge, in the feed and the
/// reader alike -- and an Xcode 26.0.1 install has no 26.6 simulator to reason
/// against. Rather than special-case an OS version, this is the web's own
/// construction, which depends on nothing newer than Material (iOS 15) and a
/// gradient mask, and so renders the same on every modern iOS.
///
/// The web's note is the spec. Sibling backdrop layers, each masked to a band
/// that overlaps its neighbours, so "each layer's backdrop already contains the
/// output of the ones beneath it" and the blur COMPOUNDS toward the edge rather
/// than crossfading. Material has no radius to double, so the compounding does
/// the doubling: three stacked ultra-thin materials, each one's mask beginning
/// deeper into the band than the last, so the edge is blurred three times over
/// and the band's top once, faintly.
///
/// And "THE SHADE IS THE EDGE": a blur stack alone still terminates at a line --
/// a line of blurred pixels now, but a line. The scrim is what dissolves it,
/// dark at the screen's edge and gone by the band's top on a gentle ease. On
/// the reader that shade is the ground's own black. On the feed it is kept
/// light, so the ambience still reaches the tab bar's glass.
///
/// Fixed to the container rather than the content, the way the web's band is
/// fixed to its bar: content scrolls THROUGH it. Dark-schemed explicitly, so a
/// phone in light mode does not frost the reel white. Ignores touches, so it
/// can sit over a scroll view without taking anything from it.
struct EdgeDissolve: View {
    /// How far the band reaches up from the bottom edge.
    let height: CGFloat
    /// How dark the shade is at the very edge. 1 is the web's "pure black at
    /// the rule"; the feed uses less, to leave the ambience under the glass.
    var shade: Double = 0.95

    var body: some View {
        ZStack {
            ForEach([0.0, 0.35, 0.65], id: \.self) { start in
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .mask {
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: start),
                                .init(color: .black, location: min(1, start + 0.45)),
                                .init(color: .black, location: 1),
                            ],
                            startPoint: .top, endPoint: .bottom
                        )
                    }
            }
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0),
                    .init(color: .black.opacity(shade * 0.35), location: 0.55),
                    .init(color: .black.opacity(shade), location: 1),
                ],
                startPoint: .top, endPoint: .bottom
            )
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .colorScheme(.dark)
        .allowsHitTesting(false)
    }
}
