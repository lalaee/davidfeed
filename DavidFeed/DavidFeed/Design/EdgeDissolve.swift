import SwiftUI

/// Content going out of focus and out of light as it passes under the chrome.
///
/// Its history, because each step ruled something out. The native
/// `.scrollEdgeEffectStyle(.soft)` rendered on the 26.0 simulator and not on
/// the phone -- a known Apple bug at the bottom edge (FB18350439; the DTS
/// workaround in that thread is `.background(.regularMaterial)`). A masked
/// Material band rendered and was "a basic blur". A masked glass band was the
/// same blur at a refraction pass per layer. A glass shelf was a container.
///
/// What every masked band shares is the CSSWG's own description of the trick:
/// it "blends between unblurred and uniformly-blurred output". The radius
/// never changes; only how much of one blur shows through. This does not do
/// that. It is Core Animation's real `variableBlur` -- the effect Apple's own
/// bars use, in which the radius itself ramps continuously across the band --
/// reached the way Tim Oliver's BlurUIKit reaches it (MIT, vendored under
/// VariableBlur/): a stock UIVisualEffectView is asked for the class of the
/// filter on its backdrop, that class is asked for a `variableBlur`, and it is
/// given a gradient mask. Nothing is linked; every step fails soft, and the
/// worst case is a plain uniform blur rather than nothing.
///
/// The bottom third is fully dissolved -- that is the strip under the tab bar
/// -- and the ramp lives in the two thirds above it, so a card loses focus
/// progressively before the bar rather than at it. A black shade rides with it
/// at the strength the caller sets: the web's "shade is the edge", the same
/// black the bar is painted in, so it reads as the bar's shadow. The feed keeps
/// it light to leave the ambience under the glass.
///
/// Over both, film grain that thickens toward the edge -- a still hash of
/// position emitted as signed specks of light and shade, so it is texture the
/// content moves through rather than noise laid on top of it. That, and the radius genuinely ramping, is
/// what separates this from a progressive blur.
///
/// Fixed to the container, so content scrolls through it. Ignores touches.
struct EdgeDissolve: View {
    /// How far the band reaches up from the bottom edge.
    let height: CGFloat
    /// How dark the shade is at the very edge.
    var shade: Double = 0.85
    /// How much grain: the peak light a speck adds or takes, twice over.
    /// 0.3 is a whisper of texture; 1 is television static. Off by default --
    /// the blur is being judged on its own -- and at 0 the layer is not built.
    var grain: Double = 0

    var body: some View {
        ZStack {
            VariableBlur(direction: .up)
                .maximumBlurRadius(24)
                .blurStartingInset(.relative(fraction: 0.35))
                .dimmingTintColor(.black)
                .dimmingAlpha(.constant(alpha: shade))
                .dimmingOvershoot(nil)
            if grain > 0 {
            Rectangle()
                .fill(.white)
                .colorEffect(ShaderLibrary.grain(.float(grain)))
                .mask {
                    LinearGradient(
                        stops: [
                            .init(color: .clear, location: 0),
                            .init(color: .black, location: 0.7),
                            .init(color: .black, location: 1),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .colorScheme(.dark)
        .allowsHitTesting(false)
    }
}
