import AVFoundation
import MediaPlayer
import Observation
import UIKit

/// What the feed is playing, for the cards and for the lock screen.
///
/// On this branch every film carries its own audio -- voice, score and foley
/// are in the file -- so there is no narration player and no bed under it.
/// What is left to own: which card is current, whether sound is on (the
/// card's own player follows that as its mute), what the lock screen and
/// Dynamic Island show, and the remote commands that move the feed.
@Observable
@MainActor
final class Playback {
    static let shared = Playback()

    private(set) var currentPost: Post?
    /// Sound on. True from the start: each film carries its audio by default,
    /// and a tap on the card turns it off and on again.
    private(set) var isPlaying = true
    private var duration: Double = 0

    private init() {}

    // MARK: session

    /// `.playback` keeps audio alive when the screen locks; it is the half of
    /// background audio that lives in code. The other half is the
    /// UIBackgroundModes "audio" entitlement -- without BOTH, playback stops the
    /// moment the app leaves the foreground.
    static func configureSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .moviePlayback)
        try? session.setActive(true)
    }

    // MARK: the current card

    func activate(_ post: Post) {
        guard currentPost?.id != post.id else { return }
        load(post)
    }

    /// The ordered cards, so next/previous can move through them. Set by the
    /// feed and kept current.
    private(set) var queue: [Post] = []
    func setQueue(_ posts: [Post]) { queue = posts }

    /// Where the feed should scroll to, when the lock screen moves the track.
    private(set) var scrollTarget: Int?
    func clearScrollTarget() { scrollTarget = nil }

    private func load(_ post: Post) {
        currentPost = post
        duration = 0
        publishNowPlaying()
        guard let url = post.loopURL else { return }
        // The film's length, for the lock screen's scrubber. Read off the file
        // rather than carried in the data, so nothing has to stay in step.
        Task { [weak self] in
            let seconds = (try? await AVURLAsset(url: url).load(.duration))?.seconds ?? 0
            guard let self, self.currentPost?.id == post.id else { return }
            self.duration = seconds.isFinite ? seconds : 0
            self.publishNowPlaying()
        }
    }

    // MARK: transport

    func play() {
        isPlaying = true
        publishNowPlaying()
    }

    func pause() {
        isPlaying = false
        publishNowPlaying()
    }

    func toggle() { isPlaying ? pause() : play() }

    // MARK: lock screen / Dynamic Island

    /// A call, an alarm or another app taking the session stops playback; without
    /// this nothing ever starts it again and `isPlaying` is left lying.
    func observeInterruptions() {
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(), queue: .main
        ) { [weak self] note in
            guard let self,
                  let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: raw)
            else { return }
            MainActor.assumeIsolated {
                switch type {
                case .began:
                    self.isPlaying = false
                    self.publishNowPlaying()
                case .ended:
                    let opts = (note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt)
                        .map(AVAudioSession.InterruptionOptions.init(rawValue:)) ?? []
                    if opts.contains(.shouldResume) { self.play() }
                @unknown default:
                    break
                }
            }
        }
    }

    func startRemoteControl() {
        let centre = MPRemoteCommandCenter.shared()
        centre.playCommand.addTarget { [weak self] _ in
            self?.play(); return .success
        }
        centre.pauseCommand.addTarget { [weak self] _ in
            self?.pause(); return .success
        }
        centre.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.toggle(); return .success
        }
        centre.nextTrackCommand.addTarget { [weak self] _ in
            self?.step(1); return .success
        }
        centre.previousTrackCommand.addTarget { [weak self] _ in
            self?.step(-1); return .success
        }
    }

    /// Next/previous move the FEED, not just the audio -- otherwise the lock
    /// screen and the card on screen disagree about which film is playing.
    private func step(_ delta: Int) {
        guard let current = currentPost,
              let i = queue.firstIndex(where: { $0.id == current.id })
        else { return }
        let next = i + delta
        guard queue.indices.contains(next) else { return }
        let post = queue[next]
        load(post)
        play()
        scrollTarget = post.id
    }

    private func publishNowPlaying() {
        guard let post = currentPost else { return }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: post.title,
            MPMediaItemPropertyArtist: "DavidFeed",
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
        ]
        if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
        if let url = post.artworkURL, let image = UIImage(contentsOfFile: url.path) {
            info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in
                image
            }
        }
        if #available(iOS 26, *) { attachAnimatedArtwork(&info, for: post) }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// iOS 26's expansive lock screen artwork, when a card ships the 3:4 pair
    /// for it. The films on this branch do not; the still above stands.
    @available(iOS 26, *)
    private func attachAnimatedArtwork(_ info: inout [String: Any], for post: Post) {
        guard let video = post.animatedArtworkURL,
              let previewURL = post.animatedArtworkPreviewURL
        else { return }
        let supported = MPNowPlayingInfoCenter.supportedAnimatedArtworkKeys
        guard supported.contains(MPNowPlayingInfoProperty3x4AnimatedArtwork) else { return }
        let preview = UIImage(contentsOfFile: previewURL.path)
        let art = MPMediaItemAnimatedArtwork(
            artworkID: "\(post.id)-art34",
            previewImageRequestHandler: { _, completion in completion(preview) },
            videoAssetFileURLRequestHandler: { _, completion in completion(video) }
        )
        info[MPNowPlayingInfoProperty3x4AnimatedArtwork] = art
    }
}
