import Observation
import SwiftUI

/// Cross-screen state: what the reader has saved, and whether the feed has
/// sound. Mirrors davidfeed's src/lib/stores.ts.
@Observable
final class AppState {
    // Sound state lives on Playback, not here. Holding it in both places let
    // them disagree: the lock screen's play button moved the player while this
    // flag stayed false, so the card kept offering "Tap for sound" over audible
    // narration. The feed still starts silent — Playback starts paused.

    private(set) var savedIDs: Set<Int> = []

    /// Called after every change the reader makes (not after a row pulled from
    /// the server), so Account can push it. Set by Account.start.
    @ObservationIgnored var onLocalChange: (() -> Void)?

    /// Highlighted verses, keyed by book/chapter/verse, valued by hex colour.
    /// Mirrors davidfeed's highlightStore ("dafod.highlights").
    private(set) var highlights: [String: String] = [:]
    /// Verses saved from the reader's action bar, distinct from saved cards.
    private(set) var savedVerses: Set<String> = []

    /// The films' ids before they took the web's (films.ts), so a film saved
    /// on a phone before then is still saved after. 108 was Psalm 45's impasto,
    /// which is off the feed; it maps to its web id and simply isn't shown.
    private static let webID: [Int: Int] = [101: 2301, 102: 2302, 103: 2303, 104: 301, 105: 302,
                                             106: 303, 107: 4501, 108: 4502, 110: 4503, 109: 41001]

    private static let savedKey = "davidfeed.saved"
    private static let highlightKey = "davidfeed.highlights"
    private static let savedVerseKey = "davidfeed.savedVerses"

    init() {
        let d = UserDefaults.standard
        savedIDs = Set((d.array(forKey: Self.savedKey) as? [Int] ?? []).map { Self.webID[$0] ?? $0 })
        d.set(Array(savedIDs), forKey: Self.savedKey)
        highlights = d.dictionary(forKey: Self.highlightKey) as? [String: String] ?? [:]
        savedVerses = Set(d.array(forKey: Self.savedVerseKey) as? [String] ?? [])
    }

    // MARK: verses

    /// Sampled from the design's swatches, left to right — davidfeed's
    /// HIGHLIGHT_COLOURS, in its order.
    static let highlightColours = ["#F19AEA", "#FFFE54", "#FF548D", "#61D3FA"]

    static func verseKey(book: String, chapter: Int, verse: Int) -> String {
        "\(book)/\(chapter)/\(verse)"
    }

    func highlight(_ key: String) -> String? { highlights[key] }

    /// Tapping the swatch already set clears it, as the web bar does.
    func setHighlight(_ colour: String?, for key: String) {
        forceHighlight(colour.flatMap { highlights[key] == $0 ? nil : $0 }, for: key)
    }

    /// The colour a verse should END UP with (nil clears it) -- what a held
    /// highlight is replayed as after sign-in, never a toggle.
    func forceHighlight(_ colour: String?, for key: String) {
        if let colour { highlights[key] = colour } else { highlights.removeValue(forKey: key) }
        UserDefaults.standard.set(highlights, forKey: Self.highlightKey)
        onLocalChange?()
    }

    func isVerseSaved(_ key: String) -> Bool { savedVerses.contains(key) }

    func toggleVerseSaved(_ key: String) {
        if savedVerses.contains(key) { savedVerses.remove(key) } else { savedVerses.insert(key) }
        UserDefaults.standard.set(Array(savedVerses), forKey: Self.savedVerseKey)
        onLocalChange?()
    }

    func isSaved(_ post: Post) -> Bool { savedIDs.contains(post.id) }

    func toggleSaved(_ post: Post) { setSaved(post.id, on: !savedIDs.contains(post.id)) }

    /// Whether a film should END UP saved -- see forceHighlight.
    func setSaved(_ id: Int, on: Bool) {
        if on { savedIDs.insert(id) } else { savedIDs.remove(id) }
        UserDefaults.standard.set(Array(savedIDs), forKey: Self.savedKey)
        onLocalChange?()
    }

    // MARK: the account's row (the web's library table)

