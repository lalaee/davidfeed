import AVFoundation
import SwiftUI

/// A silent, seamlessly looping video layer for a card's artwork.
///
/// `VideoPlayer` is the wrong tool here — it brings transport controls and its
/// own gesture handling, and the card needs the whole surface for taps. This is
/// an `AVPlayerLayer` driven by `AVPlayerLooper`, which loops without the gap a
/// `.didPlayToEndTime` + `seek(.zero)` cycle leaves.
struct LoopPlayerView: UIViewRepresentable {
    let url: URL
    /// Loops are decorative; the card pauses them off-screen to keep scrolling smooth.
    var isPlaying: Bool
    /// The active card's loop is what the tab bar reflects.
    var reflects = false

    func makeUIView(context: Context) -> LoopPlayerUIView { LoopPlayerUIView(url: url) }

    func updateUIView(_ view: LoopPlayerUIView, context: Context) {
        view.setPlaying(isPlaying)
        view.setReflecting(reflects)
    }

    static func dismantleUIView(_ view: LoopPlayerUIView, coordinator: ()) {
        view.tearDown()
    }
}

final class LoopPlayerUIView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    private var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }

    private let queuePlayer = AVQueuePlayer()
    private var looper: AVPlayerLooper?
    /// What we were last asked for, so a player that was not ready when asked
    /// can still start once it is.
    private var wantsPlaying = false
    private var statusObservation: NSKeyValueObservation?

    init(url: URL) {
        super.init(frame: .zero)
        let item = AVPlayerItem(url: url)
        looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
        queuePlayer.isMuted = true          // narration is a separate track
        queuePlayer.actionAtItemEnd = .advance
        playerLayer.player = queuePlayer
        playerLayer.videoGravity = .resizeAspectFill
        backgroundColor = .clear   // the still artwork shows through until the
                                   // first frame is ready, instead of a black box

        // play() on a player whose items are not ready yet is a no-op, and
        // nothing retried it — the loop would stay frozen on a card that had
        // simply been asked too early.
        statusObservation = queuePlayer.observe(\.status, options: [.new]) { [weak self] player, _ in
            guard let self, player.status == .readyToPlay, self.wantsPlaying else { return }
            player.play()
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    func setPlaying(_ playing: Bool) {
        wantsPlaying = playing
        if playing, queuePlayer.timeControlStatus != .playing {
            queuePlayer.play()
        } else if !playing, queuePlayer.timeControlStatus != .paused {
            queuePlayer.pause()
        }
    }

    func setReflecting(_ on: Bool) {
        if on { ReflectionSampler.shared.attach(queuePlayer) } else { ReflectionSampler.shared.detach(queuePlayer) }
    }

    func tearDown() {
        wantsPlaying = false
        ReflectionSampler.shared.detach(queuePlayer)
        statusObservation?.invalidate()
        statusObservation = nil
        queuePlayer.pause()
        queuePlayer.removeAllItems()
        looper?.disableLooping()
        looper = nil
        playerLayer.player = nil
    }
}
