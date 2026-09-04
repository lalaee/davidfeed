import SwiftUI

/// One highlight colour.
///
/// Selected state is a cancel mark drawn INSIDE the circle, not a rim. The web
/// note is explicit about the colour of that mark: "#0E0E0E is the design's own
/// stroke colour, and it has to be dark: every swatch is a bright pastel and a
/// white cross would disappear into the yellow."
///
/// The same control serves the verse action bar and the Library's colour filter
/// — "the same cancel mark as the action bar's swatches: there it claimed a
/// colour was applied, here it says the list is filtered to it" — so tapping the
/// active one clears in both places.
struct HighlightSwatch: View {
    let hex: String
    let isOn: Bool
    let action: () -> Void

    static let size: CGFloat = 28.7

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(Color(hex: hex))
                .frame(width: Self.size, height: Self.size)
                .overlay {
                    if isOn {
                        Image("HighlightCancel")
                            .renderingMode(.template)
                            .resizable().scaledToFit()
                            .frame(width: 12, height: 12)
                            .foregroundStyle(DF.surface)
                    }
                }
        }
        .buttonStyle(.plain)
    }
}

/// The four swatches in a fixed-width group laid out space-between, so the gap
/// between them is computed rather than stated. Shared by the action bar (148
/// wide, padded 8, on #212121 at radius 14) and the Library filter (spanning
/// the bar, on #212121 at radius 30).
struct HighlightSwatchRow: View {
    let selected: String?
    let onSelect: (String?) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(AppState.highlightColours.enumerated()), id: \.offset) { _, hex in
                HighlightSwatch(hex: hex, isOn: selected == hex) {
                    onSelect(selected == hex ? nil : hex)
                }
                if hex != AppState.highlightColours.last { Spacer(minLength: 0) }
            }
        }
    }
}
