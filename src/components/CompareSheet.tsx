"use client";

import { CloseIcon, VersionsIcon } from "./icons";

/*
 * The verse compared across translations.
 *
 * Figma "Bible" 2646:2163, frame 36942, is canon:
 *
 *   card       333x444, radius 18.8333, fill #0E0E0E, padding 24/16, gap 32
 *   at         x=21, 10 from the bottom — the same slot the nav and the verse
 *              action bar occupy, so the three never disagree about where a
 *              floating surface sits
 *   header     48 tall, gap 10: a 48x48 close circle, the reference, then a
 *              hugging "Versions" button
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
 * app shell rather than a fixed number. The shell is w-full below md and 390
 * above it, so the cap is md:max-w-[348px] (390 - 42) and never applies on a
 * phone. Capped unconditionally, this sat as a narrow column down the middle
 * of a wider screen while the verses behind it ran edge to edge.
 *
 * There is no scrim. The design leaves the verses behind it at full
 * brightness, so the reader does not recede either; the backdrop here is
 * transparent and exists only so a tap outside can close it.
 */
const VERSIONS = [
  { label: "NIV", text: "God is our refuge and strength, an ever-present help in trouble." },
  { label: "NKJV", text: "God is our refuge and strength, a very present help in trouble." },
  { label: "ASV", text: "God is our refuge and strength, a very present help in trouble." },
];

interface CompareSheetProps {
  verseRef: string;
  onClose: () => void;
}

export default function CompareSheet({ verseRef, onClose }: CompareSheetProps) {
  return (
    <>
      {/* Transparent — the design dims nothing. It is here to catch a tap. */}
      <div className="fixed inset-0 z-[110]" onClick={onClose} />

      <div
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[111]
                   flex w-[calc(100%-42px)] -translate-x-1/2 flex-col gap-[32px]
                   md:max-w-[348px]
                   rounded-[18.8333px] px-[16px] py-[24px]"
        style={{ backgroundColor: "#0E0E0E" }}
      >
        {/* Header — close, reference, versions */}
        <div className="flex h-[48px] flex-shrink-0 items-center gap-[10px]">
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

          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-[25.5px] text-white">
            {verseRef}
          </p>

          <button
            type="button"
            className="flex h-[48px] flex-shrink-0 items-center gap-[4px] rounded-full border-none
                       px-[20px] py-[6px] text-white transition-transform duration-[190ms]
                       ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94]"
            style={{ backgroundColor: "#212121" }}
          >
            <VersionsIcon size={20} />
            <span className="whitespace-nowrap text-[13px] font-normal leading-[16px]">
              Versions
            </span>
          </button>
        </div>

        {/* Translations — no card behind each one; they sit on the surface. */}
        <div className="flex flex-col gap-[32px]">
          {VERSIONS.map((v) => (
            <div key={v.label} className="flex flex-col gap-[12px]">
              <p
                className="text-[15px] font-medium leading-[18px]"
                style={{ color: "#999999" }}
              >
                {v.label}
              </p>
              <p className="text-[18px] font-normal leading-[27px] text-white">
                {v.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
