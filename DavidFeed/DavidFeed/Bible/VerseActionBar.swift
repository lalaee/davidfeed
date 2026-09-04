import SwiftUI

extension Color {
    /// "#F19AEA" -> Color. The design's swatches are stated as hex, so they are
    /// carried across as hex rather than re-eyeballed into RGB.
    init(hex: String) {
        var s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        let v = UInt64(s, radix: 16) ?? 0
        self.init(
            red: Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8) & 0xFF) / 255,
            blue: Double(v & 0xFF) / 255
        )
    }
}

/// The bar that appears when a verse is selected.
///
/// From davidfeed's VerseActionBar (Figma "Contextual-highlight" 2649:2528,
/// frame 36982). It is CONTEXTUAL — it floats below the verse you tapped and
/// overlaps the verses beneath it rather than sitting in a fixed slot — and it
/// SCROLLS, because the groups measure wider than the bar: the design clips
/// Save at the frame edge on purpose.
///
///   bar        78 tall, radius 22, fill #0E0E0E, 12 padding
///   groups     54 tall, radius 14, fill #212121, 8 apart
///   swatches   4 circles 28.7 across, in a fixed 148x54 group padded 8 and
///              space-between — which computes the 5.73 gap; not hard-coded
///   action     column, 8/12 padding, 20x20 icon, 4 gap, hugging its label
///   label      Inter 400, 11.9048, 2% tracking — the nav's own label style
struct VerseActionBar: View {
    let highlight: String?
    let isSaved: Bool
    /// Handed straight to the system share sheet — see BibleView.shareText.
    let shareItem: String
    /// So the compare sheet can morph out of the Compare button, the way iOS 26
    /// morphs a sheet from the control that presents it.
    let zoomNamespace: Namespace.ID
    let onHighlight: (String?) -> Void
    let onCompare: () -> Void
    let onSave: () -> Void

    private let barHeight: CGFloat = 78
    private let groupHeight: CGFloat = 54
    private let swatchGroupWidth: CGFloat = 148

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                swatches
                action("Compare", icon: "Compare", run: onCompare)
                    .matchedTransitionSource(id: "compare", in: zoomNamespace)
                ShareLink(item: shareItem) { actionLabel("Share", icon: "Send") }
                    .buttonStyle(.plain)
                action("Save", icon: isSaved ? "BookmarkActive" : "BookmarkInactive",
                       run: onSave)
            }
            .padding(12)
        }
        .scrollIndicators(.hidden)
        .frame(height: barHeight)
        .background(DF.surface, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    /// A fixed 148-wide group, padded 8, laid out space-between. The 5.73 gap
    /// between swatches is what that computes to — stating it directly would
    /// break the moment a colour is added or removed.
    private var swatches: some View {
        HighlightSwatchRow(selected: highlight, onSelect: onHighlight)
        .padding(8)
        .frame(width: swatchGroupWidth, height: groupHeight)
        .background(DF.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func action(_ label: String, icon: String,
                        run: @escaping () -> Void) -> some View {
        Button(action: run) { actionLabel(label, icon: icon) }
            .buttonStyle(.plain)
    }

    /// Shared so the ShareLink row is identical to the buttons beside it.
    private func actionLabel(_ label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(icon)
                .renderingMode(.template)
                .resizable().scaledToFit()
                .frame(width: 20, height: 20)
            Text(label)
                .font(.system(size: 11.9048))
                .tracking(11.9048 * 0.02)   // "2% tracking"
        }
        .foregroundStyle(DF.ink)
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .frame(height: groupHeight)
        .background(DF.surfaceRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

/// So `.sheet(item:)` can carry a verse number.
extension Int: @retroactive Identifiable {
    public var id: Int { self }
}
