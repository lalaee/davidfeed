import SwiftUI

/// A glass shelf across the bottom of the reel, holding the tab bar.
///
/// The dissolve under the bar went through three forms: a native scroll-edge
/// effect that did not render on the phone, then a masked backdrop band --
/// Material, then Liquid Glass. The glass band rendered on 26.6.1 and still
/// read as "a basic blur", and the reason is worth keeping: what makes glass
/// look like glass is a SHAPE. The AirDrop sheet has a rim, and the rim is
/// where the lensing and the highlight live; colour behind it reads as light
/// through a surface. A dissolve band has no edge by design -- its top is
/// masked to nothing -- and rimless glass over dark artwork is a blur by
/// another name.
///
/// So this is a shape: a sheet-cornered panel rising from the screen's bottom
/// edge with its rim in view, and the reel dissolves INTO it. The next card's
/// peek shows through the glass; an outgoing card passes under it on a swipe.
/// The tab bar sits on it, capsule on sheet, which is how iOS 26 composes its
/// own bars over a sheet. Its rim rests 8pt below the resting card's bottom,
/// so the card floats as its own object above the surface rather than
/// touching it.
///
/// Unmasked, deliberately. The same .glassEffect the tab bar and the pager
/// draw, so it renders where they do. Ignores touches.
struct GlassShelf: View {
    /// From the screen's bottom edge to the rim.
    let height: CGFloat
    /// Sheet corners. iOS 26 sheets round theirs generously; 34 sits between
    /// the cards' radius and the display's own.
    var cornerRadius: CGFloat = 34

    var body: some View {
        Color.clear
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .glassEffect(
                .regular,
                in: .rect(topLeadingRadius: cornerRadius, topTrailingRadius: cornerRadius,
                          style: .continuous)
            )
            .colorScheme(.dark)
            .allowsHitTesting(false)
    }
}
