"use client";

/*
 * "Tap for sound" — shown only when the browser has refused audio.
 *
 * Muted-with-no-explanation reads as broken. Every engine gates unmuted
 * autoplay (iOS Safari forbids it outright; Chrome allows it only once the
 * site's Media Engagement Index has accrued), and there is no legitimate way
 * around that, so the honest fix is to say so and make one tap fix it.
 *
 * It lives in Feed rather than inside a card on purpose. The card has its own
 * tap-to-mute handler, and a button overlapping it would fire both — turning
 * sound on and then straight back off, which is the "tap once, get a mute
 * icon, tap again to actually hear it" bug this project already hit once.
 * Sitting above the nav keeps it outside the card's hit area entirely.
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
      className={`fixed bottom-[calc(95px+env(safe-area-inset-bottom))] left-1/2 z-[9998]
                  flex -translate-x-1/2 items-center gap-[7px] rounded-full border-none
                  py-[9px] pl-[13px] pr-[16px] text-white
                  transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                  ${visible
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-[6px] opacity-0"}`}
      style={{ backgroundColor: "rgba(33, 33, 33, 0.92)" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
      <span className="text-[13px] font-medium leading-none tracking-[-0.1px]">
        Tap for sound
      </span>
    </button>
  );
}
