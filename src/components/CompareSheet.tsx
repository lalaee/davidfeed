"use client";

import { useState } from "react";

import { CloseIcon, DoneCheckIcon, VersionsIcon } from "./icons";
import type { Translation } from "@/data/bible";

/*
 * The verse compared across translations.
 *
 * Figma "Bible" 2646:2163, frame 36942, is canon:
 *
 *   card       333x444, radius 18.8333, fill #0E0E0E, padding 24/16, gap 32
 *   at         x=21, 10 from the bottom — the same slot the nav and the verse
 *              action bar occupy, so the three never disagree about where a
 *              floating surface sits
 *   header     48 tall (a MINIMUM here — see the reference below), gap 10: a
 *              48x48 close circle, the reference, then a hugging "Versions"
 *              button
 *   buttons    #212121, fully round, 6/20 padding, 4 gap, 20x20 icon
 *   reference  Inter Semi Bold 17/150%
 *   label      Inter Medium 15, #999999
 *   verse      Inter Regular 18/150%, #FFFFFF
 *
 * It is a floating CARD, not a bottom sheet: all four corners are rounded and
 * it stops 21px short of each edge. The old version was edge-anchored with
 * only its top corners rounded, wrapped each translation in its own #1c1c1e
 * card, and set the verses at 22px — none of which the design has.
 *
 * The 333 is those 21px margins on the design's 375, so the width tracks the
 * app shell rather than a fixed number — and the cap has to track it too. The
 * shell is w-full below md, 390 above it and 782 at desk, so the caps are
 * 348 (390 - 42) and 740 (782 - 42). The desk one was missing, which left the
 * card as a narrow strip down the middle of a wide reader with the verses
 * running past it on both sides. Neither cap applies on a phone.
 *
 * The backdrop is transparent and exists only so a tap outside can close it.
 *
 * The text is the verses the reader actually selected, in each translation,
 * joined in reading order. It used to be one hard-coded sample of 46:1 no
 * matter what was picked. A multi-verse selection can outgrow the design's
 * fixed 444, so the body scrolls rather than the card growing off screen.
 *
 * "Versions" swaps THIS card's body for the translation picker rather than
 * opening a second surface. The design does not draw a picker, and the bottom
 * slot already holds the nav, the action bar and this card — a fourth thing to
 * arbitrate between would be the wrong answer to "where does it go". The
 * header, the reference and the button stay put; only the body changes, so the
 * card never moves under the thumb that opened it.
 */
interface CompareSheetProps {
  verseRef: string;
  /** The selected verse numbers, already sorted. */
  verseNumbers: number[];
  /** The translations currently listed. */
  translations: Translation[];
  /** Everything that could be listed, for the picker. */
  allTranslations: Translation[];
  onToggleVersion: (id: string) => void;
  onClose: () => void;
}

export default function CompareSheet({
  verseRef,
  verseNumbers,
  translations,
  allTranslations,
  onToggleVersion,
  onClose,
}: CompareSheetProps) {
  const [picking, setPicking] = useState(false);
  const listedIds = translations.map((t) => t.id);
  return (
    <>
      {/* Transparent — the design dims nothing. It is here to catch a tap. */}
      <div className="fixed inset-0 z-[110]" onClick={onClose} />

      <div
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[111]
                   flex max-h-[calc(100dvh-120px)] w-[calc(100%-42px)] -translate-x-1/2
                   flex-col gap-[32px] md:max-w-[348px] sheet-column
                   rounded-[18.8333px] px-[16px] py-[24px]"
        style={{ backgroundColor: "#0E0E0E" }}
      >
        {/* Header — close, reference, versions */}
        <div className="flex min-h-[48px] flex-shrink-0 items-center gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-full
                       border-none text-white transition-transform duration-[190ms]
                       ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94]"
            style={{ backgroundColor: "#212121" }}
          >
            <CloseIcon size={20} />
          </button>

          {/*
            Wraps rather than truncating. The row leaves the reference 115.9px
            on a phone, and it is the card's own TITLE — "Psalms 46 v 1-2"
            needs 129.4 and was arriving as "Psalms 46 …", while
            "1 Thessalonians 5 v 12-14" needs 208.2, so no amount of trimming
            the controls either side buys a single line for every chapter.
            Two lines, not three: the constraint is WIDTH, not line count.
            "Thessalonians" alone is ~118px in a 115.9px column, so it overflows
            its line whatever the clamp is — measured, three lines still
            overflowed horizontally and cost a 76.5px header. Two covers every
            Psalms reference, which is what this app is about, and the header is
            min-h so the common single-line case still sits at the design's 48.
          */}
          <p className="line-clamp-2 min-w-0 flex-1 text-[17px] font-semibold leading-[25.5px] text-white">
            {verseRef}
          </p>

          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-pressed={picking}
            className="flex h-[48px] flex-shrink-0 items-center gap-[4px] rounded-full border-none
                       transition-transform duration-[190ms]
                       px-[20px] py-[6px] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94]"
            // White while picking, the way the nav marks its current tab —
            // the button is a mode, so it shows which mode you are in. #000000
            // rather than the card's #0E0E0E because the design specifies black
            // for this label and its glyph.
            style={{
              backgroundColor: picking ? "#FFFFFF" : "#212121",
              color: picking ? "#000000" : "#FFFFFF",
            }}
          >
            {/* The pencil offers the choice; the check confirms it. Two states,
                two glyphs — the pencil sitting next to "Done" read as if it
                would edit something. */}
            {picking ? <DoneCheckIcon size={20} /> : <VersionsIcon size={20} />}
            <span className="whitespace-nowrap text-[13px] font-normal leading-[16px]">
              {picking ? "Done" : "Versions"}
            </span>
          </button>
        </div>

        {picking ? (
          /* Picker — which translations the comparison lists. */
          <div className="scrollbar-hide flex flex-col gap-[8px] overflow-y-auto">
            {allTranslations.map((t) => {
              const on = listedIds.includes(t.id);
              const only = on && listedIds.length === 1;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onToggleVersion(t.id)}
                  aria-pressed={on}
                  // The last one left cannot be turned off, so it says so
                  // rather than swallowing the tap without explanation.
                  disabled={only}
                  className="flex h-[48px] w-full flex-shrink-0 items-center justify-between rounded-[14px]
                             border-none px-[16px] text-left transition-transform duration-[190ms]
                             ease-[cubic-bezier(0.32,0.72,0,1)] enabled:active:scale-[0.98]"
                  style={{ backgroundColor: on ? "#212121" : "transparent" }}
                >
                  <span
                    className="text-[15px] font-medium leading-[18px]"
                    style={{ color: on ? "#FFFFFF" : "#999999" }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="text-[13px] leading-[16px]"
                    style={{ color: only ? "#666666" : on ? "#FFFFFF" : "#666666" }}
                  >
                    {only ? "only one left" : on ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Translations — no card behind each one; they sit on the surface. */
          <div className="scrollbar-hide flex flex-col gap-[32px] overflow-y-auto">
            {translations.map((t) => {
              // A verse the translation does not carry is skipped rather than
              // rendered as a gap, so a partial selection still reads cleanly.
              const text = verseNumbers
                .map((n) => t.verses[n])
                .filter(Boolean)
                .join(" ");
              return (
                <div key={t.id} className="flex flex-col gap-[12px]">
                  <p
                    className="text-[15px] font-medium leading-[18px]"
                    style={{ color: "#999999" }}
                  >
                    {t.label}
                  </p>
                  <p className="text-[18px] font-normal leading-[27px] text-white">
                    {text || "Not available for this passage."}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