    /// The row, in the web's shape so one account serves both:
    ///   saved_posts   { "2301": true }
    ///   saved_verses  { "Psalms 23": { "3": true } }
    ///   highlights    { "Psalms 23": { "1": "#FFFE54" } }
    /// The app keys a verse "psalms/23/1" (book slug); the row keys a chapter by
    /// the book's name, as the web reader titles it.
    func libraryRow() -> [String: Any] {
        var posts: [String: Bool] = [:]
        for id in savedIDs { posts[String(id)] = true }
        var verses: [String: [String: Bool]] = [:]
        for key in savedVerses {
            if let (chapter, verse) = Self.webKey(key) { verses[chapter, default: [:]][verse] = true }
        }
        var colours: [String: [String: String]] = [:]
        for (key, colour) in highlights {
            if let (chapter, verse) = Self.webKey(key) { colours[chapter, default: [:]][verse] = colour }
        }
        return ["saved_posts": posts, "saved_verses": verses, "highlights": colours]
    }

    /// Replaces the local Library with a row from the server. Not a change the
    /// reader made, so it doesn't push.
    func apply(row: [String: Any]) {
        let posts = row["saved_posts"] as? [String: Any] ?? [:]
        savedIDs = Set(posts.keys.compactMap(Int.init))
        var verses = Set<String>()
        for (chapter, map) in row["saved_verses"] as? [String: [String: Any]] ?? [:] {
            for verse in map.keys { if let k = Self.appKey(chapter, verse) { verses.insert(k) } }
        }
        savedVerses = verses
        var colours: [String: String] = [:]
        for (chapter, map) in row["highlights"] as? [String: [String: Any]] ?? [:] {
            for (verse, colour) in map {
                if let k = Self.appKey(chapter, verse), let c = colour as? String { colours[k] = c }
            }
        }
        highlights = colours
        let d = UserDefaults.standard
        d.set(Array(savedIDs), forKey: Self.savedKey)
        d.set(Array(savedVerses), forKey: Self.savedVerseKey)
        d.set(highlights, forKey: Self.highlightKey)
    }

    static let emptyRow: [String: Any] = ["saved_posts": [String: Bool](), "saved_verses": [String: Any](),
                                          "highlights": [String: Any]()]

    /// Both, the device winning where a verse has two colours: it holds what
    /// the reader did most recently on the screen in front of them (lib/auth.ts
    /// merge).
    static func merge(remote: [String: Any], device: [String: Any]) -> [String: Any] {
        func posts(_ r: [String: Any]) -> [String: Any] { r["saved_posts"] as? [String: Any] ?? [:] }
        func chapters(_ r: [String: Any], _ k: String) -> [String: [String: Any]] {
            r[k] as? [String: [String: Any]] ?? [:]
        }
        func mergeChapters(_ a: [String: [String: Any]], _ b: [String: [String: Any]]) -> [String: [String: Any]] {
            var out = a
            for (chapter, verses) in b { out[chapter, default: [:]].merge(verses) { _, device in device } }
            return out
        }
        return [
            "saved_posts": posts(remote).merging(posts(device)) { _, device in device },
            "saved_verses": mergeChapters(chapters(remote, "saved_verses"), chapters(device, "saved_verses")),
            "highlights": mergeChapters(chapters(remote, "highlights"), chapters(device, "highlights")),
        ]
    }

    /// slug <-> name, from the Bible's own index (the same 66 names the web uses).
    private static let bookNames: [String: String] = {
        guard let url = Bundle.main.url(forResource: "index", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let books = json["web"] as? [[String: Any]]
        else { return [:] }
        var map: [String: String] = [:]
        for b in books { if let s = b["slug"] as? String, let n = b["name"] as? String { map[s] = n } }
        return map
    }()
    private static let bookSlugs = Dictionary(bookNames.map { ($1, $0) }, uniquingKeysWith: { a, _ in a })

    /// "psalms/23/1" -> ("Psalms 23", "1")
    private static func webKey(_ key: String) -> (String, String)? {
        let parts = key.split(separator: "/")
        guard parts.count == 3, let name = bookNames[String(parts[0])] else { return nil }
        return ("\(name) \(parts[1])", String(parts[2]))
    }

    /// ("Psalms 23", "1") -> "psalms/23/1"
    private static func appKey(_ chapter: String, _ verse: String) -> String? {
        guard let space = chapter.lastIndex(of: " "),
              let slug = bookSlugs[String(chapter[..<space])] else { return nil }
        return "\(slug)/\(chapter[chapter.index(after: space)...])/\(verse)"
    }

    var savedPosts: [Post] {
        PostStore.shorts.filter { savedIDs.contains($0.id) }
    }
}
