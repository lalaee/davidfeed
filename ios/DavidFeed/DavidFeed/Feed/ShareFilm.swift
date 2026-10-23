import CoreTransferable
import Foundation
import UniformTypeIdentifiers

/// What the share button hands over: the film as the web shares it.
///
/// The web's share file for a film is the film as LemoLab delivered it, with
/// its "See more at: Dafod.app" ending, over the white Dafod.app strip from
/// Figma -- 1080x2132 with sound, 10-27MB (scripts/build-film-share.sh in the
/// web repo). Bundling all nine would put the app over 300MB, so the app takes
/// the same file from dafod.app when a destination asks for it, keeps it in
/// Caches, and shares that. With no connection it falls back to the film the
/// app carries, without the ending -- a share that works beats one that waits.
struct ShareFilm: Transferable {
    let post: Post

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .mpeg4Movie) { item in
            SentTransferredFile(try await item.file())
        }
    }

    /// "Psalm 45:2-8" -> "psalm-45-2-8-dafod.mp4", the name the web gives it.
    private var fileName: String {
        let slug = post.title.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return "\(slug)-dafod.mp4"
    }

    func file() async throws -> URL {
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("share/\(post.id)", isDirectory: true)
        let cached = dir.appendingPathComponent(fileName)
        if FileManager.default.fileExists(atPath: cached.path) { return cached }
        do {
            let remote = URL(string: "https://www.dafod.app/assets/share/\(post.id).mp4")!
            let (tmp, response) = try await URLSession.shared.download(from: remote)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try? FileManager.default.removeItem(at: cached)
            try FileManager.default.moveItem(at: tmp, to: cached)
            return cached
        } catch {
            guard let film = post.loopURL else { throw error }
            return film
        }
    }
}
