"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { HIGHLIGHT_COLOURS } from "./VerseActionBar";
import { chapterTranslation } from "@/data/bible";
import { shortPosts } from "@/data/shorts";
import { highlightStore, readingStore, savedPostStore } from "@/lib/stores";
import { formatVerseRange } from "@/lib/verseRef";

/*
 * The Library, rebuilt from Figma "Library-Feed" 2672:17521 and "Library-Verse"
 * 2672:17678. Both frames are 375x747 on #000000.
 *
 * This replaced the page wholesale rather than amending it. What was here — a
 * "Library" title, a #1c1c1e menu card of three chevron rows, a "Recently
 * added" heading and two captioned 160x160 tiles — appears nowhere in the
 * design. The frames start at y=40 with a tab switcher and nothing above it.
 *
 *   tabs       374x38 at y=40, padding 0/24, gap 12. Pills at radius 19.25,
 *              padding 8/16, Inter Semi Bold 17/22. ACTIVE is #FFFFFF with
 *              #0E0E0E text; inactive is #0E0E0E with white text — the same
 *              inversion the compare card's Versions button uses. The labels
 *              read "Saved Feed" and "Highlighted Verses" rather than the
 *              frames' "Feed" and "Verse highlights"; the pills hug their text,
 *              so the frames' 71 and 160 were never fixed widths to hold to.
 *   grid       3 up, padding 0/24, gap 2 on BOTH axes (rows pitch 128 on a
 *              126 row). Tiles 107.33x126 radius 12, no caption. 107.33 is
 *              (374 - 48 - 4) / 3, so the tiles are fractions of the column
 *              rather than a fixed width, and the ratio is what is pinned.
 *   filter     326x54 radius 30, #212121, padding 8/16, four 28.7 swatches.
 *              Fixed width and space-between, so the 59.73 gap is COMPUTED —
 *              the same construction as the verse action bar's swatch group,
 *              and the same four colours in the same order.
 *   entry      padding 0/24, gap 12: a meta row, the verse, a #212121 hairline.
 *              Reference in Inter Medium 15 white, version in Inter Medium 15
 *              #999999, verse in Inter Regular 18/150% white. Entries 32 apart.
 *
 * Three departures from the frames, all stated rather than smuggled:
 *
 *   The frames draw no bottom nav and stand 747 tall rather than 812, which
 *   reads as the scroll content and not the whole screen. BottomNav stays and
 *   the lists scroll under it.
 *
 *   The frames draw no tap state on a tile either, but a grid of saved things
 *   that cannot be opened is a dead end. A tile opens /library/[psalm], which
 *   is the saved set played as a feed starting on the one you tapped — not the
 *   home feed, whose topic filter would drop the very cards you saved.
 *
 *   A highlight's colour is drawn nowhere in the verse frame — the text is
 *   plain white — which leaves the colour filter above it filtering on
 *   something invisible. An 8px dot in the meta row is the smallest thing that
 *   makes the filter legible; recolouring the text the way the reader does
 *   would turn the list into a wall of pastel.
 *
 *   The reference reads "Psalm 46 v 1" where the frame says "Psalms 46". The
 *   title comes from the chapter itself, which is what the reader's own header
 *   and the storage key both say; a library disagreeing with the page it
 *   quotes is worse than matching the mock.
 */

type LibraryTab = "feed" | "verses";

/** One contiguous run of verses highlighted in a single colour. */
interface HighlightEntry {
  key: string;
  chapter: string;
  numbers: number[];
  colour: string;
  text: string;
  version: string;
}

export default function Library() {
  const [tab, setTab] = useState<LibraryTab>("feed");

  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      <div
        className="relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-black
                   md:max-w-[390px]"
      >
        {/* The head is pinned and the lists scroll under it, so the tabs stay
            reachable however far down the grid you are. */}
        <div className="flex-shrink-0 pt-[40px] desk:pt-[121px]">
          {/* Scrolls rather than clips. The pills hug their labels, and the two
              renamed ones total 327 against the 327 a 375 screen has spare —
              exactly zero. Measured on a 360 Android the second ran 15.2px past
              its own margin with nowhere to go. This is the answer the verse
              action bar already gives to the same question, and it costs
              nothing on a screen wide enough to hold both. */}
          <div className="scrollbar-hide flex gap-[12px] overflow-x-auto px-[24px]">
            <TabPill label="Saved Feed" active={tab === "feed"} onClick={() => setTab("feed")} />
            <TabPill
              label="Highlighted Verses"
              active={tab === "verses"}
              onClick={() => setTab("verses")}
            />
          </div>
        </div>

        {tab === "feed" ? <SavedFeed /> : <SavedHighlights />}

        <BottomNav activeTab="library" />
        <DesktopNav activeTab="library" />
      </div>
    </>
  );
}

function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex-shrink-0 rounded-[19.25px] border-none px-[16px] py-[8px]
                 text-[17px] font-semibold leading-[22px]
                 transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                 active:scale-[0.96]"
      style={{
        backgroundColor: active ? "#FFFFFF" : "#0E0E0E",
        color: active ? "#0E0E0E" : "#FFFFFF",
      }}
    >
      {label}
    </button>
  );
}

/*
 * Tab 1 — the artwork of every feed card the reader bookmarked.
 *
 * In feed order, not save order: the store is an object keyed by psalm number,
 * and integer-like keys are ordered numerically by the language whatever order
 * they went in, so insertion order is not recoverable. Feed order at least
 * matches where the reader met them.
 */
