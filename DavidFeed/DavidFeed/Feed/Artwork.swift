import SwiftUI

/// Decoded card artwork, kept.
///
/// `UIImage(contentsOfFile:)` decodes the JPEG every single time it is called,
/// and it was being called straight from FeedCardView's body — which SwiftUI
/// re-evaluates whenever anything it reads changes. While a card was playing
/// that was roughly twenty times a second, so the card re-decoded a
/// 834x1112 photograph on every caption tick. That is the scrolling stutter.
enum ArtworkCache {
    private static let cache: NSCache<NSString, UIImage> = {
        let c = NSCache<NSString, UIImage>()
        // A decoded 834x1112 card is roughly 3.7MB, and the feed only ever has
        // a card and its neighbours on screen. Six keeps scrolling free of
        // re-decodes without holding 40MB of images for a 3-card window.
        c.countLimit = 6
        return c
    }()

    private static var lightBottoms: [String: Bool] = [:]

    /// Whether the bottom tenth of the picture is light: the band a card's
    /// label sits on. Measured once per picture by scaling that band to one
    /// pixel.
    static func isLightAtBottom(_ url: URL?) -> Bool {
        guard let url else { return false }
        if let hit = lightBottoms[url.path] { return hit }
        guard let cg = image(url)?.cgImage,
              let band = cg.cropping(to: CGRect(x: 0, y: Int(Double(cg.height) * 0.9),
                                                width: cg.width, height: max(1, cg.height / 10))),
              let ctx = CGContext(data: nil, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4,
                                  space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return false }
        ctx.interpolationQuality = .medium
        ctx.draw(band, in: CGRect(x: 0, y: 0, width: 1, height: 1))
        let px = ctx.data!.bindMemory(to: UInt8.self, capacity: 4)
        let lum = 0.2126 * Double(px[0]) + 0.7152 * Double(px[1]) + 0.0722 * Double(px[2])
        let light = lum > 150
        lightBottoms[url.path] = light
        return light
    }

    static func image(_ url: URL?) -> UIImage? {
        guard let url else { return nil }
        let key = url.path as NSString
        if let hit = cache.object(forKey: key) { return hit }
        guard let image = UIImage(contentsOfFile: url.path) else { return nil }
        cache.setObject(image, forKey: key)
        return image
    }
}
