import SwiftUI

/// Books and chapters.
///
/// Matches davidfeed's BooksSheet (Figma "Bible" 2654:2933, frame 36942): one
/// scrolling list where a book row expands to show its chapters inline as chips
/// five to a row, with the book row sticking as its own chapters scroll under
/// it. Not a two-step drill-down — Psalms alone is thirty rows of chips, and the
/// design keeps the neighbouring books visible throughout.
///
/// The floating card is not drawn here. On iOS 26 a partial-height detent gets
/// the inset Liquid Glass card automatically — rounded to the device's own
/// corners, edges clear of the screen — which is the shape the web app builds by
/// hand at 333x480, radius 18.83. Two rules make that work, and this file
/// depends on both: there must be a partial detent, and `presentationBackground`
/// must NOT be set, because setting it opts out of the system appearance.
struct BooksSheet: View {
    let store: BibleStore
    @Binding var book: String
    @Binding var chapter: Int

    @Environment(\.dismiss) private var dismiss
    /// Opens on the book being read, as the web sheet does.
    @State private var expanded: String

    init(store: BibleStore, book: Binding<String>, chapter: Binding<Int>) {
        self.store = store
        self._book = book
        self._chapter = chapter
        self._expanded = State(initialValue: book.wrappedValue)
    }

    /// "rows of five, 10 apart"
    private let chapterGrid = Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)

    var body: some View {
        // card px-16 py-24, header -> list gap 32
        VStack(alignment: .leading, spacing: 32) {
            header
            list
        }
        .padding(.top, 24)
        .presentationDetents([.height(480), .large])
        .presentationDragIndicator(.hidden)
    }

    // MARK: header — "a 48x48 #212121 close circle, then Books in Semi Bold 17"

    private var header: some View {
        HStack(spacing: 10) {
            Button { dismiss() } label: {
                Image("Close")
                    .renderingMode(.template)
                    .resizable().scaledToFit()
                    .frame(width: 20, height: 20)
                    .foregroundStyle(DF.ink)
                    .frame(width: 48, height: 48)
                    .background(DF.surfaceRaised, in: .circle)
            }
            .buttonStyle(.plain)

            Text("Books")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(DF.ink)
        }
        .frame(height: 48)
        .padding(.horizontal, 16)
    }

    // MARK: the list

    private var list: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16, pinnedViews: [.sectionHeaders]) {
                    ForEach(store.books) { b in
                        Section {
                            if expanded == b.slug {
                                chapters(for: b)
                            }
                        } header: {
                            bookRow(b)
                        }
                        .id(b.slug)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
            .task { await revealCurrentChapter(proxy) }
        }
    }

    /// The web row is "40 tall, radius 41, 16 padding, label Inter Regular
    /// 18/150% in #FFFFFF whether it is open or shut". Height is the one value
    /// here that does not carry over: 40 was drawn for a 333-wide card, and on a
    /// full-width sheet it reads as a thin band and sits under the 44pt minimum
    /// touch target. 52 keeps the capsule and the type, and gives the row the
    /// presence the design has at its own width.
    private func bookRow(_ b: BookMeta) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.28)) {
                expanded = (expanded == b.slug) ? "" : b.slug
            }
        } label: {
            HStack(spacing: 8) {
                Text(b.name)
                    .font(.system(size: 18))
                    .foregroundStyle(DF.ink)
                Spacer()
                Image("Chevron")
                    .renderingMode(.template)
                    .resizable().scaledToFit()
                    // ChevronIcon's own default size. Its path spans only the
                    // middle of a 25x25 box, so the glyph reads ~14 wide — the
                    // 13pt frame I had first was the whole box, not the mark.
                    .frame(width: 25, height: 25)
                    .foregroundStyle(DF.ink)
                    // The curve points DOWN at rest; expanding flips it, exactly
                    // as the web row does with `rotate-180`.
                    .rotationEffect(.degrees(expanded == b.slug ? 180 : 0))
                    .animation(.easeInOut(duration: 0.2), value: expanded)
            }
            .padding(.horizontal, 16)
            .frame(height: 52)
            .contentShape(Rectangle())
            // The row sticks while its chapters scroll under it, so it needs a
            // ground of its own rather than letting text slide beneath text.
            // The web fills it #0E0E0E — the card's own colour, so it reads as
            // nothing. There is no opaque card here, the sheet's glass is the
            // ground, so it takes a material that occludes without inventing a
            // second surface colour on top of the glass.
            .background(.ultraThinMaterial, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    /// "each chip 46x48 at radius 7 on #212121, the number in Regular 16/150%"
    private func chapters(for b: BookMeta) -> some View {
        LazyVGrid(columns: chapterGrid, spacing: 10) {
            ForEach(1...max(1, b.chapters), id: \.self) { n in
                let isCurrent = (b.slug == book && n == chapter)
                Button {
                    book = b.slug
                    chapter = n
                    dismiss()
                } label: {
                    Text("\(n)")
                        .font(.system(size: 16))
                        .foregroundStyle(isCurrent ? DF.ground : DF.ink)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(
                            isCurrent ? DF.ink : DF.surfaceRaised,
                            in: RoundedRectangle(cornerRadius: 7, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
                .id(chipID(b.slug, n))
            }
        }
        .padding(.horizontal, 16)   // "px-[16px]" — chips inset inside the row
        .padding(.top, 16)          // the group's own gap-[16px]
    }

    private func chipID(_ slug: String, _ n: Int) -> String { "\(slug)-\(n)" }

    /// Land on the chapter being read, a third down rather than at the very top,
    /// so it reads as a place in a list.
    ///
    /// Two stages, because one does not work. The chapter chips live in a
    /// LazyVGrid inside a lazy section: until that section has been built there
    /// is no view with the chip's id, and `scrollTo` on a missing id silently
    /// does nothing. The book rows are `ForEach` identities in the outer stack,
    /// so they can be reached cold — scrolling to the book first forces its
    /// chapters to exist, and only then can the chip be targeted.
    private func revealCurrentChapter(_ proxy: ScrollViewProxy) async {
        proxy.scrollTo(book, anchor: .top)
        await Task.yield()
        try? await Task.sleep(for: .milliseconds(120))
        proxy.scrollTo(chipID(book, chapter), anchor: UnitPoint(x: 0.5, y: 0.33))
    }
}
