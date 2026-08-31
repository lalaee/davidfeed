"use client";

import { useEffect, useRef, useState } from "react";
import { TOPICS } from "@/data/topics";

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
 * with the clock. Hence an offset from the safe area, falling back to Figma's
 * own 45px status bar height where there is no inset.
 *
 * That offset is 9 minus the 10px the header was later raised by eye, so it is
 * NEGATIVE: the label now sits 1px above where the status bar ends, and 44px
 * from the top on a screen with no notch. Keep the subtraction rather than
 * folding it into the 45, so the two terms stay readable as "status bar" and
 * "adjustment".
 *
 * That needs max(), not env()'s fallback. The fallback only applies where the
 * variable is UNSUPPORTED; a browser that supports it and has no notch reports
 * 0px, so env(safe-area-inset-top, 45px) yields 0 and the header rides up to
 * 9px. max(inset, 45px) + 9 gives 54 with no notch and inset+9 with one.
 *
 * The spaces around the - are REQUIRED. Inside calc(), + and - must have
 * whitespace on both sides; "45px)+9px" parses into the inline style happily
 * and then resolves to `auto`, which put both the header and the menu at
 * top:0. Written with spaces it computes to 54px. Tailwind normalises this for
 * arbitrary values, which is why it only broke once these moved to a style
 * object.
 *
 * w-max and whitespace-nowrap are load-bearing, not decoration. `left-1/2`
 * makes the containing block only half the viewport wide, so on a 375 screen
 * the header gets 187.5px — and this label plus the chevron want 187.7. It
 * wrapped to two lines and doubled its height. max-content lets it overflow
 * that half and the -translate-x-1/2 pulls it back to centre.
 *
 * The menu itself is not in the design — only the chevron implying one is — so
 * it follows the app's existing language rather than inventing a surface: the
 * nav's flat near-black pill, and #212121 for the selected row, matching
 * nav.selected.
 */
interface FeedHeaderProps {
  topicId: string;
  onSelect: (topicId: string) => void;
}

const TOP = "calc(max(env(safe-area-inset-top, 0px), 45px) - 1px)";
// Held 39px below the header, the gap it has always had.
const PANEL_TOP = "calc(max(env(safe-area-inset-top, 0px), 45px) + 38px)";

export default function FeedHeader({ topicId, onSelect }: FeedHeaderProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const label = TOPICS.find((t) => t.id === topicId)?.label ?? TOPICS[0].label;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Move focus into the open menu so it is reachable without a pointer.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open]);

  return (
    <>
      {/* Catches the outside tap. Also stops it reaching the card underneath,
          whose own handler would otherwise toggle sound while closing. */}
      {open && (
        <div className="fixed inset-0 z-[550]" aria-hidden onClick={() => setOpen(false)} />
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Topic: ${label}. Change topic`}
        className="fixed left-1/2 z-[600] flex w-max -translate-x-1/2 items-center gap-[4px] desk:hidden
                   whitespace-nowrap border-none bg-transparent p-0 text-white"
        style={{ top: TOP }}
      >
        <span
          className="text-[24px] font-semibold leading-[29px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {label}
        </span>
        <svg
          width="25"
          height="25"
          viewBox="0 0 25 25"
          fill="none"
          aria-hidden
          className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
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
      </button>

      <div
        ref={panelRef}
        role="listbox"
        aria-label="Topics"
        className={`fixed left-1/2 z-[600] w-[230px] -translate-x-1/2 overflow-hidden desk:hidden
                    rounded-[20px] p-[6px]
                    transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${
                      open
                        ? "pointer-events-auto scale-100 opacity-100"
                        : "pointer-events-none scale-[0.96] opacity-0"
                    }`}
        style={{ top: PANEL_TOP, backgroundColor: "rgba(20, 20, 22, 0.96)" }}
      >
        {TOPICS.map((t) => {
          const selected = t.id === topicId;
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onSelect(t.id);
                setOpen(false);
              }}
              className={`flex h-[44px] w-full items-center justify-between rounded-[14px]
                          border-none px-[14px] text-left text-[16px] text-white
                          ${selected ? "font-medium" : "bg-transparent font-normal"}`}
              style={selected ? { backgroundColor: "#212121" } : undefined}
            >
              {t.label}
              {selected && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3 8.5L6.2 11.5L13 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
