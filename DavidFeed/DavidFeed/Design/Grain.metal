#include <metal_stdlib>
#include <SwiftUI/SwiftUI.h>
using namespace metal;

// Film grain for the edge dissolve: a hash of the pixel's position with no
// time term, so it is texture rather than noise -- the grain is STILL while the
// content moves through it. The hash is Inferno's whiteRandom (Paul Hudson,
// MIT) with time removed.
//
// Emitted as SIGNED grain in premultiplied alpha: bright specks add a little
// light, dark specks take a little, under plain compositing. No blend mode is
// involved, which matters because the layer beneath is UIKit's backdrop and a
// SwiftUI blend mode did not composite against it -- the noise drew flat at
// full strength and greyed the band out.
[[ stitchable ]] half4 grain(float2 position, half4 color, float strength) {
    float n = fract(sin(dot(position, float2(12.9898, 78.233))) * 43758.5453);
    half v = half(n - 0.5) * half(strength);
    half a = abs(v) * color.a;
    half3 rgb = v > 0.0h ? half3(1.0h) : half3(0.0h);
    return half4(rgb * a, a);
}
