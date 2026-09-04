import AVFoundation
import MediaPlayer
import Observation
import UIKit

/// The app's one audio player.
///
/// This used to be a `@State Narration` inside FeedCardView, which is the exact
/// mistake the Now Playing docs warn about: a player owned by a view dies with
/// the view, so backgrounding the app or scrolling the card away tears down the
/// session and leaves the system UI stale. Playback outlives every view, and the
/// cards only tell it which post is current.
///
/// It owns three things that have to agree with each other: the narration, the
/// ambient bed under it, and what the lock screen and Dynamic Island are showing.
@Observable
@MainActor
final class Playback {
    static let shared = Playback()

    private(set) var currentPost: Post?
    private(set) var time: Double = 0
    private(set) var isPlaying = false

    private var player: AVPlayer?
    private var observer: Any?
    private var endObserver: NSObjectProtocol?
    private var startAt: Double = 0
    private var duration: Double = 0

    private init() {}

    // MARK: session

    /// `.playback` keeps audio alive when the screen locks; it is the half of
    /// background audio that lives in code. The other half is the
    /// UIBackgroundModes "audio" entitlement — without BOTH, playback stops the
    /// moment the app leaves the foreground.
    static func configureSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio)
        try? session.setActive(true)
    }

    // MARK: the current card

    /// The feed says which card is current; whether sound is on is this
    /// object's own business. Passing a separate flag in let the two disagree —
    /// starting playback from the lock screen never touched it.
    func activate(_ post: Post) {
        guard currentPost?.id != post.id else { return }
        let wasPlaying = isPlaying
        load(post)
        // Scrolling to a new card keeps whatever the reader chose: playing stays
        // playing, silent stays silent.
        if wasPlaying { play() }
    }

    /// The ordered cards, so next/previous can move through them. Set by the
    /// feed and kept current — the closure that used to do this captured the
    /// view's state at onAppear and went stale the moment anything scrolled.
    private(set) var queue: [Post] = []
    func setQueue(_ posts: [Post]) { queue = posts }

    /// Where the feed should scroll to, when the lock screen moves the track.
    private(set) var scrollTarget: Int?
    func clearScrollTarget() { scrollTarget = nil }

    private func load(_ post: Post) {
        teardown()
        currentPost = post
        startAt = post.startAt ?? 0
        guard let url = post.narrationURL else { return }

        let item = AVPlayerItem(url: url)
        let p = AVPlayer(playerItem: item)
        p.actionAtItemEnd = .none
        player = p
        duration = item.asset.duration.seconds.isFinite ? item.asset.duration.seconds : 0

        observer = p.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.05, preferredTimescale: 600), queue: .main
        ) { [weak self] t in
            // Only the playhead. Rewriting nowPlayingInfo here as well meant
            // rebuilding that dictionary twenty times a second for a value the
            // system already extrapolates from rate + elapsed.
            self?.time = t.seconds
        }
        // The recordings open with a spoken reference and some silence, so every
        // loop returns to the measured start of speech rather than to zero.
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            self.seekToStart()
            if self.isPlaying { self.player?.play() }
        }
        seekToStart()
        publishNowPlaying()
    }

    private func seekToStart() {
        player?.seek(to: CMTime(seconds: startAt, preferredTimescale: 600),
                     toleranceBefore: .zero, toleranceAfter: .zero)
        time = startAt
    }

    // MARK: transport

    func play() {
        guard let player else { return }
        player.play()
        isPlaying = true
        AmbientBed.shared.play()
        publishNowPlaying()
    }

    func pause() {
        player?.pause()
        isPlaying = false
        AmbientBed.shared.pause()
        publishNowPlaying()
    }

    func toggle() { isPlaying ? pause() : play() }

    private func teardown() {
        player?.pause()
        if let observer { player?.removeTimeObserver(observer) }
        if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
        observer = nil
        endObserver = nil
        player = nil
    }

    // MARK: lock screen / Dynamic Island

    /// The remote commands the system surfaces. Registered once, at launch.
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
                    AmbientBed.shared.pause()
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

    /// Next/previous move the FEED, not just the audio — otherwise the lock
    /// screen and the card on screen disagree about which verse is playing.
    private func step(_ delta: Int) {
        guard let current = currentPost,
              let i = queue.firstIndex(where: { $0.id == current.id })
        else { return }
        let next = i + delta
        guard queue.indices.contains(next) else { return }
        let post = queue[next]
        load(post)
        play()
        // The card on screen has to follow, or the lock screen and the feed end
        // up showing different verses.
        scrollTarget = post.id
    }

    private func publishNowPlaying() {
        guard let post = currentPost else { return }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: post.title,
            MPMediaItemPropertyArtist: "DavidFeed",
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: time,
        ]
        if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }

        // The card's own artwork becomes the lock-screen and Dynamic Island
        // thumbnail. Loaded from the bundle and handed over at whatever size the
        // system asks for, rather than shipping one huge image into the info
        // dictionary.
        if let url = post.artworkURL, let image = UIImage(contentsOfFile: url.path) {
            info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in
                image
            }
        }
        attachAnimatedArtwork(&info, for: post)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// The Apple-Music-style expansive lock screen artwork, via iOS 26's
    /// MPMediaItemAnimatedArtwork. The still image above stays as the fallback:
    /// the system uses it wherever animated artwork is not shown.
    ///
    /// Only the keys the system reports as supported are set —
    /// `supportedAnimatedArtworkKeys` — rather than assuming 1x1 and 3x4 are
    /// both available. Our assets are 3:4, so a 1x1 slot is left alone rather
    /// than filled with something the system would likely reject.
    private func attachAnimatedArtwork(_ info: inout [String: Any], for post: Post) {
        guard let video = post.animatedArtworkURL,
              let previewURL = post.animatedArtworkPreviewURL
        else { return }
        let supported = MPNowPlayingInfoCenter.supportedAnimatedArtworkKeys
        guard supported.contains(MPNowPlayingInfoProperty3x4AnimatedArtwork) else { return }

        // Preloaded: the handler is asked to answer quickly, ideally
        // synchronously, so the image is not decoded inside the callback.
        let preview = UIImage(contentsOfFile: previewURL.path)
        let art = MPMediaItemAnimatedArtwork(
            // Identifies the preview AND the video together: change either and
            // this has to change, or the system keeps showing the old pair.
            artworkID: "\(post.id)-art34",
            previewImageRequestHandler: { _, completion in completion(preview) },
            videoAssetFileURLRequestHandler: { _, completion in completion(video) }
        )
        info[MPNowPlayingInfoProperty3x4AnimatedArtwork] = art
    }

    /// Captions for the card currently playing.
    func caption(for post: Post) -> Subtitle? {
        guard currentPost?.id == post.id, isPlaying else { return nil }
        return post.caption(at: time)
    }
}
