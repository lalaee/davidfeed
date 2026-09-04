import SwiftUI

/// The verse compared across translations.
///
/// From davidfeed's CompareSheet (Figma "Bible" 2646:2163, frame 36942):
///
///   card       333x444, radius 18.8333, fill #0E0E0E, padding 24/16, gap 32
///   header     48 tall (a minimum), gap 10: a 48x48 close circle, the
///              reference, then a hugging "Versions" button
///   buttons    #212121, fully round, 6/20 padding, 4 gap, 20x20 icon
///   reference  Semi Bold 17/150%
///   label      Medium 15, #999999
///   verse      Regular 18/150%, #FFFFFF
///
/// "It is a floating CARD, not a bottom sheet: all four corners are rounded and
/// it stops 21px short of each edge." On iOS 26 that is what a partial-height
/// detent already gives, so the card is the sheet's own inset glass rather than
/// a #0E0E0E rectangle drawn inside a full-width one — the same reasoning as
/// BooksSheet, and the same two rules: a partial detent, and no
/// presentationBackground.
///
/// The body scrolls: "A multi-verse selection can outgrow the design's fixed
/// 444, so the body scrolls rather than the card growing off screen."
struct CompareSheet: View {
    let reference: String
    let book: String
    let chapter: Int
    let verse: Int

    @Environment(\.dismiss) private var dismiss
    private var store: BibleStore { .shared }

    var body: some View {
        VStack(alignment: .leading, spacing: 32) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    ForEach(BibleStore.translations) { t in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(t.label)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color(red: 0.6, green: 0.6, blue: 0.6))
                            Text(text(in: t.id))
                                .font(.system(size: 18))
                                .foregroundStyle(DF.ink)
                                .lineSpacing(9)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .scrollIndicators(.hidden)
        }
        .padding(.top, 24)
        .presentationDetents([.height(444), .large])
        .presentationDragIndicator(.hidden)
    }

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

            Text(reference)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(DF.ink)

            Spacer(minLength: 0)

            // "#212121, fully round, 6/20 padding, 4 gap, 20x20 icon"
            HStack(spacing: 4) {
                Image("Versions")
                    .renderingMode(.template)
                    .resizable().scaledToFit()
                    .frame(width: 20, height: 20)
                Text("Versions")
                    .font(.system(size: 15, weight: .medium))
            }
            .foregroundStyle(DF.ink)
            .padding(.vertical, 6)
            .padding(.horizontal, 20)
            .background(DF.surfaceRaised, in: Capsule())
        }
        .frame(minHeight: 48)
        .padding(.horizontal, 16)
    }

    /// The verse the reader selected, in one translation. Reads through the
    /// shared store without disturbing the translation the reader is on.
    private func text(in translation: String) -> String {
        let verses = store.verses(book: book, chapter: chapter, translation: translation)
        return verse >= 1 && verse <= verses.count ? verses[verse - 1] : "—"
    }
}
