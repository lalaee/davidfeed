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
    static let seed = UInt64.random(in: 1...UInt64.max)

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
    static var initial: Topic? {
        guard !all.isEmpty else { return nil }
        return all[Int(seed % UInt64(all.count))]
    }
}
