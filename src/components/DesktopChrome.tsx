"use client";

import Link from "next/link";
import { useState } from "react";

import DesktopNav from "./DesktopNav";
import LiquidGlass from "./LiquidGlass";
import { type TabKey } from "./BottomNav";
import { ChevronIcon } from "./icons";
import { TOPICS, TOPICS_ENABLED } from "@/data/topics";
import { GLYPH_PAIR_OVERLAP_EM } from "./HeroGlyphs";
import HeroLottie from "./HeroLottie";

/*
 * The animated glyphs, four per line, cycling.
 *
 * The o's of Doomscrolling take the four "doom" faces, each slot playing one
 * through and moving to the next, so the line keeps changing rather than
 * looping a single gesture. The o of Hopescrolling is one animation on loop.
 *
 * Doom's two slots start two apart, so they never wear the same face at once —
 * with an offset of 1 the second would simply trail the first by one beat and
 * they would collide every cycle.
 */
const DOOM_FACES = [
  "/motion/hero/doom-crying.json",
  "/motion/hero/doom-angry-horns.json",
  "/motion/hero/doom-venom.json",
  "/motion/hero/doom-tongue.json",
];
/*
 * Hope is ONE animation, looped — the smiling face that sends hearts up. It is
 * the only one of the four with heart layers (six of them, Heart-1..Heart-6),
 * which is what makes it the one that reads as loves coming off the word.
 *
 * A single source loops inside the player rather than cycling through play(),
 * so the SVG is built once instead of every 1.5 seconds. The other three hope
 * faces stay in public/motion/hero, unreferenced, in case this is reversed.
 */
