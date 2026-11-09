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
    /// The translation the film quotes. Set by the import from the film's brief.
    let translation: String?
    /// Where the film's burned-in words sit, [highest, lowest], as fractions of
    /// its height -- the web's films.ts, measured by OCR. A card too short for
    /// the whole film crops around them (FeedCardView).
    let captions: [Double]?
    /// The film with its Dafod ending, in the films bucket, for the share
    /// sheet. Absent for the films that predate the bucket: ShareFilm asks
    /// dafod.app for those.
    var shareSrc: String? = nil

    /// "Psalm 45:2-8" -> "Psalm 45": what the feed keeps apart (spread).
    var passage: String {
        title.split(separator: ":", maxSplits: 1).first.map(String.init) ?? title
    }

    /// The file on the phone, if FilmCatalog has downloaded it. The app carries
    /// no films: rows name a file in the Supabase bucket ("/assets/verses/x.mp4"
    /// from the web's paths, or just "x.mp4"), and only the name counts.
    private func stored(_ path: String?, ext: String) -> URL? {
        guard let path, let name = MediaStore.name(path),
              (name as NSString).pathExtension == ext else { return nil }
        return MediaStore.local(name)
    }

    var artworkURL: URL? {
        stored(backgroundImage, ext: "jpg") ?? stored(backgroundImage, ext: "png")
    }
    /// Prefer the parallax loop; fall back to the poster loop, then to nothing
    /// (the still artwork carries the card on its own).
    var loopURL: URL? {
        stored(videoSrc, ext: "mp4") ?? stored(posterVideoSrc, ext: "mp4")
    }
    /// A separate narration, for a film whose sound isn't in the film itself.
    var narrationURL: URL? { stored(audioSrc, ext: "m4a") ?? stored(audioSrc, ext: "mp3") }

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
