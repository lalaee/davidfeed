import SwiftUI

/// A demo vendored from a repository that ships source files but no runnable app.
struct Demo: Identifiable {
    let id = UUID()
    let title: String
    let note: String
    let file: String
    let make: () -> AnyView

    init(_ title: String, _ note: String, file: String, @ViewBuilder make: @escaping () -> some View) {
        self.title = title
        self.note = note
        self.file = file
        self.make = { AnyView(make()) }
    }
}

struct Source: Identifiable {
    let id = UUID()
    let repo: String
    let url: String
    let why: String
    let demos: [Demo]
}

enum Catalog {
    static let sources: [Source] = [
        Source(
            repo: "GetStream/awesome-liquid-glass",
            url: "github.com/GetStream/awesome-liquid-glass",
            why: "Ships loose .swift files and GIF previews — no Xcode project anywhere in the repo.",
            demos: [
                Demo("Jello Slider", "Glass that squashes and springs back as you drag.",
                     file: "LiquidGlassJello.swift") { LiquidGlassJello() },
                Demo("Glass Tab Bar", "Squash-and-stretch selection between tabs.",
                     file: "LiquidGlassTabBar.swift") { LiquidGlassTabBar() },
                Demo("Glass Menu", "Menu items that fuse into and out of one glass surface.",
                     file: "LiquidGlassMenu.swift") { LiquidGlassMenu() },
                Demo("Horizontal Container", "GlassEffectContainer across differing surfaces.",
                     file: "LiquidGlassHContainer.swift") { LiquidGlassHContainer() },
                Demo("Overlapping Glass", "Rounded floating panels that overlap and refract.",
                     file: "LiquidGlassRoundedFloating.swift") { LiquidGlassRoundedFloating() },
                Demo("Custom Floating Button", "Hand-tuned glass on a FAB.",
                     file: "CustomGlassEffect.swift") { CustomGlassEffect() },
                Demo("Play Button Swap", "Glass held across a view swap.",
                     file: "LiquidGlassPlayButton.swift") { LiquidGlassPlayButton() },
                Demo("Toolbar Items", "Glass applied to toolbar content.",
                     file: "LiquidGlassToolbarItems.swift") { LiquidGlassToolbarItems() },
            ]
        ),
        Source(
            repo: "amosgyamfi/swiftui_tutorial_projects",
            url: "github.com/amosgyamfi/swiftui_tutorial_projects",
            why: "A Gist/ folder of standalone files referenced from the open-swiftui-animations README.",
            demos: [
                Demo("GlassEffectContainer Morph", "Two glass buttons fusing under a PhaseAnimator.",
                     file: "LiquidGlassEffectContainer.swift") { LiquidGlassEffectContainer() },
                Demo("Phase Animator", "The same morph, driven through explicit animation phases.",
                     file: "LiquidGlassPhaseAnimator.swift") { LiquidGlassPhaseAnimatorDemo() },
                Demo("Clear Mode", "glassEffect(.clear) over a photographic background.",
                     file: "LiquidGlassEffectClearMode.swift") { LiquidGlassEffectClearMode() },
                Demo("Text Gradient Styles", "Gradient and shader fills on live text.",
                     file: "TextGradientStyles.swift") { TextGradientStyles() },
            ]
        ),
    ]

    static var count: Int { sources.reduce(0) { $0 + $1.demos.count } }
}

struct DemoBrowser: View {
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(Catalog.count) demos from \(Catalog.sources.count) repositories that ship source but no app of their own.")
                            .font(.subheadline)
                        Text("Each screen below is the upstream file, unmodified, given somewhere to run.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                ForEach(Catalog.sources) { source in
                    Section {
                        ForEach(source.demos) { demo in
                            NavigationLink {
                                demo.make()
                                    .navigationTitle(demo.title)
                                    .navigationBarTitleDisplayMode(.inline)
                            } label: {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(demo.title)
                                    Text(demo.note)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text(demo.file)
                                        .font(.caption2.monospaced())
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.vertical, 2)
                            }
                        }
                    } header: {
                        Text(source.repo)
                    } footer: {
                        Text(source.why)
                    }
                }
            }
            .navigationTitle("Deck Host")
        }
    }
}

#Preview {
    DemoBrowser()
}
