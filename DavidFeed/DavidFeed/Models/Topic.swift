import Foundation

/// A topic in the feed header's picker. Mirrors davidfeed's src/data/topics.ts.
///
/// The labels are "the trouble the reader brings, and the psalms under it are
/// the answer to it" — its words. `ids` is a list of Post.id in feed order;
/// null means every card.
struct Topic: Codable, Identifiable, Hashable {
    let id: String
    let label: String
    let ids: [Int]?

    /// The topic's cards, in the order the topic lists them — not feed order.
    func posts(from all: [Post]) -> [Post] {
        guard let ids else { return all }
        let byID = Dictionary(all.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return ids.compactMap { byID[$0] }
    }
}

enum TopicStore {
    static let all: [Topic] = {
        guard let url = Bundle.main.url(forResource: "topics", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let list = try? JSONDecoder().decode([Topic].self, from: data)
        else {
            assertionFailure("topics.json missing or malformed")
            return []
        }
        return list
    }()

    /// One seed per launch.
    ///
    /// Ported from the web's `readFeedSeed`, whose note is the reason it is a
    /// `let` and not a computed value: "one seed per page load, not per render,
    /// or every render would re-deal the feed under the reader's thumb." Here
    /// the equivalent is one seed per process, so every read of `initial`
    /// within a launch agrees.
    /// Never 0. The web reserves 0 for its server ("leave the order alone");
    /// nothing here needs that, so the range simply excludes it.
    static let seed: UInt32 = .random(in: 1...UInt32.max)

    /// Which topic a launch opens on.
    ///
    /// This was `all.first` — Pressure — so every launch landed on the same
    /// filter. The web hit exactly this and fixed it in `topicForSeed`; the
    /// pick is that seed modulo the list, so the port is the same rule.
    ///
    /// "Anything" stays in the pool, which the web is explicit about and which
    /// is worth not second-guessing: "it is one of the six filters, and the
    /// complaint was landing on the same one every time, not on that one."
    ///
    /// The web also has a seed-0 branch returning the first topic. That exists
    /// only so its static prerender is stable enough for hydration to agree
    /// with. There is no prerender here, so there is no seed 0 and no branch.
    /// Topics are PARKED, not deleted — the web's TOPICS_ENABLED, ported.
    ///
    /// Flip to true and the feed groups again: the picker, `initial`'s random
    /// pick and `Topic.posts(from:)` are all intact and still built. It works
    /// the same way the web's does, by pinning to "all" — the entry whose `ids`
    /// are nil — so `posts(from:)` already returns everything and nothing
    /// downstream has to know the feature is off.
    static let enabled = false

    static var initial: Topic? {
        guard !all.isEmpty else { return nil }
        guard enabled else { return all.first { $0.ids == nil } ?? all.first }
        return all[Int(seed % UInt32(all.count))]
    }

    /// The cards of a topic, dealt into an order.
    ///
    /// Ported from the web's `shuffled`, and for the reason its note gives:
    /// "postsForTopic hands back the topic's own array, in the order it is
    /// written, so the home feed opened on Psalm 27:1 every single time — the
    /// same card, the same verse, for a feed whose whole premise is that you
    /// scroll it."
    ///
    /// Fisher-Yates driven by mulberry32 rather than Swift's own `shuffled()`,
    /// because the order has to be STABLE within a launch: the same seed and
    /// the same topic must deal the same order, so switching topic and
    /// switching back returns the order you left instead of a fresh one.
    /// SystemRandomNumberGenerator would re-deal on every read — and `posts`
    /// is a computed property the feed reads constantly, including from
    /// `onChange(of: posts.map(\.id))`, which a shifting order would trip on
    /// every render.
    static func dealt<T>(_ items: [T]) -> [T] {
        var s = seed
        // mulberry32. Wrapping 32-bit arithmetic throughout, which is what
        // JavaScript's `| 0` and Math.imul do on the other side, so this deals
        // the same sequence for a given seed.
        func unit() -> Double {
            s = s &+ 0x6d2b79f5
            var t = (s ^ (s >> 15)) &* (1 | s)
            t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
            return Double(t ^ (t >> 14)) / 4294967296
        }
        var out = items
        var i = out.count - 1
        while i > 0 {
            out.swapAt(i, Int(unit() * Double(i + 1)))
            i -= 1
        }
        return out
    }
}
