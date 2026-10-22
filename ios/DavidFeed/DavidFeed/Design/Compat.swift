import SwiftUI

/// The iOS 26 surface the app is built on, with what stands in for it on 18.
///
/// The deployment target is iOS 18 so the app reaches phones that have not
/// moved to 26 -- Apple went straight from 18 to 26, and 26 dropped the XS and
/// XR outright. Everything 26-only in the app passes through here, so the
/// compiler can prove the gating is complete: with an 18 target, any 26 API
/// used outside an availability check is a build error, not a crash on an
/// older phone.
extension View {
    /// Liquid Glass on 26. Beneath it, the design's own surface -- the web's
    /// pre-glass pill was "flat, fully opaque #0E0E0E" -- eased just enough
    /// for the artwork to ghost through the way glass lets it. Deliberately
    /// not a system Material: that would frost white on a phone in light mode.
    @ViewBuilder
    func glassOrSurface<S: Shape>(interactive: Bool = false, in shape: S) -> some View {
        if #available(iOS 26, *) {
            self.glassEffect(interactive ? .regular.interactive() : .regular, in: shape)
        } else {
            self.background(DF.surface.opacity(0.82), in: shape)
        }
    }

    /// The system's soft scroll edge under the toolbar on 26. On 18 the
    /// navigation bar draws its own material as content passes beneath it,
    /// so there is nothing to add.
    @ViewBuilder
    func softTopEdge() -> some View {
        if #available(iOS 26, *) { self.scrollEdgeEffectStyle(.soft, for: .top) } else { self }
    }

    /// 26's tab bar can minimise on scroll and this app declines it. 18's
    /// cannot, so there is nothing to decline.
    @ViewBuilder
    func tabBarNeverMinimizes() -> some View {
        if #available(iOS 26, *) { self.tabBarMinimizeBehavior(.never) } else { self }
    }
}
