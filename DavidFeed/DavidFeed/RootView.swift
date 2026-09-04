import SwiftUI

/// Home / Bible / Library.
///
/// The web app hand-builds this bar — a 281x75 black pill with one capsule that
/// glides to the selected tab, reproducing "the iOS 26 tab bar's one moving
/// capsule" (its own words, in BottomNav.tsx). Natively that is just `TabView`:
/// iOS 26 draws the Liquid Glass bar and the gliding selection for free. So the
/// port drops ~240 lines of measured CSS and gains the real thing.
struct RootView: View {
    /// Named Screen, not Tab: SwiftUI's own `Tab` is the builder used below,
    /// and shadowing it makes the TabView content fail to construct.
    enum Screen: Hashable { case home, bible, library }
    @State private var screen: Screen = .home

    var body: some View {
        TabView(selection: $screen) {
            Tab(value: Screen.home) {
                FeedView(allPosts: PostStore.shorts)
            } label: {
                navLabel("Home", icon: "NavHome", on: screen == .home)
            }
            Tab(value: Screen.bible) {
                BibleView()
            } label: {
                navLabel("Bible", icon: "NavBible", on: screen == .bible)
            }
            Tab(value: Screen.library) {
                LibraryView()
            } label: {
                navLabel("Library", icon: "NavLibrary", on: screen == .library)
            }
        }
        // The tab bar shrinks to a pill as you scroll down and comes back as you
        // scroll up. davidfeed reimplements this in useScrolledDown.ts, whose
        // own comment gives the game away — its 24px hysteresis and 40px
        // dead zone are "carried over from the minimize-on-scroll build", chosen
        // to match "where iOS itself keeps it expanded". Natively it is one line,
        // and the thresholds are the system's rather than a copy of them.
        // TabBarMinimizeBehavior offers only .automatic / .never / .onScrollDown
        // / .onScrollUp. Its "minimize" IS the collapse to a single active-tab
        // pill -- there is no scale-down variant, and the system bar's transform
        // is not exposed, so the web's `scale` on [data-bottom-nav][data-scrolled]
        // has no native counterpart short of replacing the bar entirely (which
        // would cost the Liquid Glass and the gliding selector). Collapsing is
        // off; the bar now stays put.
        .tabBarMinimizeBehavior(.never)
        .tint(DF.ink)
        .background(DF.ground)
    }

    /// davidfeed draws its own nav glyphs, with a distinct filled variant for the
    /// selected tab. These are those exact components, rendered out of
    /// src/components/icons.tsx rather than redrawn.
    private func navLabel(_ title: String, icon: String, on: Bool) -> some View {
        Label {
            Text(title)
        } icon: {
            Image(on ? icon + "Active" : icon + "Inactive")
                .renderingMode(.template)
        }
    }
}
