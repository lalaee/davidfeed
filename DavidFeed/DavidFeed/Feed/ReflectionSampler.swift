import Accelerate
import AVFoundation
import Observation
import SwiftUI

/// The reflection, read off the loop as it plays.
///
/// The rim used to take its colours from the card's still artwork -- one
/// frame, so the light on the bar stood still while the parallax above it
/// moved. This reads the playing frames instead: a video output on the active
/// loop's item, a frame pulled on a display link, the bottom quarter of it --
/// the part nearest the bar -- scaled to sixteen colours left to right. As a
/// bright patch drifts across the bottom of the loop, it drifts along the rim.
///
/// One instance, one loop at a time: the active card attaches its player,
/// the card scrolling away detaches it, and between the two the reflector
/// falls back to the next card's still until frames arrive.
@Observable
@MainActor
final class ReflectionSampler {
    static let shared = ReflectionSampler()
    static let samples = 24

    /// Left to right across the bar. Empty when nothing is attached.
    private(set) var colours: [Color] = []

    private var player: AVQueuePlayer?
    private var itemObservation: NSKeyValueObservation?
    private var attachedItem: AVPlayerItem?
    private let output = AVPlayerItemVideoOutput(pixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    ])
    private var link: CADisplayLink?
    private let target = LinkTarget()
    /// The colours as floats, eased frame to frame so the rim breathes
    /// rather than flickers.
    private var smoothed: [SIMD3<Float>] = []
    /// The strip's darkest and brightest bin, eased, so the stretch below
    /// does not jump when a highlight enters or leaves the strip.
    private var range: SIMD2<Float>?
    /// Motion. The strip is read at four times the rim's resolution; where
    /// a fine bin's luminance differs from the last frame's, something moved
    /// there, and that lights the rim where the loop is moving. In absolute
    /// terms: a still loop gives nothing, a fast one a lot. The first version
    /// scaled each frame's motion to its own running peak, which turned a
    /// still loop's codec noise into a full-strength flicker -- the glint
    /// looked random because, then, it was.
    private static let fine = 4
    private static let noiseFloor: Float = 0.008   // codec noise, in luminance
    private static let fullGlint: Float = 0.04     // a 4% change per frame = full
    private var previousFine: [Float] = []
    private var motion: [Float] = []

    private init() {}

    func attach(_ player: AVQueuePlayer) {
        guard self.player !== player else { return }
        detachCurrent()
        self.player = player
        // The looper plays copies of its template item back to back, and an
        // output belongs to one item at a time, so it follows the current one.
        itemObservation = player.observe(\.currentItem, options: [.initial, .new]) { [weak self] player, _ in
            let item = player.currentItem
            Task { @MainActor [weak self] in self?.follow(item) }
        }
        target.onTick = { [weak self] link in self?.tick(link) }
        let link = CADisplayLink(target: target, selector: #selector(LinkTarget.fire(_:)))
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 15, maximum: 30, preferred: 24)
        link.add(to: .main, forMode: .common)
        self.link = link
    }

    func detach(_ player: AVQueuePlayer) {
        guard self.player === player else { return }
        detachCurrent()
    }

    private func detachCurrent() {
        link?.invalidate()
        link = nil
        itemObservation?.invalidate()
        itemObservation = nil
        follow(nil)
        player = nil
        smoothed = []
        colours = []
        previousFine = []
        motion = []
        range = nil
    }

    private func follow(_ item: AVPlayerItem?) {
        guard item !== attachedItem else { return }
        attachedItem?.remove(output)
        attachedItem = item
        item?.add(output)
    }

    private func tick(_ link: CADisplayLink) {
        let time = output.itemTime(forHostTime: link.targetTimestamp)
        guard output.hasNewPixelBuffer(forItemTime: time),
              let buffer = output.copyPixelBuffer(forItemTime: time, itemTimeForDisplay: nil),
              let fineStrip = Self.bottomStrip(of: buffer, samples: Self.samples * Self.fine)
        else { return }
        // Colour: the fine bins pooled to the rim's. Motion: the largest
        // frame-to-frame change among each rim bin's fine bins.
        let fineLum = fineStrip.map { $0.x * 0.2126 + $0.y * 0.7152 + $0.z * 0.0722 }
        var strip: [SIMD3<Float>] = []
        var energy: [Float] = []
        for i in 0..<Self.samples {
            let slice = i * Self.fine ..< (i + 1) * Self.fine
            strip.append(fineStrip[slice].reduce(SIMD3<Float>(repeating: 0), +) / Float(Self.fine))
            var e: Float = 0
            if previousFine.count == fineLum.count { for k in slice { e += abs(fineLum[k] - previousFine[k]) } }
            energy.append(max(e / Float(Self.fine) - Self.noiseFloor, 0) / Self.fullGlint)
        }
        previousFine = fineLum
        let glint = energy.map { min($0, 1) }
        // Rises with the motion, decays behind it, so a passing edge leaves a
        // short trail rather than a flicker.
        if motion.count != glint.count { motion = glint } else {
            for i in glint.indices { motion[i] += (glint[i] - motion[i]) * (glint[i] > motion[i] ? 0.5 : 0.15) }
        }
        // Stretch: the strip's own darkest and brightest bins become the
        // rim's dark and bright ends every frame, so the pattern along the
        // edge always uses the whole range and its movement is what shows.
        // A quarter of the frame averaged into sixteen bins barely changed
        // as the parallax drifted; this is what makes the drift visible.
        let lums = strip.map { $0.x * 0.2126 + $0.y * 0.7152 + $0.z * 0.0722 }
        let frame = SIMD2(lums.min() ?? 0, lums.max() ?? 1)
        if let r = range { range = r + (frame - r) * 0.2 } else { range = frame }
        let r = range!
        // Brightness: the stretched scene, and on top of it the glint --
        // up to +0.55 where the loop is moving, travelling with it. The
        // scene sits lower than it could so the glint has room to stand out.
        let lit = zip(zip(strip, lums), motion).map { pair, m in
            let (rgb, lum) = pair
            // Stretched over the strip's own range, but never over less than
            // a quarter of the scale: a flat strip's noise is not a pattern.
            let scene: Float = 0.3 + 0.45 * (lum - r.x) / max(r.y - r.x, 0.25)
            return Self.lit(rgb, stretched: scene + 0.55 * m)
        }
        if smoothed.count != lit.count {
            smoothed = lit
        } else {
            for i in lit.indices { smoothed[i] += (lit[i] - smoothed[i]) * 0.4 }
        }
        colours = smoothed.map { Color(red: Double($0.x), green: Double($0.y), blue: Double($0.z)) }
    }

    /// The bottom quarter of the frame, scaled to `samples` x 1: one colour per
    /// slice of the width, in order.
    nonisolated private static func bottomStrip(of buffer: CVPixelBuffer, samples n: Int) -> [SIMD3<Float>]? {
        CVPixelBufferLockBaseAddress(buffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddress(buffer) else { return nil }
        let width = CVPixelBufferGetWidth(buffer), height = CVPixelBufferGetHeight(buffer)
        let rowBytes = CVPixelBufferGetBytesPerRow(buffer)
        // The band from 72% to 88% down the frame. The bottom 12% is what
        // sits nearest the bar, but on screen it is under the darkest part
        // of the card's scrim -- the reader cannot see it, so a rim that
        // followed it looked like it followed nothing. This band is the last
        // of the picture the reader actually sees above the bar.
        let rows = max(1, Int(Float(height) * 0.16))
        let firstRow = Int(Float(height) * 0.72)
        var source = vImage_Buffer(data: base + firstRow * rowBytes,
                                   height: vImagePixelCount(rows), width: vImagePixelCount(width), rowBytes: rowBytes)
        var pixels = [UInt8](repeating: 0, count: n * 4)
        return pixels.withUnsafeMutableBytes { raw -> [SIMD3<Float>]? in
            var destination = vImage_Buffer(data: raw.baseAddress, height: 1, width: vImagePixelCount(n), rowBytes: n * 4)
            guard vImageScale_ARGB8888(&source, &destination, nil, vImage_Flags(kvImageNoFlags)) == kvImageNoError else { return nil }
            let p = raw.bindMemory(to: UInt8.self)
            // BGRA in memory.
            return (0..<n).map { i in SIMD3(Float(p[i * 4 + 2]), Float(p[i * 4 + 1]), Float(p[i * 4])) / 255 }
        }
    }

    /// The scene's colour at the brightness of light on glass: hue kept,
    /// saturation pushed, brightness set by the caller's stretch.
    nonisolated private static func lit(_ rgb: SIMD3<Float>, stretched brightness: Float) -> SIMD3<Float> {
        let maxC = rgb.max(), minC = rgb.min(), delta = maxC - minC
        let s = maxC > 0 ? delta / maxC : 0
        var h: Float = 0
        if delta > 0 {
            if maxC == rgb.x { h = ((rgb.y - rgb.z) / delta).truncatingRemainder(dividingBy: 6) }
            else if maxC == rgb.y { h = (rgb.z - rgb.x) / delta + 2 }
            else { h = (rgb.x - rgb.y) / delta + 4 }
            if h < 0 { h += 6 }
        }
        let s2 = min(s * 1.3, 1), v2 = min(max(brightness, 0), 1)
        let c = v2 * s2, x = c * (1 - abs(h.truncatingRemainder(dividingBy: 2) - 1)), m = v2 - c
        let base: SIMD3<Float>
        switch Int(h) {
        case 0: base = SIMD3(c, x, 0)
        case 1: base = SIMD3(x, c, 0)
        case 2: base = SIMD3(0, c, x)
        case 3: base = SIMD3(0, x, c)
        case 4: base = SIMD3(x, 0, c)
        default: base = SIMD3(c, 0, x)
        }
        return base + SIMD3(repeating: m)
    }

    /// CADisplayLink wants an Objective-C target; this is it.
    private final class LinkTarget: NSObject {
        var onTick: ((CADisplayLink) -> Void)?
        @objc func fire(_ link: CADisplayLink) { onTick?(link) }
    }
}
