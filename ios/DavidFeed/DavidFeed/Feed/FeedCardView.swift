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
    /// The verse of the day: square at the top, where it runs under the status
    /// bar, rounded at the bottom like a card. It keeps the save and adds a
    /// like (the heart button, and the double-tap); its share is the button
    /// under the film, so the rail drops its own.
    var verseOfTheDay = false

    @Environment(AppState.self) private var app
    /// Not @State: a player owned by a view dies with the view, which is what
    /// stopped audio the moment the app left the foreground. Playback outlives
    /// every card; this one only says which post is current.
    private var playback: Playback { .shared }
    /// False while another tab is showing: the films pause where they are and
    /// pick up from there on return (FeedOnScreenKey).
    @Environment(\.feedOnScreen) private var onScreen
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
                // No scrim: the films end on their own caption bands, some
                // cream, and a dark gradient over cream read as a grey bar.
                // The label takes a colour the film's bottom can carry instead.
                artwork(size: geo.size)
                    .contentShape(Rectangle())
                    .onTapGesture(count: 2) { location in like(at: location) }
                    // Toggles the PLAYER, not a separate flag. app.soundOn was a
                    // second source of truth: pressing play on the lock screen
                    // started audio without touching it, so the card went on
                    // saying "Tap for sound" over playing narration.
                    .onTapGesture { playback.toggle() }

                bottomBar(geo.size)
                soundBadge

                ForEach(hearts) { heart in
                    HeartBurst(angle: heart.angle)
                        .position(heart.point)
                        .allowsHitTesting(false)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .coordinateSpace(.named(Self.cardSpace))
            .accessibilityElement(children: .contain)
            .accessibilityLabel(post.title)
            // Screenshots square the top corners, so a capture starts flush with
            // the film; in use the card is rounded all round. The verse of the
            // day is square at the top too, flush with the screen's edge.
            .clipShape(UnevenRoundedRectangle(
                topLeadingRadius: ScreenshotMode.on || verseOfTheDay ? 0 : DF.cardRadius,
                bottomLeadingRadius: DF.cardRadius,
                bottomTrailingRadius: DF.cardRadius,
                topTrailingRadius: ScreenshotMode.on || verseOfTheDay ? 0 : DF.cardRadius,
                style: .continuous))
        }
        .task(id: isActive) { syncPlayback() }
    }

    // MARK: pieces

    /// Dark label and icons on a light film, white on a dark one, from how
    /// bright the bottom of the film's poster is.
    private var chrome: (ink: Color, shadow: Color) {
        Self.chrome(black: ArtworkCache.isLightAtBottom(post.artworkURL))
    }

    private static func chrome(black: Bool) -> (ink: Color, shadow: Color) {
        black ? (Color.black.opacity(0.82), Color.white.opacity(0.25))
              : (DF.ink, Color.black.opacity(0.35))
    }

    /// On Home, the heart and the bookmark each take their ink from the
    /// picture right behind them as the film plays (ReflectionSampler.inks,
    /// the web's useLiveInk), so a light patch passing under one turns it
    /// black and leaves the other as it is; the poster's ink until a frame
    /// has been read. The feed's rail keeps the poster's.
    private func chrome(_ probe: String) -> (ink: Color, shadow: Color) {
        guard verseOfTheDay, let black = ReflectionSampler.shared.inks[probe] else { return chrome }
        return Self.chrome(black: black)
    }

    /// The card's own coordinates, for the rail's boxes.
    private static let cardSpace = "feedCard"

    /// Tells the sampler where a rail icon sits over the film: its box in the
    /// card, moved down by what the card crops off the film's head, in a view
    /// the film's full height (artwork).
    private func probed(_ name: String, _ size: CGSize) -> some ViewModifier {
        ProbeModifier(name: name, enabled: verseOfTheDay, space: Self.cardSpace,
                      crop: cropTop(size), film: CGSize(width: size.width, height: filmHeight(size)))
    }

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
                // The film's own soundtrack, on the card in view, when sound is on.
                LoopPlayerView(url: loop, isPlaying: onScreen, active: isActive,
                               muted: !(isActive && playback.isPlaying))
            }
        }
        // The film at its own height; the card shows the part of it that
        // fits (all of it, unless the card was cut short for a small screen).
        .frame(width: size.width, height: filmHeight(size))
        .offset(y: -cropTop(size))
        .frame(width: size.width, height: size.height, alignment: .top)
        .clipped()
    }

    /// Where the film's lowest burned-in words end on a card of this size,
    /// measured up from the card's foot; nil for a film without a span.
    static func wordsAboveFoot(_ post: Post, _ size: CGSize, air: CGFloat) -> CGFloat? {
        guard let span = post.captions, span.count == 2 else { return nil }
        let film = max(size.height, size.width * CGFloat(post.aspect ?? 16.0 / 9.0))
        return size.height - (CGFloat(span[1]) * film - cropTop(post, size, air: air))
    }

    private func filmHeight(_ size: CGSize) -> CGFloat {
        max(size.height, size.width * CGFloat(post.aspect ?? 16.0 / 9.0))
    }

    private func cropTop(_ size: CGSize) -> CGFloat {
        Self.cropTop(post, size, air: verseOfTheDay ? VerseOfTheDayView.titleClearance : 12)
    }

    /// How much of the film's head a short card leaves off: only what its
    /// lowest burned-in words need to sit `air` above the card's foot, never
    /// more than the film has to spare -- the web's .feed-card rule. A film
    /// whose words span more than the card keeps its head. Home asks for room
    /// for its title as the air, as the web's Home card does.
    static func cropTop(_ post: Post, _ size: CGSize, air: CGFloat) -> CGFloat {
        let film = max(size.height, size.width * CGFloat(post.aspect ?? 16.0 / 9.0))
        let spare = film - size.height
        guard spare > 0.5 else { return 0 }
        guard let span = post.captions, span.count == 2 else { return spare / 2 }
        let lowest = CGFloat(span[1]) * film, highest = CGFloat(span[0]) * film
        var top = min(max(lowest + air - size.height, 0), spare)
        if top > highest { top = highest }   // can't keep both ends: keep the head's words
        return top
    }

    private func bottomBar(_ size: CGSize) -> some View {
        VStack {
            Spacer()
            HStack(alignment: .bottom) {
                // No passage title on the card, as on the web: the film shows
                // its own words. The title still names it for VoiceOver and in
                // the share sheet.
                Spacer(minLength: 16)
                VStack(spacing: 32) {
                    // The film as the web shares it -- with its Dafod ending,
                    // over the white strip -- fetched before the sheet opens
                    // (ShareFilm), a spinner over the glyph while it comes.
                    if !verseOfTheDay {
                        ShareFilmButton(post: post) { progress in
                            RailIcon(asset: "Send", tint: chrome.ink, shadow: chrome.shadow)
                                .opacity(progress == nil ? 1 : 0.3)
                                .overlay { if progress != nil { ProgressView().tint(chrome.ink) } }
                        }
                        .buttonStyle(.plain)
                    }
                    // The like, above the save, as Figma "Feed-Liked-Saved"
                    // stacks them: a white outline heart, pink (#E6066B) and
                    // filled once liked. A like needs no account.
                    if verseOfTheDay {
                        RailButton(
                            asset: app.isLiked(post) ? "HeartActive" : "HeartInactive",
                            tint: app.isLiked(post) ? Color(hex: "#E6066B") : chrome("heart").ink,
                            shadow: chrome("heart").shadow
                        ) {
                            app.setLiked(post.id, on: !app.isLiked(post))
                        }
                        .modifier(probed("heart", size))
                    }
                    RailButton(
                        asset: app.isSaved(post) ? "BookmarkActive" : "BookmarkInactive",
                        tint: app.isSaved(post) ? Color(hex: "#EAC72C") : chrome("bookmark").ink,
                        shadow: chrome("bookmark").shadow
                    ) {
                        // An account holds saves, as on the web: signed out,
                        // this opens the sign-in sheet and saves once they're in.
                        let on = !app.isSaved(post), id = post.id
                        if Account.shared.gated({ [app] in app.setSaved(id, on: on) }) {
                            withAnimation(.snappy) { showSavedPop = on }
                        }
                    }
                    .modifier(probed("bookmark", size))
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
                .glassOrSurface(in: .capsule)
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
        // The heart is the save happening: signed out, the sheet asks first and
        // no heart plays for a save that hasn't been made. On the verse of the
        // day it is the like instead, which the heart button beside it shows;
        // a double-tap only ever likes, never unlikes.
        let id = post.id
        if verseOfTheDay {
            app.setLiked(id, on: true)
            Haptics.saveBounce()
        } else {
            guard app.isSaved(post) || Account.shared.gated({ [app] in app.setSaved(id, on: true) }) else { return }
        }
        let heart = Heart(point: point, angle: Double.random(in: -22...22))
        hearts.append(heart)
        Task {
            try? await Task.sleep(for: .milliseconds(900))
            hearts.removeAll { $0.id == heart.id }
        }
    }
}

/// The right-hand rail button. Scales on press the way the web app's does.
private struct RailButton: View {
    let asset: String
    let tint: Color
    let shadow: Color
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
            RailIcon(asset: asset, tint: tint, shadow: shadow)
                .scaleEffect(bumped ? 1.25 : 1)
                // Black or white fades over 0.3s, as the web's transition does.
                .animation(.easeInOut(duration: 0.3), value: tint)
        }
        .buttonStyle(.plain)
    }
}

