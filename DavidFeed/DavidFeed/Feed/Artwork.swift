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

    static func image(_ url: URL?) -> UIImage? {
        guard let url else { return nil }
        let key = url.path as NSString
        if let hit = cache.object(forKey: key) { return hit }
        guard let image = UIImage(contentsOfFile: url.path) else { return nil }
        cache.setObject(image, forKey: key)
        return image
    }
}
