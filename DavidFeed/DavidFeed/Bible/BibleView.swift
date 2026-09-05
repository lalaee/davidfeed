import SwiftUI

/// The chapter reader.
///
/// Built to match davidfeed's BibleReader: a rounded pill carrying the book and
/// chapter at the top left, the translation as a separate pill on the right,
/// numbered verses down the page, and circular prev/next controls that cross
/// book boundaries rather than stopping at the end of one.
struct BibleView: View {
    @Environment(AppState.self) private var app
    /// @State holds the shared instance, not a new one: it is initialised once
    /// per view identity, and being a reference type that is the same object the
    /// Library reads. A computed property would give no `$store` binding for the
    /// translation picker.
    @State private var store = BibleStore.shared
    /// The verse whose action bar is open, 1-based. Nil when nothing is selected.
    @State private var selected: Int?
    @State private var barAnchor: CGRect?

    @Namespace private var zoom

    private static let column = "reader-column"
    private static let barHeight: CGFloat = 78
    /// Room the floating tab bar occupies at the bottom, including its inset.
    private static let navFloor: CGFloat = 112
    @State private var showBooks = false
    @State private var comparing: Int?

    private var verses: [String] { store.verses(book: store.book, chapter: store.chapter) }

    var body: some View {
        NavigationStack {
        ZStack {
            DF.ground.ignoresSafeArea()

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 26) {
                        Color.clear.frame(height: 8).id("top")

                        ForEach(Array(verses.enumerated()), id: \.offset) { i, text in
                            verseRow(number: i + 1, text: text)
                                // Addressable, so arriving from a feed card can
                                // scroll straight to the verse it quotes.
                                .id(verseAnchor(i + 1))
                        }
                        Color.clear.frame(height: 150)
                    }
                    .padding(.horizontal, 22)
                    .coordinateSpace(name: Self.column)
                    .overlay(alignment: .topLeading) {
                        GeometryReader { g in actionBar(in: g.size) }
                            // Scoped here so the bar keeps its spring while the
                            // verse text is re-rendered without one.
                            .animation(.snappy(duration: 0.22), value: selected)
                    }
                    .onPreferenceChange(SelectedVerseFrame.self) { barAnchor = $0 }
                }
                .scrollIndicators(.hidden)
                // iOS 26's own treatment for content passing under the bar.
                .scrollEdgeEffectStyle(.soft, for: .top)
                .onChange(of: store.chapter) { proxy.scrollTo("top", anchor: .top) }
                .onChange(of: store.book) { proxy.scrollTo("top", anchor: .top) }
                // Set when the Bible is opened from a card. Handled here rather
                // than in RootView because only this view has the scroll proxy.
                .onChange(of: store.pendingVerse) { _, v in reveal(v, proxy) }
                .task { reveal(store.pendingVerse, proxy) }
            }

