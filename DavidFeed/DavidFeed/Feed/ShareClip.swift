import AVFoundation
import CoreTransferable
import Foundation

/// The share clip, played through twice, composed on the phone when shared.
///
/// The bundle ships the web's single-pass render. The second pass -- so a
/// Story does not end before the viewer has settled into it -- used to be baked
/// into the bundle and was 93MB of the app. It is composed here instead: the
/// same asset inserted twice into a composition and exported with the
/// passthrough preset, which is a stream copy of the packets rather than a
/// re-encode, so it takes a fraction of a second and loses nothing. Video,
/// burned-in captions, narration and bed travel together, so nothing drifts.
///
/// The file is named the way the web names it, so the recipient sees
/// "psalm-23-1-3-dafod.mp4" rather than a temporary name, and it is kept in
/// the temp directory so a second share of the same card is instant.
struct ShareClip: Transferable {
    let post: Post

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .mpeg4Movie) { clip in
            SentTransferredFile(try await clip.doubled())
        }
    }

    func doubled() async throws -> URL {
        guard let src = post.shareURL else { throw CocoaError(.fileNoSuchFile) }
        let out = FileManager.default.temporaryDirectory.appendingPathComponent(src.lastPathComponent)
        if FileManager.default.fileExists(atPath: out.path) { return out }

        let asset = AVURLAsset(url: src)
        let duration = try await asset.load(.duration)
        let whole = CMTimeRange(start: .zero, duration: duration)
        let composition = AVMutableComposition()
        try await composition.insertTimeRange(whole, of: asset, at: .zero)
        try await composition.insertTimeRange(whole, of: asset, at: duration)

        guard let export = AVAssetExportSession(asset: composition,
                                                presetName: AVAssetExportPresetPassthrough)
        else { throw CocoaError(.fileWriteUnknown) }
        try await export.export(to: out, as: .mp4)
        return out
    }
}
