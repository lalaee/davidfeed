import CoreHaptics
import UIKit

/// Haptics shaped to match what the eye sees.
///
/// davidfeed can only call `navigator.vibrate(10)` for a save — the web API
/// takes a duration and nothing else, so every event feels identical. CoreHaptics
/// takes intensity, sharpness and time, so the tap can actually follow the
/// bounce instead of just marking that it happened.
@MainActor
enum Haptics {
    private static var engine: CHHapticEngine?
    private static var supported: Bool {
        CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    static func prepare() {
        guard supported, engine == nil else { return }
        engine = try? CHHapticEngine()
        // The engine is stopped when the app backgrounds and after an audio
        // interruption; without these it silently never fires again.
        engine?.stoppedHandler = { _ in try? engine?.start() }
        engine?.resetHandler = { try? engine?.start() }
        try? engine?.start()
    }

    /// The save icon's bounce, felt rather than seen.
    ///
    /// RailButton scales 1 -> 1.25 on a spring of response 0.22 / damping 0.5,
    /// then settles back 180ms later on response 0.3 / damping 0.7. That is two
    /// distinct moments, so this is two transients: a sharp one for the snap
    /// outward, and a softer, rounder one at 0.18s for the settle. The lower
    /// damping on the way out is why the first is the harder of the two.
    static func saveBounce() {
        guard supported else {
            // Older hardware: no pattern player, so the two phases become two
            // impact generators of different weights.
            UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
            Task {
                try? await Task.sleep(for: .milliseconds(180))
                UIImpactFeedbackGenerator(style: .soft).impactOccurred(intensity: 0.5)
            }
            return
        }
        prepare()
        let snap = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                .init(parameterID: .hapticIntensity, value: 1.0),
                .init(parameterID: .hapticSharpness, value: 0.65),
            ],
            relativeTime: 0
        )
        let settle = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                .init(parameterID: .hapticIntensity, value: 0.45),
                .init(parameterID: .hapticSharpness, value: 0.25),
            ],
            relativeTime: 0.18
        )
        guard let pattern = try? CHHapticPattern(events: [snap, settle], parameters: []),
              let player = try? engine?.makePlayer(with: pattern)
        else { return }
        try? player.start(atTime: CHHapticTimeImmediate)
    }
}
