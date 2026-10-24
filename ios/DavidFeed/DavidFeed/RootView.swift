import SwiftUI

/// Home / Bible / You.
///
/// The web app hand-builds this bar — a 281x75 black pill with one capsule that
/// glides to the selected tab, reproducing "the iOS 26 tab bar's one moving
/// capsule" (its own words, in BottomNav.tsx). Natively that is just `TabView`:
/// iOS 26 draws the Liquid Glass bar and the gliding selection for free. So the
/// port drops ~240 lines of measured CSS and gains the real thing.
struct RootView: View {
    /// Named Screen, not Tab: SwiftUI's own `Tab` is the builder used below,
    /// and shadowing it makes the TabView content fail to construct.
    enum Screen: Hashable { case home, bible, you }
    @State private var screen: Screen = .home
    @Environment(\.scenePhase) private var scenePhase
    /// Where the system drew the tab bar's capsule, for the reflector.
    @State private var bar: TabBarPlatterProbe.Bar?

    private var statusBarDark: Bool {
        screen == .home && ReflectionSampler.shared.topIsLight
    }

    var body: some View {
        TabView(selection: $screen) {
            Tab(value: Screen.home) {
                FeedView(allPosts: PostStore.shorts)
                    .environment(\.feedOnScreen, screen == .home)
            } label: {
                navLabel("Home", icon: "NavHome", on: screen == .home)
            }
            Tab(value: Screen.bible) {
                BibleView()
            } label: {
                navLabel("Bible", icon: "NavBible", on: screen == .bible)
            }
            // You: the account, and the Library inside it (Saved), as on the web.
            Tab(value: Screen.you) {
                YouView()
            } label: {
                navLabel("You", icon: "NavYou", on: screen == .you)
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
        // Opening the Bible FROM the feed lands on the chapter the card is
        // quoting, so "Psalm 27:1" on screen becomes Psalms 27 in the reader.
        // Only from the feed: arriving from the Library, or back from a sheet,
        // should leave the reader where it was.
        // The lock screen and Control Center show the film paused, not playing,
        // while another tab is in front.
        .onChange(of: screen, initial: true) { _, current in
            Playback.shared.setFeedOnScreen(current == .home)
        }
        .onChange(of: screen) { previous, current in
            guard current == .bible, previous == .home,
                  let post = Playback.shared.currentPost
            else { return }
            BibleStore.shared.open(title: post.title)
        }
        // The clock and battery go dark over a film whose top is light (the
        // woodcuts' paper, the watercolour's sky), and back to white over a
        // dark one. Read off the playing frames, so it follows the film.
        .onChange(of: statusBarDark, initial: true) { _, dark in
            StatusBar.set(dark: dark)
        }
        .onAppear { ScreenshotMode.apply() }
        // Raised by a save or highlight made signed out; closing it drops what
        // was held.
        .sheet(isPresented: Binding(get: { Account.shared.sheetShown },
                                    set: { if !$0 { Account.shared.dismissSheet() } })) {
            SignInSheet()
        }
        // Back in front: pull the Library, or push a save made offline.
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await Account.shared.foreground() } }
        }
        .tabBarNeverMinimizes()
        .tint(DF.ink)
        .background(DF.ground)
        .background(TabBarPlatterProbe { bar = $0 })
        // The bar's top edge reflecting the card above it. Only on the feed:
        // the Bible and Library have no media above the bar to reflect.
        .overlay {
            TabBarReflector(bar: bar, post: Playback.shared.currentPost, visible: screen == .home)
        }
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
