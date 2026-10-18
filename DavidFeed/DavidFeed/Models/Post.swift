import Foundation

/// One caption line, absolute-timed against its own recording.
struct Subtitle: Codable, Identifiable, Hashable {
    let id: Int
    let startTime: Double
    let endTime: Double
    let text: String

    func contains(_ t: Double) -> Bool { t >= startTime && t < endTime }
}

/// A feed card. Mirrors `Post` in davidfeed's src/data/posts.ts — the JSON is
/// exported from that source rather than retyped, so the two stay in step.
struct Post: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let backgroundImage: String
    let videoSrc: String?
    let posterVideoSrc: String?
    let audioSrc: String?
    let subtitles: [Subtitle]?
    let effect: String?
    /// Seconds of silence at the head of the narration, measured off the file.
    /// The card seeks here on entry and loops back here.
    let startAt: Double?
    /// The film's height over its width, measured off the file by the import,
    /// so the card can be exactly the film's shape.
    let aspect: Double?

    /// The web app stores absolute web paths ("/assets/shorts/x.mp3"); the app
    /// bundle is flat, so only the filename carries over.
    private func bundled(_ path: String?, ext: String) -> URL? {
        guard let path, let name = path.split(separator: "/").last else { return nil }
        // Whatever the web's file is called, the bundle may hold it re-encoded
        // under another extension (mp3 narration ships as m4a), so the stem is
        // the name with ANY extension removed.
        let stem = (String(name) as NSString).deletingPathExtension
        return Bundle.main.url(forResource: stem, withExtension: ext)
    }

    var artworkURL: URL? {
        bundled(backgroundImage, ext: "jpg") ?? bundled(backgroundImage, ext: "png")
    }
    /// Prefer the parallax loop; fall back to the poster loop, then to nothing
    /// (the still artwork carries the card on its own).
    var loopURL: URL? {
        bundled(videoSrc, ext: "mp4") ?? bundled(posterVideoSrc, ext: "mp4")
    }
    /// AAC in the bundle (64k mono; spoken word), the web's mp3 as the fallback.
    var narrationURL: URL? { bundled(audioSrc, ext: "m4a") ?? bundled(audioSrc, ext: "mp3") }

    /// The clip a share hands over — NOT the card's parallax loop.
    ///
    /// A card is not a video: it is a silent loop, a separate recording, and
    /// captions drawn on top, three things assembled live. So the web renders
    /// one self-contained file per card ahead of time (build-share-videos.py):
    /// 1080x1920, the Dafod.app mark and tagline at the top, the reference at
    /// the bottom, the captions burned in and the narration muxed under it.
    /// That is what lands in an Instagram Story or a WhatsApp status, and
    /// sharing the 2.5s silent 3:4 loop instead sent none of it.
    ///
    /// Bundled under the name shareVideo.ts hands the sheet — the title
    /// lowercased with runs of non-alphanumerics collapsed to a dash, plus
    /// "-dafod" — so the recipient sees "psalm-23-1-3-dafod.mp4", not an id.
    var shareURL: URL? {
        let slug = title.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-",
                                  options: .regularExpression)
        return Bundle.main.url(forResource: "\(slug)-dafod", withExtension: "mp4")
    }

    /// The lock screen's animated artwork: the card's own parallax loop,
    /// centre-cropped to 3:4 and rendered alongside a matching first frame.
    /// MPMediaItemAnimatedArtwork may reject assets whose aspect ratio diverges
    /// from the size it asks for, and the raw loops run 0.42 to 0.77, so the
    /// system gets a purpose-built pair rather than the card's own file.
    private var artStem: String? {
        guard let name = posterVideoSrc?.split(separator: "/").last else { return nil }
        return String(name).replacingOccurrences(of: ".mp4", with: "") + "-art34"
    }
    var animatedArtworkURL: URL? {
        guard let stem = artStem else { return nil }
        return Bundle.main.url(forResource: stem, withExtension: "mp4")
    }
    var animatedArtworkPreviewURL: URL? {
        guard let stem = artStem else { return nil }
        return Bundle.main.url(forResource: stem, withExtension: "jpg")
    }

    /// "Psalm 23:1-3" -> ("Psalm 23", "1-3"). The card shows the reference whole,
    /// but the reader needs the book and chapter on their own.
    var reference: (book: String, verses: String?) {
        guard let colon = title.firstIndex(of: ":") else { return (title, nil) }
        return (String(title[..<colon]), String(title[title.index(after: colon)...]))
    }

    func caption(at t: Double) -> Subtitle? {
        subtitles?.first { $0.contains(t) }
    }
}

enum PostStore {
    /// Decoded once; the feed is a fixed set shipped with the app.
    static let shorts: [Post] = {
        guard let url = Bundle.main.url(forResource: "shorts", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            assertionFailure("shorts.json missing from the bundle")
            return []
        }
        do {
            return try JSONDecoder().decode([Post].self, from: data)
        } catch {
            assertionFailure("shorts.json did not decode: \(error)")
            return []
        }
    }()
}
