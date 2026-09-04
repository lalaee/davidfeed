import AVFoundation
import Observation

/// The continuous ambient bed that plays under the narration.
///
/// davidfeed renders this as "one element for the whole feed, outside the card
/// wrappers so scrolling never interrupts it" — it is deliberately NOT the
/// card's, so moving between cards does not restart or gap it. This is the same
/// idea: a single player owned above the cards, started and stopped by the
/// feed's sound state alone.
///
/// It also pauses rather than stops: the web comment is explicit — "pause, never
/// reset — resuming keeps its position" — so turning sound off and on again
/// carries on where it was instead of snapping back to the top of the loop.
@Observable
@MainActor
final class AmbientBed {
    static let shared = AmbientBed()

    /// BED_VOLUME in Feed.tsx. Low enough to sit under a voice.
    private static let volume: Float = 0.25

    private var player: AVAudioPlayer?

    private init() {}

    private func load() {
        guard player == nil,
              let url = Bundle.main.url(forResource: "ambient-bed", withExtension: "m4a")
        else { return }
        player = try? AVAudioPlayer(contentsOf: url)
        player?.numberOfLoops = -1          // loop for the life of the feed
        player?.volume = Self.volume
        player?.prepareToPlay()
    }

    func play() {
        load()
        guard let player, !player.isPlaying else { return }
        player.play()
    }

    /// Pause, never stop — position is kept so resuming is seamless.
    func pause() {
        player?.pause()
    }
}
