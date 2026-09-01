"use client";

/*
 * "Tap for sound" — shown only when the browser has refused audio.
 *
 * Muted-with-no-explanation reads as broken. Every engine gates unmuted
 * autoplay (iOS Safari forbids it outright; Chrome allows it only once the
 * site's Media Engagement Index has accrued), and there is no legitimate way
 * around that, so the honest fix is to say so and make one tap fix it.
 *
 * It sits in the middle of the card, where it is actually noticed. Above the
 * nav it was competing with the tab bar and half-covered by the next card's
 * edge.
 *
 * Overlapping the artwork is safe even though the card has its own
 * tap-to-mute handler, because this is rendered in Feed, OUTSIDE the card's
 * DOM. Events bubble up the tree, not down the visual stack, so a tap here
 * reaches Feed and never the card's handler — no risk of turning sound on and
 * straight back off, which is the "tap once, get a mute icon, tap again" bug
 * this project already hit once.
 *
 * Vertical centring uses the card's own height, not the viewport's. A card is
 * calc(100dvh - 138px), so viewport-centring would sit 69px low.
 *
 * At desk the card is not the window either — it is 622 wide, anchored right,
 * and starts 221 down — so .sound-badge in globals.css re-centres it on the
 * card there. Centred on the viewport it sat out on the black beside the feed.
 */
interface SoundBadgeProps {
  visible: boolean;
  onEnable: () => void;
}

export default function SoundBadge({ visible, onEnable }: SoundBadgeProps) {
  return (
    <button
      type="button"
      onClick={onEnable}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      aria-label="Tap for sound"
      className={`sound-badge fixed left-1/2 top-[calc((100dvh-138px)/2)] z-[9998]
                  flex -translate-x-1/2 items-center gap-[9px] rounded-full border-none
                  py-[13px] pl-[20px] pr-[24px] text-white
                  transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                  ${visible
                    ? "pointer-events-auto -translate-y-1/2 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1/2 scale-[0.94] opacity-0"}`}
      style={{ backgroundColor: "rgba(28, 28, 30, 0.94)" }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
      <span className="text-[16px] font-medium leading-none tracking-[-0.2px]">
        Tap for sound
      </span>
    </button>
  );
}
