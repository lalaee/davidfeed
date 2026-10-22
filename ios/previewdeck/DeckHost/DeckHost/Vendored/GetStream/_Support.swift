import SwiftUI

// LiquidGlassTabBar.swift references a `Server` model that isn't in the upstream
// repository — it was lifted out of GetStream's own project. This is the smallest
// definition that satisfies it, so the file can compile and run unmodified.
struct Server: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let isDefault: Bool
}

// LiquidGlassJello.swift declares `SliderControls` but calls `MyControls` — the type
// was renamed upstream without updating the call sites. Aliasing rather than editing
// keeps the vendored file byte-identical to the repository.
typealias MyControls = SliderControls
