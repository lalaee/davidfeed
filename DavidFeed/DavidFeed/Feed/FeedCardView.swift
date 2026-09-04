import SwiftUI

/// One card in the feed: artwork under a parallax loop, the narration's caption
/// as it is spoken, the verse reference, and the save/share rail.
struct FeedCardView: View {
    let post: Post
    /// The focused card: it owns the narration, the caption and the badge.
    let isActive: Bool
    /// Whether this card's parallax runs. Wider than `isActive` — the card
    /// peeking below is visible, so it animates too — but deliberately narrow,
    /// because every extra looper is several more video items competing for a
    /// limited number of decoders.
    let playsLoop: Bool

    @Environment(AppState.self) private var app
    /// Not @State: a player owned by a view dies with the view, which is what
    /// stopped audio the moment the app left the foreground. Playback outlives
    /// every card; this one only says which post is current.
    private var playback: Playback { .shared }
    @State private var hearts: [Heart] = []
    @State private var showSavedPop = false

    private struct Heart: Identifiable {
        let id = UUID()
        let point: CGPoint
        let angle: Double
    }


    var body: some View {
        GeometryReader { geo in
            ZStack {
                // The tap gestures live HERE, on the artwork, not on the whole
                // card. With them on the outer ZStack -- under a
                // contentShape(Rectangle()) and a double-tap that has to
                // disambiguate against a single tap -- the rail's buttons never
                // saw their taps at all. Anything above this layer in the stack
                // is now hit-tested before it.
                artwork(size: geo.size)
                    .overlay { Color.clear.bottomScrim(geo.size.height * 0.42) }
                    .contentShape(Rectangle())
                    .onTapGesture(count: 2) { location in like(at: location) }
                    // Toggles the PLAYER, not a separate flag. app.soundOn was a
                    // second source of truth: pressing play on the lock screen
                    // started audio without touching it, so the card went on
                    // saying "Tap for sound" over playing narration.
                    .onTapGesture { playback.toggle() }

                // Its own view, deliberately. Reading playback.time from THIS
                // body made the whole card — artwork included — re-evaluate on
                // every tick. Scoped here, only the caption redraws.
                //
                // And only for the visible card: every realized card that reads
                // the playhead re-renders 20 times a second, whether or not it
                // has a caption to show.
                if isActive { CaptionLayer(post: post) }
                bottomBar
                soundBadge

                ForEach(hearts) { heart in
                    HeartBurst(angle: heart.angle)
                        .position(heart.point)
                        .allowsHitTesting(false)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .clipShape(RoundedRectangle(cornerRadius: DF.cardRadius, style: .continuous))
        }
        .task(id: isActive) { syncPlayback() }
    }

    // MARK: pieces

    @ViewBuilder
    private func artwork(size: CGSize) -> some View {
        ZStack {
            if let ui = ArtworkCache.image(post.artworkURL) {
                Image(uiImage: ui)
                    .resizable()
                    .scaledToFill()
            } else {
                DF.surface
            }
            // ONLY the visible card builds a player. Previously every realized
            // card built one and merely paused it, and AVPlayerLooper enqueues
            // several copies of its item to loop seamlessly — so a handful of
            // lazily-realized cards meant a dozen-plus video items alive at once.
            // iOS caps simultaneous decoders, and past the cap players fail
            // silently rather than erroring: that is the parallax that "sometimes
            // doesn't play". The still underneath means nothing flashes black
            // while the loop for a newly-focused card spins up.
            if playsLoop, let loop = post.loopURL {
                LoopPlayerView(url: loop, isPlaying: true)
            }
        }
        .frame(width: size.width, height: size.height)
        .clipped()
    }

    private var bottomBar: some View {
        VStack {
            Spacer()
            HStack(alignment: .bottom) {
                Text(post.title)
                    .font(.system(size: 24, weight: .semibold))
                    .tracking(-0.48)
                    .foregroundStyle(DF.ink)
                    .shadow(color: .black.opacity(0.5), radius: 10, y: 2)
                Spacer(minLength: 16)
                VStack(spacing: 32) {
                    // davidfeed shares the card's VIDEO FILE and nothing else —
                    // shareVideo.ts: "The file goes ALONE, with no text or url
                    // beside it." So this hands the bundled mp4 to the system
                    // sheet rather than a caption or a link.
                    if let clip = post.loopURL {
                        ShareLink(item: clip) {
                            RailIcon(asset: "Send", tint: DF.ink)
                        }
                        .buttonStyle(.plain)
                    }
                    RailButton(
                        asset: app.isSaved(post) ? "BookmarkActive" : "BookmarkInactive",
                        tint: app.isSaved(post) ? Color(hex: "#EAC72C") : DF.ink
                    ) {
                        app.toggleSaved(post)
                        withAnimation(.snappy) { showSavedPop = app.isSaved(post) }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
    }

    @ViewBuilder
    private var soundBadge: some View {
        if !playback.isPlaying && isActive {
            Label {
                Text("Tap for sound")
            } icon: {
                Image("AudioOff")
                    .renderingMode(.template)
                    .resizable().scaledToFit().frame(width: 17, height: 17)
            }
                .font(DF.label())
                .foregroundStyle(DF.ink)
                .padding(.horizontal, 18)
                .padding(.vertical, 12)
                .glassEffect(.regular, in: .capsule)
                .allowsHitTesting(false)
                .transition(.opacity.combined(with: .scale(scale: 0.9)))
        }
    }

    // MARK: behaviour

    /// Only the card in view drives the player; the others say nothing, so
    /// scrolling past a card never tears down what is playing.
    private func syncPlayback() {
        guard isActive else { return }
        playback.activate(post)
    }

    private func like(at point: CGPoint) {
        if !app.isSaved(post) { app.toggleSaved(post) }
        let heart = Heart(point: point, angle: Double.random(in: -22...22))
        hearts.append(heart)
        Task {
            try? await Task.sleep(for: .milliseconds(900))
            hearts.removeAll { $0.id == heart.id }
        }
    }
}

/// The spoken line, as it is spoken.
///
/// Separate from FeedCardView on purpose: it is the only thing that depends on
/// the playhead, and SwiftUI invalidates a view when what it READ changes. Kept
/// in the card's body, a 20Hz time signal redrew the artwork, the rail and the
/// scrim along with it.
private struct CaptionLayer: View {
    let post: Post
    private var playback: Playback { .shared }

    var body: some View {
        if let caption = playback.caption(for: post) {
            VStack {
                Spacer()
                Text(caption.text)
                    .font(DF.caption())
                    .foregroundStyle(DF.ink)
                    .multilineTextAlignment(.center)
                    .shadow(color: .black.opacity(0.6), radius: 8, y: 2)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 150)
                    .transition(.opacity)
                    .id(caption.id)
            }
            .animation(.easeOut(duration: 0.18), value: caption.id)
            .allowsHitTesting(false)
        }
    }
}

/// The right-hand rail button. Scales on press the way the web app's does.
private struct RailButton: View {
    let asset: String
    let tint: Color
    let action: () -> Void

    @State private var bumped = false

    var body: some View {
        Button {
            action()
            // Fired here rather than in the caller so the feel and the bounce
            // can never drift apart — they are the same event, and the haptic's
            // two transients are timed off the two springs below.
            Haptics.saveBounce()
            withAnimation(.spring(response: 0.22, dampingFraction: 0.5)) { bumped = true }
            Task {
                try? await Task.sleep(for: .milliseconds(180))
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) { bumped = false }
            }
        } label: {
            RailIcon(asset: asset, tint: tint)
                .scaleEffect(bumped ? 1.25 : 1)
        }
        .buttonStyle(.plain)
    }
}

/// The rail's glyph, shared so the ShareLink row matches the buttons beside it.
private struct RailIcon: View {
    let asset: String
    let tint: Color

    var body: some View {
        Image(asset)
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: 40, height: 40)
            .foregroundStyle(tint)
            .shadow(color: .black.opacity(0.45), radius: 8, y: 2)
    }
}

/// The double-tap heart: rises, drifts and fades.
private struct HeartBurst: View {
    let angle: Double
    @State private var lift: CGFloat = 0
    @State private var fade: Double = 1
    @State private var scale: CGFloat = 0.4

    var body: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 96))
            .foregroundStyle(DF.ink)
            .rotationEffect(.degrees(angle))
            .scaleEffect(scale)
            .opacity(fade)
            .offset(y: lift)
            .onAppear {
                withAnimation(.spring(response: 0.34, dampingFraction: 0.55)) { scale = 1 }
                withAnimation(.easeOut(duration: 0.9)) {
                    lift = -120
                    fade = 0
                }
            }
    }
}
