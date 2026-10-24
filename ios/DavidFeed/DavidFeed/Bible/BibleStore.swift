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
    /// davidfeed's own note on provenance.
    let note: String
    /// Fetched from dafod.app rather than bundled. See `load`.
    var licensed = false
}

/// One chapter of a licensed translation, as dafod.app's /api/bible route
/// serves it: the web reader's {b, c, v} plus the publisher's notice.
private struct RemoteChapter: Codable {
    let v: [String]
    let copyright: String
    /// When it was fetched, for the 30-day refresh the licence requires.
    var fetchedAt: Date?
}

@Observable
final class BibleStore {
    /// One instance. The reader and the Library both resolve verse text, and a
    /// second store would let them drift onto different translations.
    @MainActor static let shared = BibleStore()

    /// NIV, NKJV and NLT are licensed from API.Bible (American Bible Society)
    /// and come from dafod.app's own route, which holds the API key — the app
    /// never sees it — and caches each chapter for 29 days, so the free plan's
    /// 5,000 calls a month cover the website and the app together. The other
    /// three are public domain and bundled, so they work offline.
    ///
    /// API.Bible's view reporting (FUMS) is required of web apps only; an app
    /// installed from the App Store is exempt, so nothing is reported here.
    static let translations: [TranslationMeta] = [
        .init(id: "niv", label: "NIV", note: "New International Version", licensed: true),
        .init(id: "nkjv", label: "NKJV", note: "New King James Version", licensed: true),
        .init(id: "nlt", label: "NLT", note: "New Living Translation", licensed: true),
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
    /// Licensed chapters held in memory, keyed "niv-psalms-46". Observed, so a
    /// chapter arriving redraws whatever was waiting for it.
    private var remote: [String: RemoteChapter] = [:]
    /// Licensed chapters that could not be had (offline, most likely), so the
    /// reader can say so instead of showing an empty page.
    private(set) var failed: Set<String> = []
    @ObservationIgnored private var inFlight: Set<String> = []

    /// NIV first, as on the website, where it is what the films quote.
    var translation: String = "niv" {
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
        // The licensed three have no bundled index; their canon is the KJV's,
        // and the website validates every chapter against the same 66 books.
        books = all[translation] ?? all["kjv"] ?? []
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

    func displayName(_ slug: String) -> String { meta(slug)?.name ?? book(slug)?.name ?? slug }

    static func isLicensed(_ translation: String) -> Bool {
        translations.first { $0.id == translation }?.licensed ?? false
    }

    /// Verses for one chapter, 1-based in the order they are read.
    ///
    /// `translation` is explicit so the compare card can read all of them at
    /// once without moving the reader off the one it is on. A licensed chapter
    /// is empty until `load` has fetched it.
    func verses(book slug: String, chapter: Int, translation tr: String? = nil) -> [String] {
        let tr = tr ?? translation
        if Self.isLicensed(tr) {
            return remote[Self.remoteKey(tr, slug, chapter)]?.v ?? []
        }
        return book(slug, tr)?.chapters[String(chapter)] ?? []
    }

    /// The publisher's notice for a licensed chapter, shown with its text as the
    /// licence asks. Nil for the public-domain translations.
    func copyright(book slug: String, chapter: Int, translation tr: String? = nil) -> String? {
        let tr = tr ?? translation
        guard Self.isLicensed(tr) else { return nil }
        return remote[Self.remoteKey(tr, slug, chapter)]?.copyright
    }

    func loadFailed(book slug: String, chapter: Int, translation tr: String? = nil) -> Bool {
        failed.contains(Self.remoteKey(tr ?? translation, slug, chapter))
    }

    // MARK: licensed chapters

    private static let site = URL(string: "https://www.dafod.app")!
    /// 29 days: API.Bible's terms want cached Scripture refreshed within 30.
    private static let maxAge: TimeInterval = 29 * 24 * 60 * 60

    private static func remoteKey(_ tr: String, _ slug: String, _ chapter: Int) -> String {
        "\(tr)-\(slug)-\(chapter)"
    }

    /// The device's copy of fetched chapters, so a chapter read once opens
    /// offline for the rest of the month. Caches, not Documents: the system may
    /// clear it, and it is always re-fetchable.
    private static let diskDir: URL? = {
        guard let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
        else { return nil }
        let dir = base.appending(path: "licensed-bible", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    /// Fetch the licensed translations among `translations` for one chapter.
    /// The public-domain ones are bundled and need nothing, so they are skipped;
    /// a chapter already held (in memory or on disk, inside 29 days) is not
    /// fetched again.
    func load(book slug: String, chapter: Int, translations: [String]) async {
        await withTaskGroup(of: Void.self) { group in
            for tr in translations where Self.isLicensed(tr) {
                group.addTask { await self.loadOne(tr, slug, chapter) }
            }
        }
    }

    private func loadOne(_ tr: String, _ slug: String, _ chapter: Int) async {
        let key = Self.remoteKey(tr, slug, chapter)
        if let held = remote[key], Self.fresh(held) { return }
        guard !inFlight.contains(key) else { return }
        inFlight.insert(key)
        defer { inFlight.remove(key) }

        let file = Self.diskDir?.appending(path: "\(key).json")
        if let file, let data = try? Data(contentsOf: file),
           let saved = try? JSONDecoder().decode(RemoteChapter.self, from: data), Self.fresh(saved) {
            remote[key] = saved
            failed.remove(key)
            return
        }

        let url = Self.site.appending(path: "api/bible/\(tr)/\(slug)/\(chapter)")
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            var chapterText = try JSONDecoder().decode(RemoteChapter.self, from: data)
            chapterText.fetchedAt = .now
            remote[key] = chapterText
            failed.remove(key)
            if let file, let encoded = try? JSONEncoder().encode(chapterText) {
                try? encoded.write(to: file, options: .atomic)
            }
        } catch {
            // A copy already on screen stays there; only a chapter with
            // nothing to show is marked, so the reader can say why.
            if remote[key] == nil { failed.insert(key) }
        }
    }

    private static func fresh(_ chapter: RemoteChapter) -> Bool {
        guard let at = chapter.fetchedAt else { return false }
        return Date.now.timeIntervalSince(at) < maxAge
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
