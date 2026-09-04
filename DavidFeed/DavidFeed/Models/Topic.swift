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

    /// The web app opens on the first topic, not on the unfiltered set.
    static var initial: Topic? { all.first }
}
