"use client";

import { AudioOffIcon, AudioOnIcon, PlayIcon } from "./icons";

/*
 * The two stacked indicators Instagram Reels shows on tap: a sound circle
 * above a playback circle, both centred.
 *
 * Measured off a Reels screenshot, as proportions of screen width so they hold
 * at any size: the sound circle is ~8.7% and the playback circle ~12.2%, which
 * is 34 and 46 on a 375-wide screen, with ~58 between their centres. The
 * PLAYBACK circle is the larger of the two, and it sits at the card's centre
 * with the sound circle above it.
 *
 * The glyphs are the Figma exports (Icons/audio-on, audio-off, play, pause),
 * not the stand-ins that were here first. The play mark needs no optical nudge
 * now — the exported glyph is already balanced in its own 48 box.
 *
 * Their sizes look mismatched (20 and 36) and are not, because the two glyphs
 * fill their own viewBoxes by very different amounts: the speaker spans 83.9%
 * of its 48 units, the play mark only 64.7%. Sizing both nominally the same
 * left the play mark reading at 29.5% of its circle against the speaker's
 * 41.9%. These numbers put BOTH glyphs at ~50% of their circle, which is what
 * the eye actually compares. Re-derive them if a glyph is ever swapped.
 *
 * The two audio states are not equal either — the speaker with waves spans
 * 83.9% of its box, the struck-through one only 71.3%, because the slash is
 * more compact than the waves. 22 splits them: 0.54 unmuted, 0.46 muted.
 * A single size cannot put both at exactly 0.50, and giving each state its own
 * size would make the icon jump as it toggled.
 *
 * They differ in what they mean, which is why they differ in size and
 * behaviour: the playback circle is a STATE — it stays for as long as the card
 * is paused — while the sound circle is a CONTROL, tappable in its own right,
 * that fades once it has been acknowledged.
 *
 * Which is why the playback circle is bound to `paused` ALONE and never shows a
 * pause glyph. Tapping a paused card resumes it, and the answer to that is the
 * playback simply starting — holding a pause mark on screen afterwards
 * announces a state the card is no longer in. It fades out still reading play,
 * and the sound circle is the only thing that rides out the hint.
 *
 * The two circles LEAVE TOGETHER, which is why each carries its OWN opacity and
 * the container carries none. Fading a circle inside a fading container
 * multiplies the two alphas, so the inner one visibly darkens first; and any
 * scheme where one circle's opacity trails the other's by a timer has to hold
 * that timer in sync with a CSS duration. Since resuming clears the sound hint
 * (see FeedItem), `visible` and `paused` both go false in the same commit, and
 * two equal transitions started together simply end together.
 *
 * The faded circle keeps its box rather than unmounting, so the sound circle
 * does not slide when playback is toggled.
 */
interface PlaybackOverlayProps {
  paused: boolean;
  soundOn: boolean;
  /** True briefly after a tap, so the pair can show and then fade while playing. */
  hinting: boolean;
  onToggleSound: () => void;
}

const SOUND = 34;
const PLAYBACK = 46;
const GAP = 58 - SOUND / 2 - PLAYBACK / 2; // centres 58 apart
const FADE_MS = 200; // one source of truth: the container's fade and the hold below

export default function PlaybackOverlay({
  paused,
  soundOn,
  hinting,
  onToggleSound,
}: PlaybackOverlayProps) {
  const visible = paused || hinting;
  const fade = { transition: `opacity ${FADE_MS}ms ease-out` };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[30] flex flex-col items-center justify-center"
      // Offset so the PLAYBACK circle lands on the card's centre rather than
      // the pair's midpoint, which is where Reels puts it.
      style={{ paddingBottom: SOUND + GAP }}
    >
      <button
        type="button"
        aria-label={soundOn ? "Mute" : "Unmute"}
        tabIndex={visible ? 0 : -1}
        onClick={(e) => {
          // Without this the tap also reaches the card, which would toggle
          // pause at the same time as the sound.
          e.stopPropagation();
          onToggleSound();
        }}
        className={`flex items-center justify-center rounded-full border-none backdrop-blur-sm
                    ${visible ? "pointer-events-auto scale-100" : "scale-95"}`}
        style={{
          width: SOUND,
          height: SOUND,
          marginBottom: GAP,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
          opacity: visible ? 1 : 0,
        }}
      >
        {soundOn ? <AudioOnIcon size={22} /> : <AudioOffIcon size={22} />}
      </button>

      <div
        aria-hidden
        className="flex items-center justify-center rounded-full backdrop-blur-sm"
        style={{
          width: PLAYBACK,
          height: PLAYBACK,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          ...fade,
          opacity: paused ? 1 : 0,
        }}
      >
        <PlayIcon size={36} />
      </div>
    </div>
  );
}
