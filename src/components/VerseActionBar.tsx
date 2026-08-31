"use client";

import { useEffect, useRef, useState } from "react";

import { HighlightCancelIcon } from "./icons";

/*
 * The bar that appears when a verse is selected.
 *
 * Figma — "Contextual-highlight" 2649:2528, frame 36982 — is canon for every
 * number here. It is CONTEXTUAL: it floats 17px below the verse you tapped and
 * overlaps the verses beneath it, rather than sitting in a fixed slot. An
 * earlier frame pinned it to the bottom; this one does not, and the name says
 * which is intended.
 *
 * The nav is absent while a verse is selected, as in every selected-verse
 * frame.
 *
 *   bar        333x78, radius 22, fill #0E0E0E, 12px padding, 17px below the
 *              selected verse
 *   groups     54 tall, radius 14, fill #212121, 8px apart
 *   swatches   4 circles, 28.7 across, in a fixed 148x54 group padded 8 and
 *              space-between — which computes the 5.73 gap; do not hard-code it
 *   action     column, 8px 12px padding, 20x20 icon, 4px gap, hugging its label
 *   label      the nav's own label style — the Figma layer is literally
 *              named "t.nav.Home" — Inter 400, 11.9048px, 2% tracking
 *
 * #0E0E0E over #212121 is the bottom nav's palette exactly, which is the
 * point: this is the nav's slot, so it is built out of the nav's surfaces.
 *
 * The width comes from the verse row it hangs off: the column is inset 27 and
 * the bar 21, so reaching 6px past the row on each side gives the design's
 * 21px margins at any screen width without restating the number.
 *
 * It SCROLLS. The design clips Save at the frame edge because the row is a
 * carousel: 148 + 8 + 77 + 8 + 58 + 8 + 53 = 360 against 309 of usable width.
 * More actions drop in by extending the array.
 *
 * Radii and paddings here come from the file, not from measuring the render —
 * a render measures ~3-4px low on a radius, which is how an earlier pass
 * turned the bar's 22 into 18 and the groups' 14 into 11.
 */
export interface VerseAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface VerseActionBarProps {
  highlight: string | null;
  onHighlight: (colour: string | null) => void;
  actions: VerseAction[];
  /** Below the verse, or above it when there is no room below. */
  placement: "above" | "below";
}

/* Sampled from the design's swatches, left to right. */
export const HIGHLIGHT_COLOURS = ["#F19AEA", "#FFFE54", "#FF548D", "#61D3FA"];

const SWATCH = 28.7;
/* Fixed, because the group is fixed-width and space-between in the design. */
const SWATCH_GROUP_W = 148;

export default function VerseActionBar({
  highlight,
  onHighlight,
  actions,
  placement,
}: VerseActionBarProps) {
  return (
    <div
      className={`animate-slide-up absolute left-[-6px] right-[-6px] z-[40]
                  h-[78px] overflow-x-auto overflow-y-hidden scrollbar-hide
                  rounded-[22px] p-[12px]
                  ${placement === "below" ? "top-[calc(100%+17px)]" : "bottom-[calc(100%+17px)]"}`}
      // -6 either side because the verse column is inset 27 and the bar 21:
      // the row's width plus 12 is exactly the design's calc(100% - 42px), at
      // any screen width, without repeating the number.
      style={{ backgroundColor: "#0E0E0E" }}
    >
      {/* w-max so the row keeps its natural width and the container scrolls it,
          rather than squeezing the groups to fit. */}
      <div className="flex h-[54px] w-max items-center gap-[8px]">
        {/* Highlighter */}
        <div
          className="flex h-[54px] flex-shrink-0 items-center justify-between rounded-[14px] px-[8px]"
          style={{ backgroundColor: "#212121", width: SWATCH_GROUP_W }}
        >
          {HIGHLIGHT_COLOURS.map((colour) => {
            const on = highlight === colour;
            return (
              <SwatchButton
                key={colour}
                colour={colour}
                selected={on}
                // Tapping the colour a verse already carries clears it, so the
                // same control both applies and removes. The applied swatch
                // wears an X to say so — without it the removal is a gesture
                // you can only find by guessing.
                onClick={() => onHighlight(on ? null : colour)}
              />
            );
          })}
        </div>

        {actions.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

/*
 * Press feedback is React state rather than CSS :active — :active never
 * reaches a child and is unreliable on iOS Safari, which is the same reason
 * IconButton in the feed does it this way.
 */
function usePress() {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  return {
    pressed,
    handlers: {
      onPointerDown: () => setPressed(true),
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
      onPointerOut: release,
      onBlur: release,
    },
  };
}

function SwatchButton({
  colour,
  selected,
  onClick,
}: {
  colour: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { pressed, handlers } = usePress();

  /*
   * The pop is fired from the tap that APPLIES the colour, not from the
   * `selected` prop, so it never needs a setState inside an effect. It is also
   * cleared afterwards: the animation fills forwards, and a held final frame
   * would outrank the inline press transform for as long as the swatch stayed
   * selected — the button would stop answering the finger.
   */
  const [popping, setPopping] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClick = () => {
    if (!selected) {
      // Drop the class for a frame first, or re-applying it will not replay.
      setPopping(false);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => setPopping(true));
      if (timerRef.current) clearTimeout(timerRef.current);
      // Must outlast the 0.53s spring.
      timerRef.current = setTimeout(() => setPopping(false), 580);
    }
    onClick();
  };

  return (
    <button
      type="button"
      aria-label={selected ? "Remove highlight" : `Highlight ${colour}`}
      aria-pressed={selected}
      onClick={handleClick}
      {...handlers}
      className={`relative flex flex-shrink-0 items-center justify-center rounded-full border-none bg-transparent p-0
                  transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                  ${popping ? "animate-swatch-pop" : ""}`}
      style={{
        width: SWATCH,
        height: SWATCH,
        transform: pressed && !popping ? "scale(0.94)" : undefined,
      }}
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ backgroundColor: colour }}
      >
        {/* #0E0E0E is the design's own stroke colour, and it has to be dark:
            every swatch is a bright pastel and a white cross would disappear
            into the yellow. */}
        {selected && (
          <span className="flex" style={{ color: "#0E0E0E" }}>
            <HighlightCancelIcon size={12} />
          </span>
        )}
      </span>
    </button>
  );
}

function ActionButton({ action }: { action: VerseAction }) {
  const { pressed, handlers } = usePress();
  return (
    <button
      type="button"
      onClick={action.onSelect}
      {...handlers}
      className="flex h-[54px] flex-shrink-0 flex-col items-center gap-[4px] rounded-[14px] border-none px-[12px] py-[8px]
                 transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        backgroundColor: "#212121",
        transform: pressed ? "scale(0.94)" : undefined,
      }}
    >
      <span className="flex h-[20px] w-[20px] items-center justify-center text-white">
        {action.icon}
      </span>
      <span
        className="block whitespace-nowrap text-white"
        style={{ fontSize: 11.9048, lineHeight: "14.4px", letterSpacing: "0.02em" }}
      >
        {action.label}
      </span>
    </button>
  );
}
