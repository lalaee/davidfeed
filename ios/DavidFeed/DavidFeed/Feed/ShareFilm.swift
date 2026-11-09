import LinkPresentation
import SwiftUI
import UIKit

/// What the share button hands over: the film as the web shares it.
///
/// The web's share file for a film is the film as LemoLab delivered it, with
/// its "See more at: Dafod.app" ending, over the white Dafod.app strip from
/// Figma -- 1080x2132 with sound, 5-27MB (scripts/build-film-share.sh in the
/// web repo). The app takes the same file from dafod.app, keeps it in Caches,
/// and shares that. With no connection it falls back to the film the app
/// holds, without the ending -- a share that works beats one that waits.
///
/// The file is fetched BEFORE the sheet opens, with the progress on the
/// button, as the web's ShareSheet does. It used to be a ShareLink whose
/// Transferable downloaded the file only once a destination asked for it:
/// the sheet came up slowly and empty-handed, and an app's share extension
/// (Instagram, WhatsApp) was left waiting on tens of megabytes it gives up on.
/// The sheet now gets a file that is already on the phone.
enum ShareFilm {
    /// "Psalm 45:2-8" -> "psalm-45-2-8-dafod.mp4", the name the web gives it.
    static func fileName(_ post: Post) -> String {
        let slug = post.title.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return "\(slug)-dafod.mp4"
    }

    /// The share file on the phone, fetched or brought up to date first. The
    /// copy kept from last time is checked against the server's ETag, so a
    /// rebuilt share video (the web re-cut all of them with "Verse of the
    /// day" on the strip) replaces it instead of the old one going out.
    static func file(for post: Post, progress: @escaping @Sendable (Double) -> Void) async throws -> URL {
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("share/\(post.id)", isDirectory: true)
        let cached = dir.appendingPathComponent(fileName(post))
        let tag = dir.appendingPathComponent("etag")
        let have = FileManager.default.fileExists(atPath: cached.path)
        // A film added since the bucket names its own share file there.
        let remote = post.shareSrc.flatMap(MediaStore.name).map(MediaStore.remote)
            ?? URL(string: "https://www.dafod.app/assets/share/\(post.id).mp4")!
        var request = URLRequest(url: remote, cachePolicy: .reloadIgnoringLocalCacheData)
        if have, let etag = try? String(contentsOf: tag, encoding: .utf8) {
            request.setValue(etag, forHTTPHeaderField: "If-None-Match")
        }
        do {
            let (tmp, response) = try await URLSession.shared.download(for: request, delegate: Progress(progress))
            let http = response as? HTTPURLResponse
            if http?.statusCode == 304, have { return cached }
            guard http?.statusCode == 200 else { throw URLError(.badServerResponse) }
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try? FileManager.default.removeItem(at: cached)
            try FileManager.default.moveItem(at: tmp, to: cached)
            if let etag = http?.value(forHTTPHeaderField: "ETag") {
                try? etag.write(to: tag, atomically: true, encoding: .utf8)
            }
            return cached
        } catch {
            if have { return cached }
            guard let film = post.loopURL else { throw error }
            return film
        }
    }

    /// The system share sheet with the file alone -- no text beside it, which
    /// some share extensions (Instagram's among them) refuse or flatten, as
    /// the web found (shareVideo.ts). From the frontmost view controller.
    static func present(_ file: URL, for post: Post) {
        guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
              var top = scene.keyWindow?.rootViewController else { return }
        while let shown = top.presentedViewController { top = shown }
        let sheet = UIActivityViewController(activityItems: [Item(file: file, post: post)],
                                             applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = top.view
        top.present(sheet, animated: true)
    }

    /// Reports a download's progress, 0...1, as it goes.
    private nonisolated final class Progress: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
        private let report: @Sendable (Double) -> Void
        private var watch: NSKeyValueObservation?
        init(_ report: @escaping @Sendable (Double) -> Void) { self.report = report }
        func urlSession(_ session: URLSession, didCreateTask task: URLSessionTask) {
            watch = task.progress.observe(\.fractionCompleted) { [report] p, _ in report(p.fractionCompleted) }
        }
    }

    /// The file, with the passage and its poster as the sheet's header in
    /// place of a blank document icon.
    private final class Item: NSObject, UIActivityItemSource {
        let file: URL, post: Post
        init(file: URL, post: Post) { self.file = file; self.post = post }
        func activityViewControllerPlaceholderItem(_ controller: UIActivityViewController) -> Any { file }
        func activityViewController(_ controller: UIActivityViewController,
                                    itemForActivityType type: UIActivity.ActivityType?) -> Any? { file }
        func activityViewControllerLinkMetadata(_ controller: UIActivityViewController) -> LPLinkMetadata? {
            let meta = LPLinkMetadata()
            meta.originalURL = file
            meta.title = post.title
            if let poster = post.artworkURL {
                meta.imageProvider = NSItemProvider(contentsOf: poster)
            }
            return meta
        }
    }
}

/// A share in progress: how far the fetch has got, nil when idle. At file
/// level, not nested in ShareFilmButton: an @Observable class inside the
/// generic button crashed the Release compiler (Xcode 26.0.1) emitting its
/// deinit.
@Observable final class ShareFilmJob { var progress: Double? }

/// A button that fetches the share film and then opens the sheet with it. The
/// label is told how far the fetch has got (nil when idle) so it can show it.
struct ShareFilmButton<Label: View>: View {
    let post: Post
    @ViewBuilder let label: (Double?) -> Label
    @State private var job = ShareFilmJob()

    var body: some View {
        Button {
            guard job.progress == nil else { return }
            job.progress = 0
            let job = job, post = post
            Task {
                let file = try? await ShareFilm.file(for: post) { p in
                    Task { @MainActor in if job.progress != nil { job.progress = p } }
                }
                job.progress = nil
                if let file { ShareFilm.present(file, for: post) }
            }
        } label: {
            label(job.progress)
        }
        .accessibilityLabel("Share \(post.title)")
    }
}
