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

/// The rim, as UIKit vibrancy.
///
/// Netflix's bar reads its rim off the backdrop: the line is a lighter version
/// of whatever is behind and above it at that pixel, so it turns blue under a
/// blue title and shifts as the content moves. That is what a vibrancy effect
/// does. A 1pt stroke along the capsule's top arc is drawn inside a
/// `UIVibrancyEffect`, which renders it as the blurred backdrop under the line,
/// lifted. Live, per pixel, no sampling code -- and it follows the video, not
/// just the card. The effect view is masked to the stroke itself, so nothing
/// else is frosted; the blur radius still reaches the content above the bar,
/// which is where the colour comes from.
///
/// Drawn in window coordinates over the whole screen so the measured frame can
/// be used as-is. Only the top of the shape is kept: a reflection of a scene
/// above lands on the upper edge and dies out where the capsule's ends curve
/// away from it.
struct TabBarReflector: View {
    let bar: TabBarPlatterProbe.Bar?
    let visible: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.clear
            if let bar {
                VibrancyHairline(size: bar.frame.size, isCapsule: bar.isCapsule)
                    .frame(width: bar.frame.width, height: bar.frame.height)
                    .offset(x: bar.frame.minX, y: bar.frame.minY)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .opacity(visible ? 1 : 0)
        .animation(.easeInOut(duration: 0.25), value: visible)
    }
}

struct VibrancyHairline: UIViewRepresentable {
    let size: CGSize
    let isCapsule: Bool

    func makeUIView(context: Context) -> HairlineView { HairlineView() }
    func updateUIView(_ view: HairlineView, context: Context) { view.configure(size: size, isCapsule: isCapsule) }

    final class HairlineView: UIView {
        // Dark material: the bar is over dark cards, and the vibrancy's lift is
        // measured against this. `.fill` keeps the backdrop's hue in the line
        // (mauve over a red card, green over a field); `.label` was tried and
        // clips to pure white on every card, which is a line, not a reflection.
        private let blurEffect = UIBlurEffect(style: .systemThinMaterialDark)
        private lazy var blur = UIVisualEffectView(effect: blurEffect)
        private lazy var vibrancy = UIVisualEffectView(effect: UIVibrancyEffect(blurEffect: blurEffect, style: .fill))
        private let stroke = CAShapeLayer()     // what the vibrancy lifts
        private let window_ = CAShapeLayer()    // where the effect shows at all
        private let floor = CAShapeLayer()      // a plain highlight under it
        private let maskHost = UIView()

        override init(frame: CGRect) {
            super.init(frame: frame)
            isUserInteractionEnabled = false
            // Netflix's rim keeps a grey floor even over black. This is that:
            // a plain white line at 30%, outside the effect, so the rim is
            // there whatever the backdrop is doing and the vibrancy colours it.
            floor.fillColor = nil
            floor.strokeColor = UIColor.white.withAlphaComponent(0.3).cgColor
            floor.lineWidth = 1
            floor.lineCap = .round
            layer.addSublayer(floor)
            addSubview(blur)
            blur.contentView.addSubview(vibrancy)
            for shape in [stroke, window_] {
                shape.fillColor = nil
                shape.strokeColor = UIColor.white.cgColor
                shape.lineWidth = 1
                shape.lineCap = .round
            }
            vibrancy.contentView.layer.addSublayer(stroke)
            // One flat mask: a view carrying a single shape layer. The first
            // version nested a gradient mask inside the mask's shape layer to
            // fade the sides out; that renders in the simulator and is the
            // prime suspect for drawing nothing on the phone. The fade is now
            // geometry -- the path stops 25 degrees above the ends.
            maskHost.layer.addSublayer(window_)
            blur.mask = maskHost
        }

        required init?(coder: NSCoder) { fatalError("not used") }

        func configure(size: CGSize, isCapsule: Bool) {
            let bounds = CGRect(origin: .zero, size: size)
            // A 1pt stroke centred half a point in, so it sits inside the edge
            // the way the system's own rim does.
            let inset = bounds.insetBy(dx: 0.5, dy: 0.5)
            let path = UIBezierPath()
            if isCapsule {
                // The top arc only: up the left end from 25 degrees above its
                // middle, across the top, down the right end to the same.
                let r = inset.height / 2, theta = 25 * CGFloat.pi / 180
                path.addArc(withCenter: CGPoint(x: inset.minX + r, y: inset.minY + r), radius: r,
                            startAngle: .pi + theta, endAngle: 3 * .pi / 2, clockwise: true)
                path.addLine(to: CGPoint(x: inset.maxX - r, y: inset.minY))
                path.addArc(withCenter: CGPoint(x: inset.maxX - r, y: inset.minY + r), radius: r,
                            startAngle: 3 * .pi / 2, endAngle: 2 * .pi - theta, clockwise: true)
            } else {
                // The flat bar (iOS 18): its top edge, straight across.
                path.move(to: CGPoint(x: inset.minX, y: inset.minY))
                path.addLine(to: CGPoint(x: inset.maxX, y: inset.minY))
            }
            for view in [blur, vibrancy, maskHost] { view.frame = bounds }
            for shape in [stroke, window_, floor] { shape.frame = bounds; shape.path = path.cgPath }
        }
    }
}
