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
    /// the topic's first id rather than the first row of shorts.json — then
    /// deals that topic into an order, so it is not the same card every launch.
    ///
    /// A fixed set is NOT dealt, which the web is deliberate about: "a
    /// collection keeps the order it arrived in — the Library's saved list
    /// belongs to the reader, and reshuffling it would lose the place they put
    /// things in. Only the topic feed is dealt."
    private var posts: [Post] {
        fixedSet ? allPosts : Self.spread(TopicStore.dealt(topic.posts(from: allPosts)))
    }

    /// The dealt order, reworked so two films of the same passage never play
    /// back to back -- the web's spread() in Feed.tsx, step for step. At each
    /// pick: if one passage holds more than half of what is left, it must go
    /// now or it can't be kept apart later; otherwise the first film whose
    /// passage differs from the last. With nine films over four passages
    /// (3/3/2/1) a repeat never has to happen.
    static func spread(_ items: [Post]) -> [Post] {
        var left = items, out: [Post] = [], last: String?
        while !left.isEmpty {
            var counts: [String: Int] = [:]
            for p in left { counts[p.passage, default: 0] += 1 }
            var pick: Int?
            for p in left where p.passage != last && counts[p.passage]! * 2 > left.count {
                pick = left.firstIndex { $0.passage == p.passage }
                break
            }
            if pick == nil { pick = left.firstIndex { $0.passage != last } }
            let it = left.remove(at: pick ?? 0)
            out.append(it)
            last = it.passage
        }
        return out
    }

    /// The card whose cover the ambience is drawn from.
    private var activePost: Post? { posts.first { $0.id == activeID } }

    /// The card peeking below the current one.
    private var nextID: Int? {
        guard let activeID, let i = posts.firstIndex(where: { $0.id == activeID }) else { return nil }
        return posts.indices.contains(i + 1) ? posts[i + 1].id : nil
    }

    /// A card is its film's shape -- the screen's width, and the height that
    /// gives the film at that width -- unless that won't fit above the tab
    /// bar with a gap under it. Then the card stands as tall as there is room
    /// for, and FeedCardView crops the film around its burned-in words. On a
    /// 17 Pro the whole 9:16 film fits; on a short iPhone (SE, mini) it does
    /// not, and the bar would otherwise sit on the captions.
    private func cardHeight(_ post: Post, width: CGFloat, room: CGFloat) -> CGFloat {
        min(width * CGFloat(post.aspect ?? 16.0 / 9.0), max(room, 320))
    }

    var body: some View {
        GeometryReader { geo in
            // The scroll view runs edge to edge, so its height is the screen's.
            let viewport = geo.size.height + geo.safeAreaInsets.top + geo.safeAreaInsets.bottom
            // From the top of the screen to the top of the tab bar, less the gap.
            let room = geo.safeAreaInsets.top + geo.size.height - DF.filmGap
            let lastHeight = posts.last.map { cardHeight($0, width: geo.size.width, room: room) } ?? 0

            ScrollView(.vertical) {
                LazyVStack(spacing: DF.filmGap) {
                    ForEach(posts) { post in
                        FeedCardView(
                            post: post,
                            isActive: activeID == post.id,
                            // The card jutting out below is on screen, so it
                            // plays too. Deliberately just ONE ahead: the
                            // parallax failures came from every realized card
                            // holding a looper, and a looper enqueues several
                            // items each. Two cards is ~6 video items; five was
                            // ~15, which is where iOS starts dropping them
                            // silently.
                            playsLoop: activeID == post.id || post.id == nextID
                        )
                            .frame(height: cardHeight(post, width: geo.size.width, room: room))
                            .id(post.id)
                    }
                }
                .scrollTargetLayout()
                // Room under the last card for its top to reach the top of
                // the screen, so it snaps like the rest.
                .padding(.bottom, max(DF.cardInsetBottom, viewport - lastHeight))
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
            .background { FeedAmbience(post: activePost) }
            .overlay(alignment: .top) {
                // Parked with the topics: there is one feed and it has no
                // name to show. A collection still titles itself, which is why
                // this is the topic switcher going and not the whole overlay.
                if !fixedSet && TopicStore.enabled {
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

/// The web's stand-in for its Apple Music ambience, ported as the thing itself.
///
/// FeedAmbience.tsx runs a Pixi scene on the desktop -- four rotating copies of
/// the cover, a twist filter, Kawase blur, saturation 2.75 -- and until that has
/// drawn, "a CSS stand-in holds the ground: the cover itself, which the browser
/// already has for the card, at 1.25x, blurred and saturated to the same
/// recipe." This is that stand-in: blur 60, saturate 2.75, at 1.25x, from the
/// artwork the card already decoded. The swirl is not ported.
///
/// On the phone the card fills the screen, so the ambience shows in the gap
/// between cards, the strip under the next card's peek, and -- the part that
/// earns it -- through the tab bar's glass, which picks up the cover's colour
/// the way Apple Music's does.
///
/// 1.25x is the web's number and it is not decoration: a blur samples past its
/// edges, so at 1x the rim would fade to transparent over black. Overscanning
/// keeps that fringe off screen, and `opaque: true` tells the blur the layer
/// has no transparent edge to fade into, which closes the last few points.
///
/// "The turn lands with the page": the web fades the new cover in over the old
/// rather than swapping, so the ground never jumps. Keying on the post id makes
/// the change a transition between two images instead of a mutation of one.
private struct FeedAmbience: View {
    let post: Post?

    var body: some View {
        ZStack {
            DF.ground
            if let post, let ui = ArtworkCache.image(post.artworkURL) {
                Image(uiImage: ui)
                    .resizable()
                    .scaledToFill()
                    .scaleEffect(1.25)
                    .blur(radius: 60, opaque: true)
                    .saturation(2.75)
                    .id(post.id)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.5), value: post?.id)
        .clipped()
        .ignoresSafeArea()
    }
}
