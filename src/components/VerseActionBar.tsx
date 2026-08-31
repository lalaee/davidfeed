"use client";

import { useState } from "react";

/*
 * The bar that appears when a verse is selected.
 *
 * Figma — "Bible" 2642:1725, frame 36982 — is canon for every number here.
 * It replaces the modal sheet this used to be, and it takes the NAV's place:
 * in the design the nav instance is absent from the selected-verse frame, and
 * the bar sits in the same slot, 10px off the bottom.
 *
 *   bar        333x78, radius 18, fill #0E0E0E, 12px padding
 *   groups     54 tall, radius 11, fill #212121, 8px apart
 *   swatches   4 circles, 28.7 diameter, 34.433 pitch (= 5.733 apart)
 *   action     20x20 icon 8px from the group's top, label at 32
 *   label      the nav's own label style — the Figma layer is literally
 *              named "t.nav.Home" — 11.9048px, 0.02em, regular
 *
 * #0E0E0E over #212121 is the bottom nav's palette exactly, which is the
 * point: this is the nav's slot, so it is built out of the nav's surfaces.
 *
 * It SCROLLS. The design clips its third action at the frame edge, which is
 * not an oversight — the row is a carousel. The actions below are the ones
 * legible in the design; more drop in by extending the array.
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
}

/* Sampled from the design's swatches, left to right. */
export const HIGHLIGHT_COLOURS = ["#F19AEA", "#FFFE54", "#FF548D", "#61D3FA"];

const SWATCH = 28.7;
const SWATCH_GAP = 34.433 - SWATCH;

export default function VerseActionBar({
  highlight,
  onHighlight,
  actions,
}: VerseActionBarProps) {
  return (
    <div
      className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[9999]
                 h-[78px] w-[calc(100%-42px)] max-w-[348px] -translate-x-1/2
                 overflow-x-auto overflow-y-hidden scrollbar-hide
                 rounded-[18px] p-[12px]"
      style={{ backgroundColor: "#0E0E0E" }}
    >
      {/* w-max so the row keeps its natural width and the container scrolls it,
          rather than squeezing the groups to fit. */}
      <div className="flex h-[54px] w-max items-center gap-[8px]">
        {/* Highlighter */}
        <div
          className="flex h-[54px] flex-shrink-0 items-center rounded-[11px] px-[8px]"
          style={{ backgroundColor: "#212121", gap: SWATCH_GAP }}
        >
          {HIGHLIGHT_COLOURS.map((colour) => {
            const on = highlight === colour;
            return (
              <SwatchButton
                key={colour}
                colour={colour}
                selected={on}
                // Tapping the colour a verse already carries clears it, so the
                // same control both applies and removes.
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

  return (
    <button
      type="button"
      aria-label={`Highlight ${colour}`}
      aria-pressed={selected}
      onClick={onClick}
      {...handlers}
      className="relative flex flex-shrink-0 items-center justify-center rounded-full border-none bg-transparent p-0
                 transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        width: SWATCH,
        height: SWATCH,
        transform: pressed ? "scale(0.94)" : undefined,
      }}
    >
      <span
        className="block h-full w-full rounded-full"
        style={{ backgroundColor: colour }}
      />
      {/* Selection ring, drawn outside the swatch so it never shrinks the
          colour. The pop replays on its own: moving between colours removes
          the class from one swatch and adds it to the other, and CSS restarts
          an animation whenever its class arrives. No key or timer needed. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute rounded-full transition-opacity duration-200
                    ${selected ? "animate-icon-pop opacity-100" : "opacity-0"}`}
        style={{
          inset: -4,
          border: "2px solid #FFFFFF",
        }}
      />
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
      className="flex h-[54px] flex-shrink-0 flex-col items-center rounded-[11px] border-none px-[16px] pt-[8px]
                 transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        backgroundColor: "#212121",
        transform: pressed ? "scale(0.94)" : undefined,
      }}
    >
      <span className="flex h-[20px] w-[20px] items-center justify-center text-white">
        {action.icon}
      </span>
      {/* 32 from the group's top: 8 padding + 20 icon + 4. */}
      <span
        className="mt-[4px] block h-[14px] leading-[14px] text-white"
        style={{ fontSize: 11.9048, letterSpacing: "0.02em" }}
      >
        {action.label}
      </span>
    </button>
  );
}
