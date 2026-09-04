import SwiftUI

/// The topic label and its picker, centred over the top of the feed.
///
/// The web header is a button that opens a list; natively that is a Menu, which
/// gets the platform's own presentation and dismissal for free.
struct FeedHeaderView: View {
    @Binding var topic: Topic
    let topics: [Topic]

    var body: some View {
        Menu {
            Picker("Topic", selection: $topic) {
                ForEach(topics) { t in
                    Text(t.label).tag(t)
                }
            }
        } label: {
            HStack(spacing: 6) {
                // The sentence the desktop header already uses. topics.ts is
                // explicit that it only reads one way round — "you deal with a
                // difficulty, never with its remedy" — which is why every label
                // is the trouble the reader brings rather than the remedy.
                // Muted so the topic stays the thing you read.
                Text("Deal with")
                    .font(.system(size: 24, weight: .regular))
                    .foregroundStyle(DF.inkDim)
                Text(topic.label)
                    // "text-[24px] font-semibold leading-[29px]"
                    .font(.system(size: 24, weight: .semibold))
                Image("Chevron")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    // ChevronIcon size={25}, as the web header renders it. The
                    // glyph occupies only the middle of its 25pt box, so this
                    // reads smaller than the number suggests — 15 made it a dot.
                    .frame(width: 25, height: 25)
            }
            .foregroundStyle(DF.ink)
            .shadow(color: .black.opacity(0.55), radius: 10, y: 2)
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
    }
}