const HOPE_FACES = ["/motion/hero/hope-smiling-hearts.json"];

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
 *   copy       523 wide at x=48, on the paging buttons' own horizontal axis.
 *              "Stop Doomscrolling" over "Start Hopescrolling", both Inter
 *              REGULAR 56, then a description in Inter Medium 24/150%. The
 *              frame greys the first line and the description (#999999); with
 *              the ambience behind them both went white — the first line and
 *              its faces outright, the description at 90% — because grey on
 *              a coloured swirl reads as disabled, not as secondary. Re-cut from "Container" 2662:10867, which
 *              supersedes this frame's own copy block — see the note on it
 *              below. No button: that frame's is laid out past its bounds.
 *   topic      above the feed at y=156: "Deal with" #999999 beside the
 *              topic in bold white, both Inter 27, then a chevron.
 *   paging     two 72x72 #212121 circles, 16 apart, to the LEFT of the card —
 *              now 56 glass discs; 72 beside a 622 card read as controls
 *              competing with it rather than serving it.
 *
 * Everything here is desk-only. Below 1028 the phone layout stands unchanged,
 * so this renders nothing rather than reflowing into it.
 */
interface DesktopChromeProps {
  activeTab?: TabKey;
  topicId: string;
  onSelectTopic: (id: string) => void;
  /**
   * A fixed collection instead of a topic. "Deal with <Topic>" becomes
   * the collection's name with a way back, and the topic menu is not rendered:
   * the set was chosen before arriving here, so offering to replace it would
   * be offering to leave.
   */
  collectionLabel?: string;
  collectionBackHref?: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export default function DesktopChrome({
  activeTab = "home",
  topicId,
  onSelectTopic,
  collectionLabel,
  collectionBackHref,
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

      {/* THE SOFT EDGES — see globals.css, which carries the reasoning and every
          number. One at the bar, one at the fold: a card on its way out in
          either direction goes out of focus and out of light before the edge
          instead of being sliced by it.

          They live HERE and not in DesktopNav, beside the bar the top one
          belongs to, because the Bible and the Library draw their own headers
          under that bar at z-10 — the chapter pill sits at y=121, squarely
          inside the band — and a blur hung off the bar itself took those with
          it. Only the feed runs its content under the rule on purpose. */}
      <SoftEdge />
      <SoftEdge side="bottom" />

      {/* Left column — Figma "Container" 2662:10867, transcribed.
       *
       * The frame is drawn at 0.8483095, proven by five values that unscale to
       * numbers already shipping elsewhere here (24, 20, 100, 72, 32). Every
       * number below is its scaled value divided by that:
       *
       *   container  443.67 -> 523      headline    47.457 -> 56
       *   line-height 42.712 -> 50.35   tracking    -2.034 -> -2.398
       *   line gap    13.559 -> 16      block gap   27.146 -> 32
       *   subtitle    20.359 -> 24
       *
       * Both headline lines are Inter REGULAR. The contrast between them is
       * carried entirely by colour — #999999 against #FFFFFF — not by weight,
       * which is why the light/extrabold pair that used to sit here was wrong.
       *
       * There is no button. The frame does contain a "Download app" child, but
       * it is laid out at y=250 inside a container only 189 tall, so it falls
       * outside the bounds and does not render — the frame's own PNG shows two
       * headline lines and the subtitle, and nothing else. It is scaffolding
       * left in the file, not part of the design. */}
      <section className="pointer-events-none desk-copy fixed top-1/2 z-[500] hidden -translate-y-1/2 flex-col gap-[32px] desk:flex">
        {/* The o's are ANIMATED icons — eight Iconly Lotties, four cycling in
         *  the o's of Doomscrolling and four in the o of Hopescrolling. They
         *  replace the traced stills that stood here; HeroGlyphs still holds
         *  those, and the share clips still burn them in, because a video
         *  frame cannot carry an animation.
         *
         *  INLINE in the text flow, not positioned over it. The frame does the
         *  latter, with runs of spaces under absolutely-placed icon frames, and
         *  that only holds while the renderer's advances match Figma's. The
         *  share clips learned this the hard way — placed absolutely there, the
         *  heart drifted until it had 4.86 units of air on one side and 2.08 on
         *  the other. Inline, the browser keeps each icon with the letters it
         *  stands between, at any size and in any font fallback.
         *
         *  Each slot takes its line's colour: grey on Doom, and the frame's
         *  teal on Hope, where a plain white face would lose the heart. */}
        <h1
          className="flex flex-col gap-[16px] text-[56px] font-normal"
          style={{ lineHeight: "50.35px", letterSpacing: "-2.398px" }}
        >
          <span className="text-white">
            Stop D<HeroLottie sources={DOOM_FACES} offset={0} />
            <HeroLottie
              sources={DOOM_FACES}
              offset={2}
              style={{ marginLeft: `-${GLYPH_PAIR_OVERLAP_EM}em` }}
            />mscrolling
          </span>
          <span className="text-white">
            Start H<HeroLottie sources={HOPE_FACES} style={{ color: "#76EEE8" }} />pescrolling
          </span>
        </h1>
        <p className="text-[24px] font-medium leading-[150%]" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
          Experience a collection of short verses that brings hope centered
          around a theme
        </p>
      </section>

      {collectionLabel ? (
        /* A collection names itself and offers the way back. Same slot, same
           27px type as the topic line, so the card below it does not move. */
        <div
          className="desk-topic fixed top-[156px] z-[500] hidden h-[41px] items-center gap-[16px] desk:flex"
        >
          {collectionBackHref && (
            <Link
              href={collectionBackHref}
              aria-label="Back to Library"
              className="flex h-[41px] w-[41px] items-center justify-center text-white no-underline
                         press"
            >
              <span className="flex rotate-90">
                <ChevronIcon size={41} />
              </span>
            </Link>
          )}
          <span className="text-[27px] font-bold leading-none text-white">{collectionLabel}</span>
        </div>
      ) : TOPICS_ENABLED ? (
        <>
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
            Deal with
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
        </>
      ) : null}

      {/* Paging, to the left of the card */}
      <div className="desk-paging fixed top-1/2 z-[500] hidden -translate-y-1/2
                      flex-col gap-[16px] desk:flex">
        <PageButton label="Previous verse" onClick={onPrev} disabled={!canPrev} up />
        <PageButton label="Next verse" onClick={onNext} disabled={!canNext} />
      </div>
    </>
  );
}

/*
 * Seven bare layers: six compounding blurs under overlapping gradient masks,
 * then the scrim. Which way they ramp is the modifier's business, in CSS.
 *
 * The Feed writes two variables on the column from the scroller's position.
 * The top band takes --edge-top as its opacity: 0 at the head of the list,
 * where there is no previous card to soften. Otherwise both bands stay on —
 * each holds a neighbour's 10px peek, which should be a soft glimpse, not a
 * hard sliver — and only their scrims listen to --edge-travel, in CSS, easing
 * back at rest so the peeks read through. See the note on both in Feed.tsx.
 */
function SoftEdge({ side = "top" }: { side?: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className={`desk-bar-edge pointer-events-none fixed inset-x-0 z-[490] hidden desk:block
                  ${side === "bottom" ? "desk-bar-edge--bottom" : ""}`}
      style={side === "top" ? { opacity: "var(--edge-top, 1)" } : undefined}
    >
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </div>
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
    // Glass, like the nav pills, with the same numbers — the frame's #212121
    // circle over the ambience read as a coin on a swirl. lg-quiet swaps the
    // pane's verse-darkening drop shadow for a soft cast, since these float
    // in open space; lg-disabled keeps the wrapper from lifting on hover when
    // there is nowhere to page to.
    <LiquidGlass
      radius={28}
      depth={6}
      strength={50}
      chromaticAberration={3}
      blur={4}
      className={`lg-quiet${disabled ? " lg-disabled" : ""}`}
    >
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-none
                   bg-transparent text-white disabled:opacity-30"
      >
        <span className={`flex ${up ? "rotate-180" : ""}`}>
          <ChevronIcon size={36} />
        </span>
      </button>
    </LiquidGlass>
  );
}