            if selected == nil { pager }
        }
        .toolbar { chrome }
        // Reverted to the pill by preference. Worth recording what that costs:
        // a LARGE navigationTitle is the top nav's only native size reduction —
        // iOS collapses it to inline on scroll — and a leading toolbar item does
        // not shrink. So the reader's top chrome is static again by choice, not
        // by oversight. Its scroll-edge effect still applies.
        .toolbarTitleDisplayMode(.inline)
        }
        .onChange(of: store.chapter) { selected = nil }
        .onChange(of: store.book) { selected = nil }
        .sheet(isPresented: $showBooks) {
            BooksSheet(store: store, book: $store.book, chapter: $store.chapter)
                .navigationTransition(.zoom(sourceID: "books", in: zoom))
        }
        .sheet(item: $comparing) { n in
            CompareSheet(reference: reference(n), book: store.book, chapter: store.chapter, verse: n)
                .navigationTransition(.zoom(sourceID: "compare", in: zoom))
        }
    }

    // MARK: verses

    private func verseAnchor(_ n: Int) -> String { "verse-\(n)" }

    /// Scroll to the verse a card quotes and select it, so the action bar is
    /// already open on the line the reader arrived for.
    private func reveal(_ verse: Int?, _ proxy: ScrollViewProxy) {
        guard let verse, verse >= 1 else { return }
        store.pendingVerse = nil
        Task {
            // One hop: the rows are lazy, so the target may not exist yet on the
            // frame the tab switches in.
            await Task.yield()
            try? await Task.sleep(for: .milliseconds(80))
            // The scroll animates; the selection must not, for the reason
            // given on the tap handler above.
            withAnimation {
                proxy.scrollTo(verseAnchor(verse), anchor: .center)
            }
            selected = verse
        }
    }

    private func key(_ n: Int) -> String {
        AppState.verseKey(book: store.book, chapter: store.chapter, verse: n)
    }

    private func reference(_ n: Int) -> String {
        "\(store.displayName(store.book)) \(store.chapter):\(n)"
    }

    /// What Share hands to the system sheet. davidfeed's own ShareSheet says it
    /// "never opens on a phone" — where the platform can share, the button goes
    /// straight to the system sheet — so the phone port is ShareLink, and the
    /// web component's two desktop-only rows have no counterpart here.
    private func shareText(_ n: Int) -> String {
        let verses = store.verses(book: store.book, chapter: store.chapter)
        let text = n >= 1 && n <= verses.count ? verses[n - 1] : ""
        return "\(text)\n\n\(reference(n)) (\(store.translation.uppercased()))"
    }

    @ViewBuilder
    private func verseRow(number n: Int, text: String) -> some View {
        let k = key(n)
        let colour = app.highlight(k)

        HStack(alignment: .firstTextBaseline, spacing: 14) {
            Text("\(n)")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(DF.inkDim)
                .frame(width: 18, alignment: .trailing)
            Text(text)
                .font(.system(size: 21))
                .foregroundStyle(colour == nil ? DF.ink : DF.ground)
                // A selected verse is underlined, dotted, in its own colour:
                // "underline decoration-current decoration-dotted". Passing no
                // colour leaves it as currentColor, which is what keeps it
                // legible over a highlight, where the text goes dark.
                //
                // The web also sets 1.5px thickness and a 7px offset. SwiftUI's
                // Text underline exposes neither, and the alternative — drawing
                // the rule myself — cannot follow text that wraps across lines,
                // which every verse here does. The pattern and colour carry; the
                // metrics are the system's.
                .underline(selected == n, pattern: .dot)
                .lineSpacing(7)
                .padding(.horizontal, colour == nil ? 0 : 6)
                .padding(.vertical, colour == nil ? 0 : 2)
                .background {
                    if let colour {
                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                            .fill(Color(hex: colour))
                    }
                }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            // Deliberately NOT inside withAnimation. `.underline()` is part of
            // Text's CONTENT, not a modifier on it, so changing it makes
            // SwiftUI cross-dissolve two rasterisations of the same glyphs.
            // Under a spring (.snappy overshoots) both snapshots sit near full
            // opacity partway through, which reads as the rule and the text
            // thickening and then settling — the "thick at first, then thin"
            // flicker. The web toggles a class ("underline decoration-dotted"),
            // which is instant, so instant is also what the spec asks for.
            // The action bar still springs; that animation is scoped to it.
            selected = (selected == n) ? nil : n
        }
        // Report this row's frame while it is the selected one, so the bar can
        // be drawn once, over the whole column, at the right height.
        .background {
            if selected == n {
                GeometryReader { g in
                    Color.clear.preference(
                        key: SelectedVerseFrame.self,
                        value: g.frame(in: .named(Self.column))
                    )
                }
            }
        }
    }

    /// The action bar, drawn once as an overlay on the column rather than inside
    /// a row. It has to cover the verses beneath it, and `zIndex` does not
    /// reliably lift one row of a LazyVStack above its siblings — the bar ended
    /// up painted under the very text it is supposed to overlap. Drawn last, over
    /// the whole stack, it is unambiguously on top, and the placement rule
    /// ("below the verse, or above it when there is no room below") becomes a
    /// comparison rather than a guess.
    @ViewBuilder
    private func actionBar(in size: CGSize) -> some View {
        if let n = selected, let frame = barAnchor {
            let k = key(n)
            let below = frame.maxY + 17
            // The floor is the NAV's top edge, not the viewport's, now that the
            // nav stays through a selection — the same correction davidfeed
            // records for its own bar. Without it the action bar can come to
            // rest under the tab bar, where it is half-hidden and partly
            // untappable.
            let fitsBelow = below + Self.barHeight < size.height - Self.navFloor
            VerseActionBar(
                highlight: app.highlight(k),
                isSaved: app.isVerseSaved(k),
                shareItem: shareText(n),
                zoomNamespace: zoom,
                onHighlight: { app.setHighlight($0, for: k) },
                onCompare: { comparing = n },
                onSave: { app.toggleVerseSaved(k) }
            )
            .padding(.horizontal, 16)
            .offset(y: fitsBelow ? below : frame.minY - 17 - Self.barHeight)
            .transition(.opacity)
        }
    }

    // MARK: chrome

    /// The book/chapter and translation controls.
    ///
    /// These were a hand-drawn overlay of two `.glassEffect` pills, which is why
    /// they sat inert while the verses scrolled under them. davidfeed calls its
    /// own version an "iOS 26 toolbar morph" and drives the shrink by hand from
    /// scrollTop — because a web page has no toolbar to hand the job to.
    ///
    /// Here there is one. As real toolbar items they get the glass, the morph as
    /// content scrolls beneath, and the top scroll-edge effect from the system,
    /// so no scroll listener and no transform of ours is involved. The glass is
    /// deliberately NOT applied here: styling a toolbar item by hand opts it out
    /// of the system treatment, the same trap as presentationBackground.
    @ToolbarContentBuilder
    private var chrome: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button { showBooks = true } label: {
                Text("\(store.displayName(store.book)) \(store.chapter)")
                    .font(.system(size: 19, weight: .semibold))
            }
            .matchedTransitionSource(id: "books", in: zoom)
        }
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Picker("Translation", selection: $store.translation) {
                    ForEach(BibleStore.translations) { t in
                        Text("\(t.label) — \(t.note)").tag(t.id)
                    }
                }
            } label: {
                Text(store.translation.uppercased())
                    .font(.system(size: 17, weight: .semibold))
            }
        }
    }

    private var pager: some View {
        VStack {
            Spacer()
            HStack {
                // The Chevron asset points DOWN at rest, so previous is a
                // quarter turn clockwise and next a quarter turn back.
                pagerButton(rotation: 90) { step(-1) }
                Spacer()
                pagerButton(rotation: -90) { step(1) }
            }
            .padding(.horizontal, 47)
            .padding(.bottom, 28)
        }
    }

    private func pagerButton(rotation: Double, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image("Chevron")
                .renderingMode(.template)
                .resizable().scaledToFit()
                .frame(width: 32.5, height: 32.5)
                .rotationEffect(.degrees(rotation))
                .foregroundStyle(DF.ink)
                .frame(width: 52, height: 52)
                .glassEffect(.regular.interactive(), in: .circle)
        }
        .buttonStyle(.plain)
    }

    private func step(_ delta: Int) {
        guard let (b, c) = store.step(book: store.book, chapter: store.chapter, by: delta) else { return }
        store.book = b
        store.chapter = c
    }
}

/// The selected verse's frame, in the column's coordinate space.
private struct SelectedVerseFrame: PreferenceKey {
    static var defaultValue: CGRect? { nil }
    static func reduce(value: inout CGRect?, nextValue: () -> CGRect?) {
        value = nextValue() ?? value
    }
}
