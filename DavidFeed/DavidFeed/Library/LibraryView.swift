import SwiftUI

/// The Library.
///
/// Rebuilt from davidfeed's Library (Figma "Library-Feed" 2672:17521 and
/// "Library-Verse" 2672:17678, 375x747). There is deliberately no page title:
/// "the frames start at y=40 with a tab switcher and nothing above it", and an
/// earlier version of that page which had a "Library" heading was replaced
/// wholesale rather than amended.
///
///   tabs   374x38 at y=40, padding 0/24, gap 12. Pills radius 19.25, padding
///          8/16, Semi Bold 17/22, tracking -0.41. ACTIVE is #FFFFFF with
///          #0E0E0E text; inactive is #0E0E0E with white text. The pills hug
///          their text, so the frames' fixed widths were never to be held to.
///   grid   3 up, padding 0/24, gap 2 on BOTH axes. Tiles radius 12, no
///          caption; width is (column - 48 - 4) / 3, a fraction rather than a
///          fixed number, so the ratio is what is pinned.
///   entry  padding 0/24, gap 12: a meta row, the verse, a #212121 hairline.
///          Reference Medium 15 white, version Medium 15 #999999, verse
///          Regular 18/150% white. Entries 32 apart.
struct LibraryView: View {
    private enum Section: String, CaseIterable, Identifiable {
        case saved = "Saved Feed"
        case highlights = "Highlighted Verses"
        var id: String { rawValue }
    }

