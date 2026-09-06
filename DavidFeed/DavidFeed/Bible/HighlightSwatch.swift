import SwiftUI

/// How a selected swatch is marked. The two places this control appears mean
/// different things by "selected", so they mark it differently.
enum HighlightSwatchStyle: Equatable {
    /// A cancel mark inside the circle. The verse action bar, where a swatch
    /// APPLIES a colour and the marked one is the colour on the verse: the mark
    /// is an offer to take it off again. Drawn in #0E0E0E per the web's note —
    /// "every swatch is a bright pastel and a white cross would disappear into
    /// the yellow."
    case cancel
    /// A white rim on the colour. The Library's filter, where nothing is being
    /// removed and the mark only says which colour the list is narrowed to.
    case stroke
}

/// One highlight colour.
struct HighlightSwatch: View {
    let hex: String
    let isOn: Bool
    var style: HighlightSwatchStyle = .cancel
    let action: () -> Void

    static let size: CGFloat = 28.7

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(Color(hex: hex))
                .frame(width: Self.size, height: Self.size)
                .overlay {
                    if isOn {
                        switch style {
                        case .cancel:
                            Image("HighlightCancel")
                                .renderingMode(.template)
                                .resizable().scaledToFit()
                                .frame(width: 12, height: 12)
                                .foregroundStyle(DF.surface)
                        case .stroke:
                            // strokeBorder draws INSIDE the circle's bounds, so
                            // the rim cannot grow the swatch or eat into the
                            // gap the row computes between them.
                            Circle().strokeBorder(.white, lineWidth: 2.5)
                        }
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
    var style: HighlightSwatchStyle = .cancel
    let onSelect: (String?) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(AppState.highlightColours.enumerated()), id: \.offset) { _, hex in
                HighlightSwatch(hex: hex, isOn: selected == hex, style: style) {
                    // Tapping the marked swatch clears it in cancel style,
                    // where the mark is itself the offer to clear. In stroke
                    // style the selection is sticky: a rim advertises no such
                    // affordance, so clearing on tap would be a state the
                    // reader could reach only by accident.
                    if style == .cancel && selected == hex {
                        onSelect(nil)
                    } else {
                        onSelect(hex)
                    }
                }
                if hex != AppState.highlightColours.last { Spacer(minLength: 0) }
            }
        }
    }
}
