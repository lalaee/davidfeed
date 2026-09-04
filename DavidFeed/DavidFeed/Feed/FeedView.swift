import SwiftUI

/// The vertical feed.
///
/// The web app builds this with CSS scroll-snap over a scroll container. The
/// native equivalent is a paging ScrollView with `.scrollTargetBehavior(.paging)`
/// — but paging snaps to the *viewport*, and these cards are shorter than the
/// viewport by design (100dvh - 138, so the next card's edge shows). So the
/// snapping is driven by `.scrollTargetLayout()` on the stack with view-aligned
/// targets, which snaps to each card's own frame instead.
struct FeedView: View {
    let allPosts: [Post]
    /// A fixed set plays as-is: no topic header, no reordering. The Library
    /// opens the saved cards this way — "not the home feed, whose topic filter
    /// would drop the very cards you saved".
    var fixedSet = false
    var startAt: Int? = nil

    @Environment(AppState.self) private var app
    @State private var topic: Topic = TopicStore.initial
        ?? Topic(id: "all", label: "Anything", ids: nil)
    @State private var activeID: Int?

    /// The web feed opens on a topic and reorders to it, so the first card is
    /// the topic's first id rather than the first row of shorts.json.
    private var posts: [Post] { fixedSet ? allPosts : topic.posts(from: allPosts) }

    var body: some View {
        GeometryReader { geo in
            // Captured before the scroll view ignores the safe area, so the
            // header can still clear the status bar.
            let topInset = geo.safeAreaInsets.top
            let full = geo.size.height + topInset
            let cardHeight = max(320, full - DF.cardInsetBottom)

            ScrollView(.vertical) {
                LazyVStack(spacing: DF.cardGap) {
                    ForEach(posts) { post in
                        FeedCardView(post: post, isActive: activeID == post.id)
                            .frame(height: cardHeight)
                            .id(post.id)
                    }
                }
                .scrollTargetLayout()
                .padding(.bottom, DF.cardInsetBottom)
            }
            // One card per gesture, and no flinging past one. Plain
            // `.viewAligned` snaps to card edges but lets momentum carry across
            // several, which is what made this read as a carousel rather than a
            // reel. `limitBehavior: .alwaysByOne` is the counterpart of the web
            // card's `snap-always` (scroll-snap-stop: always) on a
            // `snap-mandatory` container: the scroll stops at every card whether
            // the flick was gentle or hard.
            .scrollTargetBehavior(.viewAligned(limitBehavior: .alwaysByOne))
            // No anchor: with one, the binding writes back after every settle
            // and re-scrolls to its own idea of "top", which lands offset from
            // where viewAligned just snapped and leaves the previous card
            // showing above. Let the snap own alignment; this only reports which
            // card is current, which is all the playback needs.
            .scrollPosition(id: $activeID)
            // The stack is laid out from the very top of the screen (the card
            // runs under the status bar, as the web card does), but the scroll
            // view still applies a safe-area content margin, so a snapped card
            // came to rest ~59pt down and the PREVIOUS card stayed visible in
            // the strip above it. Zeroing the margin makes a snapped card's top
            // edge the container's top edge, which is what snap-start means.
            // The feed runs edge to edge, as the web card does. Without this the
            // scroll view's frame starts below the status bar while its content
            // still draws to the screen edge, so a snapped card came to rest 59pt
            // down and the PREVIOUS card filled the strip above it. Ignoring the
            // safe area makes a snapped card's top the screen's top, and the only
            // neighbour on screen is the next card peeking at the bottom.
            .ignoresSafeArea()
            .scrollIndicators(.hidden)
            .background(DF.ground)
            .overlay(alignment: .top) {
                if !fixedSet {
                    FeedHeaderView(topic: $topic, topics: TopicStore.all)
                        // FeedHeader.tsx puts this at max(safe-area-top, 45) - 1.
                        // The overlay's origin is ALREADY the safe-area top, so
                        // adding that number again pushed it a full inset too far
                        // down — it was landing at ~141 instead of ~61.
                        .padding(.top, 0)
                }
            }
            .onAppear {
                if activeID == nil { activeID = startAt ?? posts.first?.id }
                Playback.shared.setQueue(posts)
            }
            // Kept current rather than captured once. The previous version set a
            // closure at onAppear that closed over `activeID` and `posts` as they
            // were THEN — a view struct is a value, so those never updated, and
            // next/previous from the lock screen always stepped from the card the
            // feed happened to open on.
            .onChange(of: posts.map(\.id)) { Playback.shared.setQueue(posts) }
            // The lock screen moved the track; bring the feed to it.
            .onChange(of: Playback.shared.scrollTarget) { _, target in
                guard let target else { return }
                withAnimation { activeID = target }
                Playback.shared.clearScrollTarget()
            }
            .onChange(of: topic) {
                // A new topic is a new feed: start it at the top.
                activeID = posts.first?.id
            }
        }
    }
}
