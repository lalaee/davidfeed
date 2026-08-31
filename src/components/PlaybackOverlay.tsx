"use client";

import { PlayIcon } from "./icons";

/*
 * The pause indicator Reels shows on tap: one circle, centred on the card.
 *
 * It was a stacked PAIR — a sound circle above a playback circle — until the
 * sound control was dropped. Tapping now means one thing, pause and resume
 * together, so there is one circle to say it with. Unmuting is the SoundBadge's
 * job, and only when the browser actually refused audio.
 *
 * Sized off a Reels screenshot as a proportion of screen width so it holds at
 * any size: ~12.2%, which is 46 on a 375-wide screen.
 *
 * The glyph is the Figma export (Icons/play). 36 looks large against the 46
 * circle and is not: the play mark spans only 64.7% of its own 48-unit
 * viewBox, so 36 puts the visible triangle at ~50% of the circle, which is
 * what the eye actually compares. Re-derive it if the glyph is ever swapped.
 *
 * It only ever draws PLAY, never a pause mark. Tapping a paused card resumes
 * it, and the answer to that is the playback starting — holding a pause mark on
 * screen afterwards announces a state the card is no longer in. It fades out
 * still reading play.
 */
interface PlaybackOverlayProps {
  paused: boolean;
}

const PLAYBACK = 46;
const FADE_MS = 200;

export default function PlaybackOverlay({ paused }: PlaybackOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center"
    >
      <div
        aria-hidden
        className="flex items-center justify-center rounded-full backdrop-blur-sm"
        style={{
          width: PLAYBACK,
          height: PLAYBACK,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
          transition: `opacity ${FADE_MS}ms ease-out`,
          opacity: paused ? 1 : 0,
        }}
      >
        <PlayIcon size={36} />
      </div>
    </div>
  );
}
