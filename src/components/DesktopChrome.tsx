"use client";

import { useState } from "react";

import DesktopNav from "./DesktopNav";
import { type TabKey } from "./BottomNav";
import { ChevronIcon } from "./icons";
import { TOPICS } from "@/data/topics";

/*
 * The furniture around the feed at desktop widths.
 *
 * Figma "Deskop view" 2662:10837, 1440x1108. This is a different composition,
 * not the phone layout stretched: the nav moves from the bottom of the screen
 * to the top right, a column of marketing copy appears on the left, and the
 * feed sits right of centre with paging buttons beside it.
 *
 *   top bar    1440x97, black with a #212121 rule along the bottom. Wordmark
 *              "Dafod" at x=48 in Zalando Sans Expanded SemiBold 24.55, -2%.
 *   nav        THREE separate 170x64 pills at radius 50, 21 apart, ending
 *              86.27 from the right. Icon and label sit side by side with a 6
 *              gap inside 16/12 padding — 32px icon, Inter Medium 18 at 2%.
 *              Only the ACTIVE pill is filled, in #212121; the others are
 *              transparent. Every pill is named "Navicon/active" in the file,
 *              so the fill is what marks the current tab, not the name.
 *   copy       366 wide at x=48, y=250, 72 between the text block and button.
 *              "Stop Doomscrolling" Inter Light 48 over "Start Faithscrolling"
 *              Inter Extra Bold 48, then a description in Inter Medium 24/150%
 *              #999999.
 *   button     366x59, radius 100, #0096E5 — the first colour in the app that
 *              is not greyscale.
 *   topic      above the feed at y=156: "Scroll verses on" #999999 beside the
 *              topic in bold white, both Inter 27, then a chevron.
 *   paging     two 72x72 #212121 circles, 16 apart, to the LEFT of the card.
 *
 * Everything here is desk-only. Below 1028 the phone layout stands unchanged,
 * so this renders nothing rather than reflowing into it.
 */
interface DesktopChromeProps {
  activeTab?: TabKey;
  topicId: string;
  onSelectTopic: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function DesktopChrome({
  activeTab = "home",
  topicId,
  onSelectTopic,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: DesktopChromeProps) {
  // Its own menu rather than reaching into FeedHeader's. FeedHeader is the
  // phone's control and is hidden at this width; sharing one open-state across
  // two triggers would mean lifting it for the benefit of whichever is not on
  // screen.
  const [open, setOpen] = useState(false);
  const topicLabel = TOPICS.find((t) => t.id === topicId)?.label ?? "";

  return (
    <>
      <DesktopNav activeTab={activeTab} />

      {/* Left column */}
      <section className="pointer-events-none desk-copy fixed top-[250px] z-[500] hidden w-[366px] flex-col gap-[72px] desk:flex">
        <div className="flex flex-col gap-[32px]">
          <h1 className="flex flex-col gap-[18px] text-[48px] leading-[1.15] text-white">
            <span className="font-light">Stop Doomscrolling</span>
            <span className="font-extrabold">Start Faithscrolling</span>
          </h1>
          {/* Placeholder copy — the frame just reads "Description". */}
          <p className="text-[24px] font-medium leading-[150%]" style={{ color: "#999999" }}>
            Psalms, one verse at a time. Short enough to finish, still enough to
            sit with.
          </p>
        </div>
        <button
          type="button"
          className="pointer-events-auto flex h-[59px] w-[366px] items-center justify-center rounded-[100px]
                     border-none text-[20px] font-medium leading-[16px] text-white
                     transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                     active:scale-[0.97]"
          style={{ backgroundColor: "#0096E5" }}
        >
          Download app
        </button>
      </section>

      {/* Topic switcher, above the card */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        // Anchored to the card's own right edge, not the viewport centre, so
        // the two cannot drift apart as the window resizes. 51 + 622 - 560
        // leaves it starting 62 inside the card, as the frame draws it.
        className="desk-topic fixed top-[156px] z-[500] hidden h-[41px]
                   items-center gap-[16px] border-none bg-transparent p-0 desk:flex"
      >
        <span className="text-[27px] font-normal leading-none" style={{ color: "#999999" }}>
          Scroll verses on
        </span>
        <span className="text-[27px] font-bold leading-none text-white">{topicLabel}</span>
        <span className={`flex text-white transition-transform duration-300
                          ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-180" : ""}`}>
          <ChevronIcon size={41} />
        </span>
      </button>

      {/* Topic menu — the feed header's panel in the desktop's place. */}
      <div
        role="listbox"
        aria-label="Topics"
        className={`desk-topic fixed top-[210px] z-[600] hidden w-[280px] overflow-hidden
                    rounded-[20px] p-[6px] desk:block
                    transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-[0.96] opacity-0"}`}
        style={{ backgroundColor: "rgba(20, 20, 22, 0.96)" }}
      >
        {TOPICS.map((t) => {
          const current = t.id === topicId;
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={current}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onSelectTopic(t.id);
                setOpen(false);
              }}
              className={`flex h-[48px] w-full items-center justify-between rounded-[14px] border-none
                          px-[16px] text-left text-[17px] text-white
                          ${current ? "font-medium" : "bg-transparent font-normal"}`}
              style={current ? { backgroundColor: "#212121" } : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Paging, to the left of the card */}
      <div className="desk-paging fixed top-1/2 z-[500] hidden -translate-y-1/2
                      flex-col gap-[16px] desk:flex">
        <PageButton label="Previous verse" onClick={onPrev} disabled={!canPrev} up />
        <PageButton label="Next verse" onClick={onNext} disabled={!canNext} />
      </div>
    </>
  );
}

function PageButton({
  label,
  onClick,
  disabled,
  up,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  up?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-none text-white
                 transition-[transform,opacity] duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                 enabled:active:scale-[0.94] disabled:opacity-30"
      style={{ backgroundColor: "#212121" }}
    >
      <span className={`flex ${up ? "rotate-180" : ""}`}>
        <ChevronIcon size={48} />
      </span>
    </button>
  );
}