    @Environment(AppState.self) private var app
    @State private var section: Section = .saved
    /// Nil shows every highlight; a colour narrows the list to it.
    @State private var filter: String?
    /// The saved set opened as a feed, starting on the tile that was tapped.
    @State private var openedFeedAt: Post?
    /// The highlight whose action bar is open, so it can be recoloured or cleared.
    @State private var editing: HighlightRun?

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            tabs
            if section == .highlights && !app.highlights.isEmpty { filterBar }
            content
            Spacer(minLength: 0)
        }
        .padding(.top, 40)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DF.ground)
        .fullScreenCover(item: $openedFeedAt) { post in
            // No .navigationTransition(.zoom) here. LibraryView has no
            // NavigationStack — the design has no title bar to put one under —
            // and a zoom transition outside a navigation context is unsupported:
            // it degraded harmlessly in the simulator but left the cover on
            // device in a state where the close button did not dismiss it.
            // A full-screen cover has no interactive dismiss of its own, so that
            // button was the only way out and the screen became a dead end.
            SavedFeedScreen(posts: app.savedPosts, startAt: post.id)
        }
    }

    // MARK: the switcher — pills, not a segmented control

    private var tabs: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 12) {
                ForEach(Section.allCases) { s in
                    let on = s == section
                    Button {
                        withAnimation(.snappy(duration: 0.2)) { section = s }
                    } label: {
                        Text(s.rawValue)
                            .font(.system(size: 17, weight: .semibold))
                            .tracking(-0.41)
                            .foregroundStyle(on ? DF.surface : DF.ink)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 16)
                            .background(on ? DF.ink : DF.surface, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)
        }
        .scrollIndicators(.hidden)
    }

    /// "326x54 radius 30, #212121, padding 8/16, four 28.7 swatches. Fixed width
    /// and space-between, so the gap is COMPUTED — the same construction as the
    /// verse action bar's swatch group, and the same four colours in the same
    /// order."
    private var filterBar: some View {
        HighlightSwatchRow(selected: filter) { filter = $0 }
            .padding(.horizontal, 16)
            .frame(height: 54)
            .background(DF.surfaceRaised, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
            .padding(.horizontal, 24)
    }

    @ViewBuilder
    private var content: some View {
        switch section {
        case .saved:
            if app.savedPosts.isEmpty {
                empty("Bookmark a verse in the feed and its artwork lands here.")
            } else {
                savedGrid
            }
        case .highlights:
            if app.highlights.isEmpty {
                empty("Highlight a verse while you read and it lands here.")
            } else {
                highlightList
            }
        }
    }

    private func empty(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 19))
            .foregroundStyle(DF.inkDim)
            .padding(.horizontal, 24)
    }

    /// "3 up, gap 2 on BOTH axes, tiles radius 12, no caption"
    private var savedGrid: some View {
        ScrollView {
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 3),
                spacing: 2
            ) {
                ForEach(app.savedPosts) { post in
                    // 107.33 x 126 in the frame — pinned as the ratio, since the
                    // tile is a fraction of the column at every width.
                    //
                    // The ratio goes on an empty cell with the artwork OVER it,
                    // not on the image: aspectRatio(.fill) on the image itself
                    // grows the cell to cover, which pushed the tiles past the
                    // grid's own 24pt margins.
                    Button { openedFeedAt = post } label: {
                    Color.clear
                        .aspectRatio(107.33 / 126, contentMode: .fit)
                        .overlay {
                            if let art = post.artworkURL,
                               let ui = UIImage(contentsOfFile: art.path) {
                                Image(uiImage: ui).resizable().scaledToFill()
                            } else {
                                DF.surface
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 120)
        }
        .scrollIndicators(.hidden)
    }

    /// "a meta row, the verse, a #212121 hairline. Entries 32 apart."
    private var highlightList: some View {
        let shown = filter == nil ? runs : runs.filter { $0.colour == filter }
        return ScrollView {
            LazyVStack(alignment: .leading, spacing: 32) {
                ForEach(shown) { run in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 8) {
                            // "An 8px dot in the meta row is the smallest thing
                            // that makes the filter legible" — the verse text
                            // itself stays plain white.
                            Circle().fill(Color(hex: run.colour)).frame(width: 8, height: 8)
                            Text(run.reference)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(DF.ink)
                            Text(run.version)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color(red: 0.6, green: 0.6, blue: 0.6))
                            Spacer()
                        }
                        Text(run.text)
                            .font(.system(size: 18))
                            .foregroundStyle(DF.ink)
                            .lineSpacing(9)
                            .tracking(-0.26)

                        if editing == run {
                            HighlightSwatchRow(selected: run.colour) { colour in
                                for n in run.numbers {
                                    let k = AppState.verseKey(book: run.book, chapter: run.chapter, verse: n)
                                    app.setHighlight(colour, for: k)
                                }
                                editing = nil
                            }
                            .padding(12)
                            .frame(height: 54)
                            .background(DF.surfaceRaised,
                                        in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }

                        Rectangle().fill(DF.surfaceRaised).frame(height: 1)
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        withAnimation(.snappy(duration: 0.2)) {
                            editing = (editing == run) ? nil : run
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 120)
        }
        .scrollIndicators(.hidden)
    }

    /// Contiguous verses sharing a colour collapse into one entry — highlighting
    /// 2-4 gives a single row reading "Psalms 46 2-4", not three.
    private var runs: [HighlightRun] {
        let store = BibleStore.shared
        var byChapter: [String: [(Int, String)]] = [:]
        for (key, colour) in app.highlights {
            let bits = key.split(separator: "/")
            guard bits.count == 3, let c = Int(bits[1]), let v = Int(bits[2]) else { continue }
            byChapter["\(bits[0])/\(c)", default: []].append((v, colour))
        }
        var out: [HighlightRun] = []
        for (chapterKey, entries) in byChapter {
            let bits = chapterKey.split(separator: "/")
            guard let chapter = Int(bits[1]) else { continue }
            let slug = String(bits[0])
            let verses = store.verses(book: slug, chapter: chapter)
            var current: [Int] = []
            var colour = ""
            func flush() {
                guard !current.isEmpty else { return }
                let text = current.compactMap { $0 >= 1 && $0 <= verses.count ? verses[$0 - 1] : nil }
                    .joined(separator: " ")
                out.append(HighlightRun(
                    book: slug, chapter: chapter, numbers: current, colour: colour,
                    reference: "\(store.displayName(slug)) \(chapter):\(Self.range(current))",
                    version: store.translation.uppercased(), text: text
                ))
                current = []
            }
            for (v, c) in entries.sorted(by: { $0.0 < $1.0 }) {
                if let last = current.last, v == last + 1, c == colour {
                    current.append(v)
                } else {
                    flush()
                    current = [v]
                    colour = c
                }
            }
            flush()
        }
        return out.sorted { ($0.reference, $0.numbers.first ?? 0) < ($1.reference, $1.numbers.first ?? 0) }
    }

    private static func range(_ ns: [Int]) -> String {
        guard let first = ns.first, let last = ns.last else { return "" }
        return first == last ? "\(first)" : "\(first)-\(last)"
    }

}

/// One contiguous run of verses highlighted in a single colour.
struct HighlightRun: Identifiable, Hashable {
    let book: String
    let chapter: Int
    let numbers: [Int]
    let colour: String
    let reference: String
    let version: String
    let text: String
    var id: String { "\(book)/\(chapter)/\(numbers.first ?? 0)" }
}

/// The saved set played as a feed, opened from a tile.
private struct SavedFeedScreen: View {
    let posts: [Post]
    let startAt: Int
    @Environment(\.dismiss) private var dismiss

    // No swipe-to-dismiss: a DragGesture here loses to the feed's own vertical
    // scroll view, so it would be a control that appears to exist and does not
    // work — and it risks interfering with the scrolling that does. The button
    // is the way out, so it is sized and layered to be reliable.

    var body: some View {
        FeedView(allPosts: posts, fixedSet: true, startAt: startAt)
            .background(DF.ground)
            .overlay(alignment: .topLeading) {
                Button { dismiss() } label: {
                    Image("Close")
                        .renderingMode(.template)
                        .resizable().scaledToFit()
                        .frame(width: 20, height: 20)
                        .foregroundStyle(DF.ink)
                        // 48pt, comfortably over the 44pt minimum: this is the
                        // primary way out of a screen that has no other chrome.
                        .frame(width: 48, height: 48)
                        .glassEffect(.regular.interactive(), in: .circle)
                        .contentShape(.circle)
                }
                .buttonStyle(.plain)
                .padding(.leading, 16)
                .padding(.top, 8)
                // Above the feed's own tap targets, which cover the full screen.
                .zIndex(1)
            }
            // Closing this viewer ends its playback — narration and the ambient
            // bed with it.
            //
            // Playback is a singleton so it can survive the app going to the
            // background and keep the lock screen alive; the cost is that
            // nothing stops it when a view goes away. That is right for the Home
            // feed, which is meant to keep playing, and wrong here: this is a
            // modal session and dismissing it is the reader saying they are done.
            .onDisappear { Playback.shared.pause() }
    }
}
