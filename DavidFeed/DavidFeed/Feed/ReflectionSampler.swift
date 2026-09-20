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
    static let samples = 16

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
              let strip = Self.bottomStrip(of: buffer, samples: Self.samples)
        else { return }
        let lit = strip.map(Self.lit)
        if smoothed.count != lit.count {
            smoothed = lit
        } else {
            for i in lit.indices { smoothed[i] += (lit[i] - smoothed[i]) * 0.45 }
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
        let rows = max(1, height / 4)
        var source = vImage_Buffer(data: base + (height - rows) * rowBytes,
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
    /// saturation pushed, and brightness lifted onto a floor -- but not to a
    /// constant, so a bright patch moving through the strip still reads
    /// brighter than the dark around it.
    nonisolated private static func lit(_ rgb: SIMD3<Float>) -> SIMD3<Float> {
        let maxC = rgb.max(), minC = rgb.min(), delta = maxC - minC
        let v = maxC
        let s = maxC > 0 ? delta / maxC : 0
        var h: Float = 0
        if delta > 0 {
            if maxC == rgb.x { h = ((rgb.y - rgb.z) / delta).truncatingRemainder(dividingBy: 6) }
            else if maxC == rgb.y { h = (rgb.z - rgb.x) / delta + 2 }
            else { h = (rgb.x - rgb.y) / delta + 4 }
            if h < 0 { h += 6 }
        }
        let s2 = min(s * 1.25, 1), v2 = 0.55 + 0.45 * v
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
