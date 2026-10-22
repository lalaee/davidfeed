import SwiftUI
import UIKit

/// The tab bar's top edge catching the media above it.
///
/// Netflix's bar does this: a thin line along the capsule's top edge that
/// takes its colour from whatever is scrolling above, so the bar reads as a
/// glass rim reflecting the scene rather than a pill sitting on it. The system
/// bar's own rim is white and fixed. This adds the coloured one.
///
/// The bar is the system's, so the rim is drawn OVER it, not into it. That
/// needs the capsule's frame. UIKit gives the bar's frame publicly; the capsule
/// inside it is a private subview, so it is found by its class name as a
/// string (`Platter`), which calls nothing private -- the same public walk
/// LensTintSegmentedControl ships with. If no such view exists (iOS 18's flat
/// bar, or a future OS that renames it) the rim falls back to the bar's own
/// top edge, straight across.
struct TabBarPlatterProbe: UIViewRepresentable {
    struct Bar: Equatable {
        var frame: CGRect      // window coordinates
        var isCapsule: Bool
    }

    var onMeasure: (Bar?) -> Void

    func makeUIView(context: Context) -> ProbeView {
        let view = ProbeView()
        view.isUserInteractionEnabled = false
        view.onMeasure = onMeasure
        return view
    }

    func updateUIView(_ view: ProbeView, context: Context) { view.onMeasure = onMeasure }

    final class ProbeView: UIView {
        var onMeasure: ((Bar?) -> Void)?
        private var last: Bar?

        // The bar is laid out after the content that hosts this probe, so a
        // measurement taken in the same pass finds nothing. Two delayed reads
        // cover first appearance; layoutSubviews covers rotation, since the
        // probe resizes with the TabView it backs.
        override func didMoveToWindow() { super.didMoveToWindow(); schedule() }
        override func layoutSubviews() { super.layoutSubviews(); schedule() }

        private func schedule() {
            for delay in [0.05, 0.5] {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in self?.measure() }
            }
        }

        private func measure() {
            guard let window else { return }
            guard let bar = Self.find(in: window, where: { $0 is UITabBar }) else { return }
            let platter = Self.find(in: bar) { NSStringFromClass(type(of: $0)).contains("Platter") }
            let host = platter ?? bar
            let measured = Bar(frame: host.convert(host.bounds, to: nil), isCapsule: platter != nil)
            guard measured != last else { return }
            last = measured
            onMeasure?(measured)
        }

        private static func find(in view: UIView, where matches: (UIView) -> Bool) -> UIView? {
            if matches(view) { return view }
            for sub in view.subviews {
                if let hit = find(in: sub, where: matches) { return hit }
            }
            return nil
        }
    }
}

/// The colours the rim reflects: the bottom third of the card's artwork,
/// left to right, so the line carries the scene's colours in the order they
/// sit above it. Six samples; a 1.5pt line cannot show more.
///
/// The artwork is a frame of the card's own loop, which is what the reader
/// sees above the bar. Dark, moody frames would give a rim too dim to read as
/// light, so each sample keeps its hue and is lit: a reflection is the scene's
/// colour at the brightness of the light hitting the glass, not the scene's
/// own brightness. Grey scenes come out as a plain white specular.
enum Reflection {
    private static var cache: [Int: [Color]] = [:]
    static let samples = 6

    static func colours(for post: Post?) -> [Color] {
        guard let post else { return [] }
        if let hit = cache[post.id] { return hit }
        guard let image = ArtworkCache.image(post.artworkURL)?.cgImage else { return [] }
        let n = samples
        guard let ctx = CGContext(data: nil, width: n, height: 1, bitsPerComponent: 8, bytesPerRow: n * 4,
                                  space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return [] }
        ctx.interpolationQuality = .high
        // Core Graphics draws with a bottom-left origin: the image scaled to
        // three rows with its bottom at y=0 puts its bottom third in the one
        // row the context has.
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: CGFloat(n), height: 3))
        guard let data = ctx.data else { return [] }
        let px = data.bindMemory(to: UInt8.self, capacity: n * 4)
        var out: [Color] = []
        for i in 0..<n {
            let r = CGFloat(px[i * 4]) / 255, g = CGFloat(px[i * 4 + 1]) / 255, b = CGFloat(px[i * 4 + 2]) / 255
            var h: CGFloat = 0, s: CGFloat = 0, v: CGFloat = 0, a: CGFloat = 0
            UIColor(red: r, green: g, blue: b, alpha: 1).getHue(&h, saturation: &s, brightness: &v, alpha: &a)
            out.append(Color(UIColor(hue: h, saturation: min(s * 1.25, 1), brightness: max(v, 0.92), alpha: 1)))
        }
        cache[post.id] = out
        return out
    }
}

/// A point wide: at 1.5 it read as a drawn line rather than an edge catching light.
/// The rim itself, drawn in window coordinates over the whole screen so the
/// measured frame can be used as-is. Only the top of the shape is kept: a
/// reflection of a scene above lands on the upper edge and dies out where the
/// capsule's ends curve away from it.
struct TabBarReflector: View {
    let bar: TabBarPlatterProbe.Bar?
    /// The card above the bar: its still is the reflection until the loop's
    /// frames arrive, and for the few cards that have no loop.
    let post: Post?
    let visible: Bool

    /// Read here and not in RootView, so the 24Hz stream of live colours
    /// re-renders the rim alone and not the TabView around it.
    private var colours: [Color] {
        let live = ReflectionSampler.shared.colours
        return live.isEmpty ? Reflection.colours(for: post) : live
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.clear
            if let bar, !colours.isEmpty {
                rim(capsule: bar.isCapsule)
                    .frame(width: bar.frame.width, height: bar.frame.height)
                    .offset(x: bar.frame.minX, y: bar.frame.minY)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .opacity(visible ? 1 : 0)
        // Short: the live colours arrive at 24Hz already eased, and this only
        // bridges the ticks. A longer one dragged the light behind the loop.
        .animation(.easeInOut(duration: 0.12), value: colours)
        .animation(.easeInOut(duration: 0.25), value: visible)
    }

    /// The line, and under it a soft band of the same light: a reflection
    /// on glass is a bright edge with a glow that falls off into the body,
    /// not a stroke. The band is the same stroke five wide, blurred and at
    /// less than half strength, so the 1pt edge stays crisp on top of it.
    @ViewBuilder
    private func rim(capsule: Bool) -> some View {
        let paint = LinearGradient(colors: colours, startPoint: .leading, endPoint: .trailing)
        ZStack {
            edge(capsule: capsule, paint: paint, width: 6).blur(radius: 3.5).opacity(0.6)
            edge(capsule: capsule, paint: paint, width: 1)
        }
        // A blur spreads both ways; clipped to the bar's own outline so the
        // glow falls into the glass and never past its edge.
        .clipShape(capsule ? AnyShape(Capsule()) : AnyShape(Rectangle()))
        .mask {
            LinearGradient(stops: [
                .init(color: .white, location: 0),
                .init(color: .white, location: 0.1),
                .init(color: .clear, location: 0.42),
            ], startPoint: .top, endPoint: .bottom)
        }
        .opacity(0.9)
    }

    @ViewBuilder
    private func edge(capsule: Bool, paint: LinearGradient, width: CGFloat) -> some View {
        if capsule {
            Capsule().strokeBorder(paint, lineWidth: width)
        } else {
            Rectangle().strokeBorder(paint, lineWidth: width)
        }
    }
}
