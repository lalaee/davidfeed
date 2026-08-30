/*
 * The topic header, from Figma "New Feed UI" (2623:924) — Frame 36970.
 *
 * Frame     HUG x HUG horizontal auto-layout, gap 4, no padding, items centred.
 *           208x29 at x=83.5 in a 375 frame, so its centre is 187.5 — exactly
 *           half of 375. Centred, not left-positioned at 83.5.
 * Label     Inter Semi Bold 24, letter-spacing -2% (= -0.48px), white.
 * Chevron   25x25 frame; vector 14x7 at (5, 9), stroked 1.5 round. The path is
 *           Figma's own SVG export — Iconly's arrow curves, so a straight V
 *           drawn from the bounding box is the wrong glyph.
 *
 * Vertical placement is the one number that cannot be copied literally. Figma
 * puts it at y=54 in a frame whose 45px status bar is hidden, i.e. 9px below
 * where the status bar ends. The app sets viewportFit:"cover", so on a notched
 * phone the viewport runs under the status bar and a flat 54px would collide
 * with the clock. Hence safe-area + 9, falling back to Figma's own 45px status
 * bar height where there is no inset — which reproduces 54 exactly on desktop.
 *
 * w-max and whitespace-nowrap are load-bearing, not decoration. `left-1/2`
 * makes the containing block only half the viewport wide, so on a 375 screen
 * the header gets 187.5px — and this label plus the chevron want 187.7. It
 * wrapped to two lines and doubled its height. max-content lets it overflow
 * that half and the -translate-x-1/2 pulls it back to centre.
 *
 * That needs max(), not env()'s fallback. The fallback only applies where the
 * variable is UNSUPPORTED; a browser that supports it and has no notch reports
 * 0px, so env(safe-area-inset-top, 45px) yields 0 and the header rides up to
 * 9px. max(inset, 45px) + 9 gives 54 with no notch and inset+9 with one.
 */
interface FeedHeaderProps {
  label: string;
}

export default function FeedHeader({ label }: FeedHeaderProps) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[500] flex w-max -translate-x-1/2
                 items-center gap-[4px] whitespace-nowrap text-white
                 top-[calc(max(env(safe-area-inset-top,0px),45px)+9px)]"
    >
      <span
        className="text-[24px] font-semibold leading-[29px]"
        style={{ letterSpacing: "-0.02em" }}
      >
        {label}
      </span>
      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" aria-hidden>
        {/* Exported from Figma, not traced. Iconly's arrow is a shallow CURVE;
            the straight "M5 9L12 16L19 9" V that the 14x7 bounding box implies
            is a different glyph. */}
        <path
          d="M19 9C19 9 14.856 16 12 16C9.145 16 5 9 5 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