/// The rail's glyph, shared so the ShareLink row matches the buttons beside it.
private struct RailIcon: View {
    let asset: String
    let tint: Color
    let shadow: Color

    var body: some View {
        Image(asset)
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: 40, height: 40)
            .foregroundStyle(tint)
            .shadow(color: shadow, radius: 3, y: 1)
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

/// Whether the feed is the screen in front. SwiftUI's TabView keeps the Home tab
/// alive behind the others, so without this its films went on playing -- sound
/// and all -- under the Bible and You. RootView sets it for the Home feed only;
/// a feed presented elsewhere (Saved, played full screen) keeps the default.
private struct FeedOnScreenKey: EnvironmentKey { static let defaultValue = true }
extension EnvironmentValues {
    var feedOnScreen: Bool {
        get { self[FeedOnScreenKey.self] }
        set { self[FeedOnScreenKey.self] = newValue }
    }
}

/// Puts a view's box over the film into ReflectionSampler as `name`, while
/// it is on screen. Off where `enabled` is false.
private struct ProbeModifier: ViewModifier {
    let name: String
    let enabled: Bool
    let space: String
    let crop: CGFloat
    let film: CGSize

    func body(content: Content) -> some View {
        if enabled {
            content
                .onGeometryChange(for: CGRect.self) { $0.frame(in: .named(space)) } action: { box in
                    ReflectionSampler.shared.probe(name, box.offsetBy(dx: 0, dy: crop), film: film)
                }
                .onDisappear { ReflectionSampler.shared.probe(name, nil, film: .zero) }
        } else {
            content
        }
    }
}