function SavedFeed() {
  const savedIds = useSyncExternalStore(
    savedPostStore.subscribe,
    savedPostStore.read,
    savedPostStore.serverSnapshot,
  );
  const saved = useMemo(() => shortPosts.filter((p) => savedIds[p.id]), [savedIds]);

  if (!saved.length) {
    return <Empty>Bookmark a verse in the feed and its artwork lands here.</Empty>;
  }

  return (
    <div className="scrollbar-hide flex-1 overflow-y-auto pb-[120px] pt-[24px]">
      <div className="grid grid-cols-3 gap-[2px] px-[24px]">
        {saved.map((post) => (
          <Link
            key={post.id}
            href={`/library/${post.id}`}
            aria-label={`Open ${post.title}`}
            className="block overflow-hidden rounded-[12px] no-underline
                       transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                       active:scale-[0.96]"
            // 107.33 x 126 as a ratio, so the tiles keep the design's
            // proportion at any column width instead of only at 375.
            style={{ aspectRatio: "107.33 / 126" }}
          >
            <img
              src={post.backgroundImage}
              alt=""
              className="h-full w-full object-cover"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

/*
 * Tab 2 — every highlighted verse, filterable by colour.
 *
 * Contiguous verses sharing a colour collapse into one entry: highlighting 2-4
 * is one act by the reader and four identical-looking rows is not what they
 * did. formatVerseRange is the reader's own label function, so "v 2-4" here
 * and "v 2-4" under the thumb are the same string built the same way.
 */
function SavedHighlights() {
  const store = useSyncExternalStore(
    highlightStore.subscribe,
    highlightStore.read,
    highlightStore.serverSnapshot,
  );
  const readingId = useSyncExternalStore(
    readingStore.subscribe,
    readingStore.read,
    readingStore.serverSnapshot,
  );
  const [filter, setFilter] = useState<string | null>(null);

  const entries = useMemo<HighlightEntry[]>(() => {
    const out: HighlightEntry[] = [];
    for (const [chapter, verses] of Object.entries(store)) {
      // A chapter dropped from the registry is a stale localStorage entry;
      // skip it rather than rendering a row with no words in it.
      const translation = chapterTranslation(chapter, readingId);
      if (!translation) continue;

      const numbers = Object.keys(verses)
        .map(Number)
        .sort((a, b) => a - b);

      let run: number[] = [];
      let colour = "";
      const flush = () => {
        if (!run.length) return;
        const text = run
          .map((n) => translation.verses[n])
          .filter(Boolean)
          .join(" ");
        if (text) {
          out.push({
            key: `${chapter}:${run[0]}`,
            chapter,
            numbers: run,
            colour,
            text,
            version: translation.label,
          });
        }
        run = [];
      };

      for (const n of numbers) {
        const c = verses[n];
        if (run.length && c === colour && n === run[run.length - 1] + 1) {
          run.push(n);
        } else {
          flush();
          run = [n];
          colour = c;
        }
      }
      flush();
    }
    return out;
  }, [store, readingId]);

  const shown = filter ? entries.filter((e) => e.colour === filter) : entries;

  return (
    <>
      {/* The filter sits with the tabs in the design's own grouping — one
          block of controls, 24 below the tabs, 40 above the list. */}
      <div className="flex-shrink-0 px-[24px] pt-[24px]">
        <div
          className="flex h-[54px] items-center justify-between rounded-[30px] px-[16px]"
          style={{ backgroundColor: "#212121" }}
        >
          {HIGHLIGHT_COLOURS.map((colour) => {
            const on = filter === colour;
            return (
              <button
                key={colour}
                type="button"
                aria-label={on ? "Show every colour" : `Show only ${colour}`}
                aria-pressed={on}
                onClick={() => setFilter(on ? null : colour)}
                className="flex-shrink-0 rounded-full border-none p-0
                           transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                           active:scale-[0.94]"
                style={{
                  width: 28.7,
                  height: 28.7,
                  backgroundColor: colour,
                  // The 3px white ring is the frame's own selected marker. It
                  // means something different from the ring that came off the
                  // action bar's swatches: there it claimed a colour was
                  // applied, here it says the list is filtered to it.
                  boxShadow: on ? "0 0 0 3px #FFFFFF" : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {!shown.length ? (
        <Empty>
          {filter
            ? "Nothing highlighted in this colour yet."
            : "Highlight a verse in the Bible and it is kept here."}
        </Empty>
      ) : (
        <div className="scrollbar-hide flex-1 overflow-y-auto pb-[120px] pt-[40px]">
          <div className="flex flex-col gap-[32px]">
            {shown.map((entry) => (
              <div key={entry.key} className="flex flex-col gap-[12px] px-[24px]">
                <div className="flex h-[18px] items-center justify-between">
                  <span className="flex items-center gap-[8px]">
                    <span
                      aria-hidden
                      className="block h-[8px] w-[8px] flex-shrink-0 rounded-full"
                      style={{ backgroundColor: entry.colour }}
                    />
                    <span className="text-[15px] font-medium leading-[18px] text-white">
                      {entry.chapter} {formatVerseRange(entry.numbers)}
                    </span>
                  </span>
                  <span
                    className="text-[15px] font-medium leading-[18px]"
                    style={{ color: "#999999" }}
                  >
                    {entry.version}
                  </span>
                </div>

                <p className="text-[18px] font-normal leading-[27px] text-white">{entry.text}</p>

                <div className="h-[1px] w-full" style={{ backgroundColor: "#212121" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* The frames draw no empty state, and a Library with nothing in it would
   otherwise be an unexplained black rectangle. Set in the verse's own type so
   it reads as the list's first line rather than as chrome. */
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 px-[24px] pt-[40px]">
      <p className="text-[18px] font-normal leading-[27px]" style={{ color: "#999999" }}>
        {children}
      </p>
    </div>
  );
}
