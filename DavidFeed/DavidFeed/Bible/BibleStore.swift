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
