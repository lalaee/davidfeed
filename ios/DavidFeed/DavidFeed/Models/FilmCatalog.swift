import Foundation
import Observation

/// The films, from Supabase rather than the bundle, so a film can be added or
/// taken down without a build (supabase/migrations/20261108000000_films.sql).
///
/// The app carries no films. The list is small JSON, fetched whenever the app
/// comes to the front, and the last copy is kept on disk so the app opens on
/// it at once. A film's poster and film are downloaded from the public `films`
/// bucket when they are wanted -- today's, tomorrow's, the saved ones -- and
/// the rest are cleared away (prune). A film is only shown once both are on
/// the phone, so everything downstream still plays a file, never a stream.
/// The first launch needs a connection; until then Home says so.
@Observable
final class FilmCatalog {
    static let shared = FilmCatalog()

    /// Published films, in the table's order.
    private(set) var films: [Post]
    /// "2026-11-08" -> film id: the verse of the day, by local date.
    private(set) var days: [String: Int]
    /// Films whose media is downloading; Home waits on these rather than show
    /// another film for a moment.
    private(set) var downloading: Set<Int> = []
    /// Films whose media couldn't be fetched this session (offline): Home falls
    /// back instead of waiting.
    private(set) var failed: Set<Int> = []
    /// Whether a fetch of the list is under way, and whether one has finished
    /// (either way) since launch: until then an empty list means "not yet",
    /// after it "no connection".
    private(set) var refreshing = false
    private(set) var attempted = false
    /// Bumped whenever files arrive or are cleared. MediaStore's set of names
    /// isn't observable, so isReady reads this to make a view that asked
    /// "is it here yet?" ask again once it is -- without it, Home kept its
    /// spinner over a film that had finished downloading.
    private(set) var mediaVersion = 0

    private struct Saved: Codable {
        var films: [Post]
        var days: [String: Int]
    }

    private static let file = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("catalog.json")

    private init() {
        if let data = try? Data(contentsOf: Self.file),
           let saved = try? JSONDecoder().decode(Saved.self, from: data) {
            films = saved.films
            days = saved.days
        } else {
            films = []
            days = [:]
        }
    }

    // MARK: reading

    func film(id: Int) -> Post? { films.first { $0.id == id } }

    /// Whether the film can be drawn: its poster and its film are on the phone.
    func isReady(_ post: Post) -> Bool {
        _ = mediaVersion
        return post.artworkURL != nil && post.loopURL != nil
    }

    /// Clears every downloaded file but these films' (MediaStore.prune).
    func prune(keeping posts: [Post]) {
        MediaStore.prune(keeping: posts)
        mediaVersion += 1
    }

    static func dayKey(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// The film the schedule names for a date, if it names one that is still
    /// published.
    func scheduled(for date: Date) -> Post? {
        days[Self.dayKey(date)].flatMap(film(id:))
    }

    // MARK: fetching

    /// The published films and the schedule from a fortnight back to a month
    /// ahead -- the month the 6am notifications are booked for
    /// (VerseNotifications). A failed fetch keeps what the phone already has.
    func refresh() async {
        guard !refreshing else { return }
        refreshing = true
        defer { refreshing = false; attempted = true }
        // The table's columns under the names Post decodes (PostgREST's alias:column).
        let columns = "id,title,backgroundImage:background_image,posterVideoSrc:poster_video_src,"
            + "videoSrc:video_src,audioSrc:audio_src,shareSrc:share_src,subtitles,effect,"
            + "startAt:start_at,aspect,translation,captions"
        let cal = Calendar.current
        let from = Self.dayKey(cal.date(byAdding: .day, value: -14, to: Date()) ?? Date())
        let to = Self.dayKey(cal.date(byAdding: .day, value: 31, to: Date()) ?? Date())
        do {
            async let filmsData = Supabase.get("rest/v1/films?select=\(columns)&order=position,id")
            async let daysData = Supabase.get("rest/v1/film_days?select=day,film_id&day=gte.\(from)&day=lte.\(to)")
            let posts = try JSONDecoder().decode([Post].self, from: try await filmsData)
            struct Day: Decodable { let day: String; let film_id: Int }
            let schedule = try JSONDecoder().decode([Day].self, from: try await daysData)
            films = posts
            days = Dictionary(schedule.map { ($0.day, $0.film_id) }, uniquingKeysWith: { a, _ in a })
            failed = []
            if let data = try? JSONEncoder().encode(Saved(films: films, days: days)) {
                try? FileManager.default.createDirectory(at: Self.file.deletingLastPathComponent(),
                                                         withIntermediateDirectories: true)
                try? data.write(to: Self.file, options: .atomic)
            }
        } catch {
            // Offline, or the tables aren't there yet: the copy on disk stands.
        }
    }

    // MARK: media

    /// Downloads the posters and films the phone doesn't hold, one film at a
    /// time and in the order given, so the one wanted first arrives first.
    func prepare(_ posts: [Post]) async {
        for post in posts where !isReady(post) && !downloading.contains(post.id) {
            downloading.insert(post.id)
            failed.remove(post.id)
            let ok = await MediaStore.fetch([post.backgroundImage, post.posterVideoSrc ?? post.videoSrc])
            downloading.remove(post.id)
            mediaVersion += 1
            if !ok || !isReady(post) { failed.insert(post.id) }
        }
    }
}

/// Downloaded media, in Caches/films under the name the row gives it. Caches,
/// not Application Support: the system may clear it when the phone is short of
/// space, which is right for files the app can fetch again -- the catalog
/// simply downloads the day's film once more.
enum MediaStore {
    private static let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("films", isDirectory: true)

    /// Names on disk, read once and kept, so a card's body (which asks for its
    /// artwork many times a second) never touches the file system for it.
    private static var names: Set<String> = Set(
        (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? [])

    static func local(_ name: String) -> URL? {
        names.contains(name) ? dir.appendingPathComponent(name) : nil
    }

    /// "/assets/verses/x.mp4" or "x.mp4" -> "x.mp4": rows name a file, and
    /// only its last part is the object in the bucket.
    nonisolated static func name(_ path: String) -> String? {
        path.split(separator: "/").last.map(String.init)
    }

    nonisolated static func remote(_ name: String) -> URL {
        Supabase.url.appendingPathComponent("storage/v1/object/public/films/\(name)")
    }

    /// Fetches each path not already on the phone; true when all of them are.
    static func fetch(_ paths: [String?]) async -> Bool {
        var ok = true
        for case let path? in paths {
            guard let name = name(path), local(name) == nil else { continue }
            do {
                let (tmp, response) = try await URLSession.shared.download(from: remote(name))
                guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                let dest = dir.appendingPathComponent(name)
                try? FileManager.default.removeItem(at: dest)
                try FileManager.default.moveItem(at: tmp, to: dest)
                names.insert(name)
            } catch {
                ok = false
            }
        }
        return ok
    }

    /// Clears every downloaded file but these films': the phone holds what
    /// it is about to show and what the reader saved, not the whole catalogue.
    static func prune(keeping films: [Post]) {
        let keep = Set(films.flatMap { [$0.backgroundImage, $0.posterVideoSrc, $0.videoSrc, $0.audioSrc] }
            .compactMap { $0.flatMap(name) })
        for name in names where !keep.contains(name) {
            try? FileManager.default.removeItem(at: dir.appendingPathComponent(name))
            names.remove(name)
        }
    }
}
