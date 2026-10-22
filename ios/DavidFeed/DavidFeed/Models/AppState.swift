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

    /// Highlighted verses, keyed by book/chapter/verse, valued by hex colour.
    /// Mirrors davidfeed's highlightStore ("dafod.highlights").
    private(set) var highlights: [String: String] = [:]
    /// Verses saved from the reader's action bar, distinct from saved cards.
    private(set) var savedVerses: Set<String> = []

    private static let savedKey = "davidfeed.saved"
    private static let highlightKey = "davidfeed.highlights"
    private static let savedVerseKey = "davidfeed.savedVerses"

    init() {
        let d = UserDefaults.standard
        savedIDs = Set(d.array(forKey: Self.savedKey) as? [Int] ?? [])
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
        if let colour, highlights[key] != colour {
            highlights[key] = colour
        } else {
            highlights.removeValue(forKey: key)
        }
        UserDefaults.standard.set(highlights, forKey: Self.highlightKey)
    }

    func isVerseSaved(_ key: String) -> Bool { savedVerses.contains(key) }

    func toggleVerseSaved(_ key: String) {
        if savedVerses.contains(key) { savedVerses.remove(key) } else { savedVerses.insert(key) }
        UserDefaults.standard.set(Array(savedVerses), forKey: Self.savedVerseKey)
    }

    func isSaved(_ post: Post) -> Bool { savedIDs.contains(post.id) }

    func toggleSaved(_ post: Post) {
        if savedIDs.contains(post.id) {
            savedIDs.remove(post.id)
        } else {
            savedIDs.insert(post.id)
        }
        UserDefaults.standard.set(Array(savedIDs), forKey: Self.savedKey)
    }

    var savedPosts: [Post] {
        PostStore.shorts.filter { savedIDs.contains($0.id) }
    }
}
