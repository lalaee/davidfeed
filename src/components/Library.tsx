"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { HIGHLIGHT_COLOURS } from "./VerseActionBar";
import { fetchChapterIn, parseTitle, readingTranslation } from "@/data/bible";
import { shortPosts } from "@/data/shorts";
import { highlightStore, readingStore, savedPostStore } from "@/lib/stores";
import { formatVerseRange } from "@/lib/verseRef";
import { useScrollCollapse } from "@/hooks/useNavCollapse";

/*
 * The Library, rebuilt from Figma "Library-Feed" 2672:17521 and "Library-Verse"
 * 2672:17678 (375x747), with "Saved Feed Deskop view" 2676:17790 and
 * "Highlighted verse Deskop view" 2676:17952 (1440) for desk. All on #000000.
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
 *   tracking   -0.41px on the pills, -0.26px on the verse, 0 on the meta row.
 *
 * At desk the whole page moves into the 782 column the Bible reader already
 * uses — 782 at x=329 on 1440 is centred — and almost nothing else changes,
 * because the numbers were written as fractions of the column rather than as
 * widths. The grid stays 3 up and its tiles go 107.33 to 243.33 on their own,
 * (column - 48 - 4) / 3 at either size; the filter bar spans the column, though
 * its swatches are held to the phone's 59.73 gap rather than the 195.73 that
 * spreading them across 734 computes. What genuinely differs is spacing: 32
 * above the grid where the phone has 24, 32 above the verse list where the
 * phone has 40, and 32 of bottom padding in place of the room the phone has to
 * leave for its nav.
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
 * (A fourth departure is gone. The reference used to read "Psalm 46 v 1" where
 * the frame said "Psalms 46", because the reader's one hard-coded chapter was
 * titled that way and a library must not disagree with the page it quotes. The
 * reader now names its chapter from the canonical book list, so both say
 * "Psalms 46" and the frame was right all along.)
 *
 * The verse text is FETCHED. It is 12.6MB of static JSON under public/bible,
 * so only the chapters that actually hold a highlight are asked for, and only
 * in the translation being read.
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
  // Its callback ref goes on whichever tab's scroller is mounted — including
  // one that mounts LATE, after an empty state gives way to a loaded list.
  // Switching tabs swaps the element, which is what resets it to expanded.
  const { minimized: navMinimized, expand: expandNav, attach: attachScroller } = useScrollCollapse(tab);

  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      <div
        className="library-column relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-black
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

        {tab === "feed" ? <SavedFeed attachScroller={attachScroller} /> : <SavedHighlights attachScroller={attachScroller} />}

        <BottomNav activeTab="library" minimized={navMinimized} onExpand={expandNav} />
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
        // Both frames carry it on this label, at both sizes. Missed on the
        // first pass because the extraction did not read letterSpacing.
        letterSpacing: "-0.41px",
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
function SavedFeed({ attachScroller }: { attachScroller: (el: HTMLElement | null) => void }) {
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
    <div
      ref={attachScroller}
      className="scrollbar-hide flex-1 overflow-y-auto pb-[120px] pt-[24px]
                 desk:pb-[32px] desk:pt-[32px]"
    >
      <div className="grid grid-cols-3 gap-[2px] px-[24px]">
        {saved.map((post) => (
          <Link
            key={post.id}
            href={`/library/${post.id}`}
            aria-label={`Open ${post.title}`}
            // Each breakpoint gets its OWN ratio because the frames disagree:
            // 107.33x126 is 0.8518 and 243.33x284 is 0.8568. Carrying the phone
            // ratio up would make the desktop tile 285.7 tall against the 284
            // its frame draws, so the difference is stated rather than averaged
            // away. The WIDTH needs no breakpoint — (column - 48 - 4) / 3 is
            // 107.33 at 375 and 243.33 at 782 on its own.
            className="block aspect-[107.33/126] overflow-hidden rounded-[12px] no-underline
                       transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                       active:scale-[0.96] desk:aspect-[243.33/284]"
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
function SavedHighlights({ attachScroller }: { attachScroller: (el: HTMLElement | null) => void }) {
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
  const version = readingTranslation(readingId);

  /*
   * A "run" is a chapter plus a stretch of consecutive verses sharing one
   * colour. Built from storage alone, with no text in it — highlighting 2-4 is
   * one act by the reader, and four identical-looking rows is not what they
   * did. formatVerseRange is the reader's own label function, so "v 2-4" here
   * and "v 2-4" under the thumb are the same string built the same way.
   */
  const runs = useMemo(() => {
    const out: { key: string; chapter: string; numbers: number[]; colour: string }[] = [];
    for (const [chapter, verses] of Object.entries(store)) {
      const numbers = Object.keys(verses)
        .map(Number)
        .sort((a, b) => a - b);

      let run: number[] = [];
      let colour = "";
      const flush = () => {
        if (!run.length) return;
        out.push({ key: `${chapter}:${run[0]}`, chapter, numbers: run, colour });
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
  }, [store]);

  /*
   * The words themselves have to be fetched — the text is 12.6MB of static
   * JSON under public/bible, not something the bundle carries. Only the
   * chapters that actually hold a highlight are asked for, and only in the
   * translation being read; the other two are the compare card's business.
   *
   * The dependency is a joined STRING of chapter titles, not the array: the
   * array is a fresh object every time the store ticks, which would re-fetch
   * on every highlight made anywhere.
   */
  const chapterKeys = useMemo(
    () => [...new Set(runs.map((r) => r.chapter))].sort().join("|"),
    [runs],
  );
  const [texts, setTexts] = useState<Record<string, Record<number, string>>>({});
  useEffect(() => {
    const ac = new AbortController();
    const titles = chapterKeys ? chapterKeys.split("|") : [];
    Promise.all(
      titles.map(async (title) => {
        // A title naming a book that does not exist is a stale stored key.
        const ref = parseTitle(title);
        if (!ref) return [title, null] as const;
        const verses = await fetchChapterIn(version.id, ref.book, ref.chapter, ac.signal);
        return [title, verses] as const;
      }),
    ).then((pairs) => {
      if (ac.signal.aborted) return;
      const next: Record<string, Record<number, string>> = {};
      for (const [title, verses] of pairs) if (verses) next[title] = verses;
      setTexts(next);
    });
    return () => ac.abort();
  }, [chapterKeys, version.id]);

  // A run whose chapter has not arrived (or cannot be read) is left out rather
  // than rendered as a reference with no words under it.
  const entries = useMemo<HighlightEntry[]>(
    () =>
      runs.flatMap((run) => {
        const verses = texts[run.chapter];
        if (!verses) return [];
        const text = run.numbers.map((n) => verses[n]).filter(Boolean).join(" ");
        if (!text) return [];
        return [{ ...run, text, version: version.label }];
      }),
    [runs, texts, version.label],
  );

  const shown = filter ? entries.filter((e) => e.colour === filter) : entries;

  return (
    <>
      {/* The filter sits with the tabs in the design's own grouping — one
          block of controls, 24 below the tabs, 40 above the list. */}
      <div className="flex-shrink-0 px-[24px] pt-[24px]">
        <div
          className="flex h-[54px] items-center rounded-[30px] px-[16px]"
          style={{ backgroundColor: "#212121" }}
        >
          {/* The BAR spans the column, as the desktop frame draws it, but the
              swatches do not spread with it. Space-between across 734 computes
              a 195.73 gap — four small dots strung across the width, which is
              what the frame literally specifies and reads as a mistake. Capped
              at the phone bar's own content width, the gap comes back to 59.73:
              the same rhythm at both sizes, and the first swatch still lands on
              the frame's x=369. Below desk nothing changes — 294 is wider than
              the content box there, so the cap never applies. */}
          <div className="flex w-full items-center justify-between desk:max-w-[294px]">
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
      </div>

      {!shown.length ? (
        <Empty>
          {filter
            ? "Nothing highlighted in this colour yet."
            : "Highlight a verse in the Bible and it is kept here."}
        </Empty>
      ) : (
        <div
          ref={attachScroller}
          className="scrollbar-hide flex-1 overflow-y-auto pb-[120px] pt-[40px]
                     desk:pb-[32px] desk:pt-[32px]"
        >
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

                <p
                  className="text-[18px] font-normal leading-[27px] text-white"
                  style={{ letterSpacing: "-0.26px" }}
                >
                  {entry.text}
                </p>

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
