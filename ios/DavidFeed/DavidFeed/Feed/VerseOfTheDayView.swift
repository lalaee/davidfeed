import SwiftUI

/// Home: one film a day instead of the whole feed.
///
/// Figma "New Feed UI" (node 2789:1009, a 375x747 frame): the film edge to edge
/// from the top of the screen, "Verse of the day" over it, and a "Share verse"
/// pill under it. Everyone gets the same film on the same date, and it turns
/// over at local midnight. The tab bar stays the system's; the frame's own Nav
/// was left out on purpose.
///
/// Which film a date gets is Supabase's `film_days` (FilmCatalog), so the
/// schedule and the films change without a build; a date it doesn't name
/// falls back to the rotation below.
struct VerseOfTheDayView: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(AppState.self) private var app
    private var catalog: FilmCatalog { .shared }
    /// The date the film is picked for. Refreshed when the day turns over while
    /// the app is open, and whenever it comes back to the front.
    @State private var today = Date()

    /// Days count from here, so the rotation never depends on when a phone was
    /// set up or the app installed. Any fixed date works; this one is the day
    /// the feature was made.
    private static let firstDay = DateComponents(calendar: .current, year: 2026, month: 11, day: 8).date!

    /// The rotation's film for a date, the same on every phone given the same
    /// films. The films go round one passage at a time (see `rotation`).
    static func film(for date: Date, from posts: [Post]) -> Post? {
        let order = rotation(posts)
        guard !order.isEmpty else { return nil }
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: firstDay),
                                      to: cal.startOfDay(for: date)).day ?? 0
        return order[((days % order.count) + order.count) % order.count]
    }

    /// The order the days take: one film from each passage in turn, passages
    /// in the order the shorts list first names them. FeedView.spread only
    /// keeps a passage off two days running, which with nine films over 3/3/2/1
    /// meant six days of Psalm 23 and Psalm 3 alternating before Psalm 45
    /// came up; dealt round, every passage comes as seldom as it can:
    /// 23, 3, 45, Isaiah 41, 23, 3, 45, 23, 3.
    static func rotation(_ posts: [Post]) -> [Post] {
        var passages: [String] = [], groups: [String: [Post]] = [:]
        for p in posts {
            if groups[p.passage] == nil { passages.append(p.passage) }
            groups[p.passage, default: []].append(p)
        }
        var out: [Post] = [], round = 0
        while out.count < posts.count {
            for passage in passages where groups[passage]!.indices.contains(round) {
                out.append(groups[passage]![round])
            }
            round += 1
        }
        return out
    }

    /// The film the date asks for: the schedule's, else the rotation's.
    private func wanted(on date: Date) -> Post? {
        catalog.scheduled(for: date) ?? Self.film(for: date, from: catalog.films)
    }

    /// What Home shows: today's film once it is on the phone. While it
    /// downloads, the ground and a spinner -- briefly, since tomorrow's is
    /// fetched the day before. If it can't be fetched (offline), the
    /// rotation's pick among the films still on the phone, if any are.
    private var post: Post? {
        guard let want = wanted(on: today) else { return nil }
        if catalog.isReady(want) { return want }
        guard catalog.failed.contains(want.id) else { return nil }
        return Self.film(for: today, from: catalog.films.filter(catalog.isReady))
    }

    /// Nothing to show yet, but something on its way: the list, on a first
    /// launch, or today's film. Otherwise an empty Home means no connection.
    private var isWaiting: Bool {
        guard post == nil else { return false }
        if let want = wanted(on: today) { return !catalog.failed.contains(want.id) }
        return !catalog.attempted || catalog.refreshing
    }

    /// Today's and tomorrow's films onto the phone, from the list it has and
    /// then again from a fresh one; then everything else off it but the saved
    /// films. Unstructured, so a download outlives the view that asked for it.
    private func sync() {
        today = Date()
        let day = today, catalog = catalog, saved = app.savedIDs
        let next = {
            [day, Calendar.current.date(byAdding: .day, value: 1, to: day) ?? day]
                .compactMap { catalog.scheduled(for: $0) ?? Self.film(for: $0, from: catalog.films) }
        }
        Task {
            await catalog.prepare(next())
            await catalog.refresh()
            await catalog.prepare(next())
            // Only once both are here: offline, the film on screen may be an
            // older one standing in, and it mustn't be deleted under the player.
            if next().allSatisfy(catalog.isReady) {
                MediaStore.prune(keeping: next() + catalog.films.filter { saved.contains($0.id) })
            }
        }
    }

    // Figma measurements, at the frame's 375 width.
    /// Film bottom (572.4) to the button's top (586).
    private static let filmToButton: CGFloat = 13.6
    /// The button: 343x63, 16 in from each side of 375.
    private static let buttonHeight: CGFloat = 63
    private static let buttonInset: CGFloat = 16
    /// The button's bottom (649) to the nav's top (662).
    private static let buttonToBar: CGFloat = 13

    var body: some View {
        GeometryReader { geo in
            // From the top of the screen (the film runs under the status bar,
            // as in the frame) to the top of the tab bar.
            let room = geo.safeAreaInsets.top + geo.size.height
            let filmRoom = room - Self.filmToButton - Self.buttonHeight - Self.buttonToBar
            ZStack(alignment: .top) {
                DF.ground
                if isWaiting {
                    ProgressView()
                        .tint(DF.ink)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if post == nil {
                    offline
                }
                if let post {
                    VStack(spacing: Self.filmToButton) {
                        // The film at its own shape where it fits; on a shorter
                        // screen it is cut from the head, keeping its words
                        // (FeedCardView.cropTop).
                        FeedCardView(post: post, isActive: true, playsLoop: true, verseOfTheDay: true)
                            .frame(height: min(geo.size.width * CGFloat(post.aspect ?? 16.0 / 9.0), filmRoom))
                            .id(post.id)
                        shareButton(post)
                            .padding(.horizontal, Self.buttonInset)
                        Spacer(minLength: 0)
                    }
                    .ignoresSafeArea(edges: .top)
                    .overlay(alignment: .top) { title }
                    .onAppear { Playback.shared.setQueue([post]) }
                    .onChange(of: post.id) { Playback.shared.setQueue([post]) }
                }
            }
        }
        .onAppear { sync() }
        .onReceive(NotificationCenter.default.publisher(for: .NSCalendarDayChanged)) { _ in
            sync()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { sync() }
        }
    }

    /// No film on the phone and none to be had: the first launch, offline.
    private var offline: some View {
        VStack(spacing: 16) {
            Text("Today's verse needs an internet connection.")
                .font(.system(size: 17, weight: .medium))
                .multilineTextAlignment(.center)
                .foregroundStyle(DF.ink)
            Button("Try again") { sync() }
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.black)
                .padding(.vertical, 12)
                .padding(.horizontal, 24)
                .background(Color(hex: "#8CE4FF"), in: .capsule)
                .buttonStyle(.plain)
        }
        .padding(.horizontal, 32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// "Verse of the day": Inter Semi Bold 20, -2% tracking, white in the
    /// frame. White vanishes on the films whose tops are paper (the woodcuts),
    /// so it goes dark over a light top, the same reading of the playing
    /// frames that turns the status bar dark.
    private var title: some View {
        Text("Verse of the day")
            .font(.system(size: 20, weight: .semibold))
            .tracking(-0.4)
            .foregroundStyle(ReflectionSampler.shared.topIsLight ? Color.black : Color.white)
            .padding(.top, 4)
            .accessibilityAddTraits(.isHeader)
    }

    /// "Share verse": a #8CE4FF pill, the Instagram glyph and the label, black.
    /// Inter Medium 20 / 22, -0.43 tracking; padding 13 by 16, gap 8. It shares
    /// what the feed's share did, the film from dafod.app (ShareFilm), so
    /// Instagram is one of the share sheet's destinations.
    private func shareButton(_ post: Post) -> some View {
        ShareLink(item: ShareFilm(post: post), preview: SharePreview(post.title)) {
            HStack(spacing: 8) {
                Image("Instagram")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 24, height: 24)
                Text("Share verse")
                    .font(.system(size: 20, weight: .medium))
                    .tracking(-0.43)
            }
            .foregroundStyle(Color.black)
            .padding(.vertical, 13)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: Self.buttonHeight)
            .background(Color(hex: "#8CE4FF"), in: .capsule)
            .contentShape(.capsule)
        }
        .buttonStyle(.plain)
    }
}
