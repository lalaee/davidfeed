import Foundation
import Observation

/// Which books exist, per translation.
struct BookMeta: Codable, Identifiable, Hashable {
    let slug: String
    let name: String
    let chapters: Int
    var id: String { slug }
}

/// One book's whole text, loaded on demand.
private struct BookText: Codable {
    let slug: String
    let name: String
    /// Chapter number (as a string, because JSON keys are strings) -> verses.
    let chapters: [String: [String]]
}

struct TranslationMeta: Identifiable, Hashable {
    let id: String
    let label: String
    /// davidfeed's own note on provenance — all three are public domain.
    let note: String
}

@Observable
final class BibleStore {
    /// One instance. The reader and the Library both resolve verse text, and a
    /// second store would let them drift onto different translations.
    @MainActor static let shared = BibleStore()

    static let translations: [TranslationMeta] = [
        .init(id: "kjv", label: "KJV", note: "King James Version, 1769"),
        .init(id: "asv", label: "ASV", note: "American Standard Version, 1901"),
        .init(id: "web", label: "WEB", note: "World English Bible"),
    ]

    /// Where the reader is. Held here rather than in BibleView so another tab
    /// can move it — opening the Bible from a feed card has to land on that
    /// card's chapter, and a view's @State is not reachable from outside it.
    var book: String = "psalms"
    var chapter: Int = 46
    /// A verse the reader should scroll to and select once it appears. Consumed
    /// by BibleView and cleared, so it fires once rather than on every redraw.
    var pendingVerse: Int?

    private(set) var books: [BookMeta] = []
    private var cache: [String: BookText] = [:]

    var translation: String = "kjv" {
        didSet {
            guard translation != oldValue else { return }
            loadIndex()
        }
    }

    init() { loadIndex() }

    private func loadIndex() {
        guard let url = Bundle.main.url(forResource: "index", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let all = try? JSONDecoder().decode([String: [BookMeta]].self, from: data)
        else {
            assertionFailure("bible index.json missing or malformed")
            return
        }
        // Canonical order is the index's own order for the selected translation.
        books = all[translation] ?? []
    }

    private func book(_ slug: String, _ tr: String? = nil) -> BookText? {
        let key = "\(tr ?? translation)-\(slug)"
        if let hit = cache[key] { return hit }
        guard let url = Bundle.main.url(forResource: key, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let text = try? JSONDecoder().decode(BookText.self, from: data)
        else { return nil }
        cache[key] = text
        return text
    }

    func meta(_ slug: String) -> BookMeta? { books.first { $0.slug == slug } }

    /// Resolve a card's title — "Psalm 27:1", "2 Samuel 22:29", "Psalm 23:1-3" —
    /// to a book and chapter.
    ///
    /// The trailing number before the colon is the chapter, whatever precedes it
    /// is the book. Two wrinkles: the feed writes "Psalm" where the canon says
    /// "Psalms", and numbered books ("2 Samuel") slug with a hyphen.
    func locate(title: String) -> (book: String, chapter: Int)? {
        let head = title.split(separator: ":").first.map(String.init) ?? title
        let parts = head.split(separator: " ")
        guard let chapter = Int(parts.last ?? "") , parts.count >= 2 else { return nil }
        let name = parts.dropLast().joined(separator: " ")
        let slug = name.lowercased().replacingOccurrences(of: " ", with: "-")

        // Exact, then the singular/plural the feed's titles use.
        for candidate in [slug, slug + "s", String(slug.dropLast())] where !candidate.isEmpty {
            if books.contains(where: { $0.slug == candidate }) {
                return (candidate, chapter)
            }
        }
        // Last resort: match on the display name the translation itself carries.
        if let hit = books.first(where: { $0.name.lowercased().hasPrefix(name.lowercased()) }) {
            return (hit.slug, chapter)
        }
        return nil
    }

    /// Open the reader at a card's verse, if the title resolves. Chapter is
    /// clamped, since a card could name one the translation does not have.
    @discardableResult
    func open(title: String) -> Bool {
        guard let (slug, ch) = locate(title: title) else { return false }
        book = slug
        chapter = min(max(1, ch), max(1, chapterCount(slug)))
        pendingVerse = Self.firstVerse(in: title)
        return true
    }

    /// The opening verse a card quotes: "Psalm 23:1-3" -> 1, "Psalm 27:1" -> 1.
    /// A card can speak a span; this selects where that span starts, which is
    /// also where the reader wants to be looking.
    static func firstVerse(in title: String) -> Int? {
        guard let tail = title.split(separator: ":").dropFirst().first else { return nil }
        let digits = tail.prefix { $0.isNumber }
        return Int(digits)
    }

    func displayName(_ slug: String) -> String { book(slug)?.name ?? slug }

    /// Verses for one chapter, 1-based in the order they are read.
    ///
    /// `translation` is explicit so the compare card can read all three at once
    /// without moving the reader off the one it is on.
    func verses(book slug: String, chapter: Int, translation tr: String? = nil) -> [String] {
        book(slug, tr)?.chapters[String(chapter)] ?? []
    }

    func chapterCount(_ slug: String) -> Int { meta(slug)?.chapters ?? 0 }

    /// The chapter before/after this one, crossing book boundaries the way a
    /// reader moving through scripture would.
    func step(book slug: String, chapter: Int, by delta: Int) -> (String, Int)? {
        guard let idx = books.firstIndex(where: { $0.slug == slug }) else { return nil }
        let next = chapter + delta
        if next >= 1 && next <= books[idx].chapters { return (slug, next) }
        if delta > 0, idx + 1 < books.count { return (books[idx + 1].slug, 1) }
        if delta < 0, idx > 0 {
            let prev = books[idx - 1]
            return (prev.slug, prev.chapters)
        }
        return nil
    }
}
