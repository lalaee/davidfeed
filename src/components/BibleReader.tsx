"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import BooksSheet from "./BooksSheet";
import CompareSheet from "./CompareSheet";
import VerseActionBar, { type VerseAction } from "./VerseActionBar";
import { BookmarkIcon, ChevronIcon, CompareIcon, SendIcon } from "./icons";
import {
  TRANSLATIONS,
  adjacentChapter,
  bookSlug,
  chapterTitle as makeChapterTitle,
  fetchChapter,
  type Translation,
} from "@/data/bible";
import {
  EMPTY_CHAPTER,
  highlightStore,
  migrateLegacyChapterKeys,
  readingStore,
  savedVerseStore,
  versionsStore,
} from "@/lib/stores";
import { formatVerseRange } from "@/lib/verseRef";
import { useScrollCollapse } from "@/hooks/useNavCollapse";

/*
 * Geometry, type and colour follow Figma "Bible" — 2641:1161 (reading) and
 * 2642:1725 (verse selected) — measured off the frames rather than eyeballed:
 *
 *   page margin   24 for the header, 27 for the verses (the design insets the
 *                 verse column 3px further than the header pill)
 *   header row    y=40, 72 tall
 *   title pill    158x72, radius 22, #0E0E0E, artwork inset 12, 12 gap
 *   version pill  61x38, #0E0E0E
 *   verses top    144  (header row y=40 + 104)
 *   verse         Inter Regular 21/31.5 #FFFFFF; number Inter Medium 20, line
 *                 height auto (24 at that size), #999999. The gutter is 20 in
 *                 the design and is widened here to fit two- and three-digit
 *                 verse numbers — see numberGutter below.
 *                 The number is very nearly the size of the verse — it reads
 *                 small because it is grey and its tighter line box lifts it
 *                 ~4px, not because it is set smaller.
 *   header labels Inter Semi Bold 17/22, -0.408 tracking, both of them
 *   verse pitch   120 on 96-tall blocks = 24 apart
 *
 * The motion is the app's own and is deliberately kept: the header still
 * morphs on scroll, presses answer on pointer-down, and the bar arrives on the
 * shared iOS curve.
 *
 * At 1028 and up the reader follows Figma "Bible Deskop view" 2669:17047: the
 * column widens to 782 and centres under the desktop nav, its header sitting at
 * 121 and the verses at 225, both inset 24 rather than the phone's 24/27. The
 * header stays PINNED as it does on the phone — the frame draws one long
 * auto-layout that would scroll away with the text, which was asked to work the
 * phone's way instead.
 */
interface Verse {
  number: number;
  text: string;
}

/** Stable identity — a fresh [] every render would re-run every memo below. */
const NO_TRANSLATIONS: Translation[] = [];

interface BibleReaderProps {
  /** Book name as it appears in BOOKS, e.g. "Psalms". */
  book: string;
  chapter: number;
  artworkSrc?: string;
}

export default function BibleReader({ book, chapter, artworkSrc = "/assets/feed-poster-frame.jpg" }: BibleReaderProps) {
  const router = useRouter();
  const chapterTitle = makeChapterTitle(book, chapter);
  // The bottom nav's minimize-on-scroll. Declared this early because the
  // scroll-reset effect below lists the scroller as a dependency, and a
  // dependency array is evaluated during render — a RefObject could hide
  // inside a closure here; state cannot. Keyed on the chapter: paging to the
  // next one swaps nothing in the DOM (same route pattern, same scroller), but
  // a new chapter opens at its top, expanded.
  //
  // Destructured on purpose. Passed as `ref={...}` on the scroller, the
  // callback is typed as a ref by the React Compiler — and if it is still a
  // property of one object, the whole object is, and render is forbidden from
  // reading `minimized` off it. Separate bindings, separate types.
  const {
    minimized: navMinimized,
    expand: expandNav,
    attach: attachScroller,
    el: scroller,
  } = useScrollCollapse(chapterTitle);

  /*
   * The text arrives at runtime. 66 books in three translations is 12.6MB, so
   * it is static JSON under public/bible rather than anything bundled, and the
   * reader fetches the one chapter it is showing — about 4KB per translation,
   * all three at once because the compare card wants them the moment a verse
   * is selected.
   *
   * An abort on the way out matters here in a way it usually does not: tapping
   * through the books sheet can start several of these in a row, and without it
   * a slow early chapter could land after a fast later one and replace it.
   */
  const [loaded, setLoaded] = useState<{ key: string; translations: Translation[] } | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetchChapter(book, chapter, ac.signal).then((found) => {
      if (ac.signal.aborted) return;
      setLoaded({ key: makeChapterTitle(book, chapter), translations: found });
    });
    return () => ac.abort();
  }, [book, chapter]);

  /*
   * Start a new chapter at its first verse. The route pattern does not change
   * when you page from Psalms 46 to 47, so React keeps this component mounted
   * and the scroller keeps its offset — landing you a screen down a chapter you
   * have not read, or past the end of a shorter one.
   */
  useLayoutEffect(() => {
    scroller?.scrollTo({ top: 0, behavior: "auto" });
  }, [book, chapter, scroller]);

  /*
   * What loaded is STAMPED with the chapter it is for, and the previous
   * chapter's text is discarded by comparing that stamp — not by clearing
   * state as the fetch starts. Clearing first is the obvious shape and it is a
   * synchronous setState inside an effect, which is the cascading render this
   * project rejects at build time. Comparing costs nothing and reads the same.
   */
  const ready = loaded?.key === chapterTitle;
  const allTranslations = useMemo(
    () => (ready && loaded ? loaded.translations : NO_TRANSLATIONS),
    [ready, loaded],
  );
  // Every translation failed to load — offline, most likely. Worth saying, as
  // an empty column otherwise reads as an empty chapter.
  const loadFailed = ready && allTranslations.length === 0;

  // Highlights and saves made when the reader had one hard-coded chapter were
  // filed under "Psalm 46"; the reference is "Psalms 46" now. Moves them once.
  useEffect(() => {
    migrateLegacyChapterKeys();
  }, []);

  // Null until the reader picks one, so the default stays whatever the chapter
  // ships rather than a snapshot of it frozen at first run.
  const readingId = useSyncExternalStore(
    readingStore.subscribe,
    readingStore.read,
    readingStore.serverSnapshot,
  );
  const reading = allTranslations.find((t) => t.id === readingId) ?? allTranslations[0];
  const [versionOpen, setVersionOpen] = useState(false);

  // Verses follow the chosen translation. Empty while the chapter loads, which
  // is what leaves the column blank for the moment the fetch takes.
  const shownVerses = useMemo<Verse[]>(
    () =>
      reading
        ? Object.entries(reading.verses).map(([n, text]) => ({ number: Number(n), text }))
        : [],
    [reading],
  );
  const shownVersion = reading?.label ?? TRANSLATIONS[0].label;

  /*
   * The verse-number gutter has to fit the widest number in the CHAPTER, not
   * the widest the design happened to draw.
   *
   * Figma sets it at 20 and every verse in the mock reads "1" — a 10px glyph
   * with 10px of air before the text. A two-digit number is ~21px, so it fills
   * the gutter exactly and touches the verse: "10He says". Measured at -1px of
   * gap on Psalm 46:10.
   *
   * One width for the whole chapter, so the text column stays straight down the
   * page. Psalms runs to 150, hence the three-digit case.
   */
  const numberGutter = useMemo(() => {
    const widest = shownVerses.reduce((n, v) => Math.max(n, v.number), 0);
    return widest > 99 ? 40 : widest > 9 ? 30 : 20;
  }, [shownVerses]);
  // A selection is a SET of verse numbers, kept sorted so every label and
  // share string reads in reading order rather than tap order.
  const [selected, setSelected] = useState<number[]>([]);
  // The bar hangs off the verse you tapped LAST, which the sorted list cannot
  // tell us — so the anchor is tracked separately. Removing the anchor drops it
  // to whatever is still selected rather than leaving the bar orphaned.
  const [anchor, setAnchor] = useState<number | null>(null);
  const toggleVerse = useCallback((n: number) => {
    setSelected((prev) => {
      const removing = prev.includes(n);
      const next = removing ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b);
      setAnchor(removing ? (next.length ? next[next.length - 1] : null) : n);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => {
    setSelected([]);
    setAnchor(null);
  }, []);
  const [showBooks, setShowBooks] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const highlights =
    useSyncExternalStore(
      highlightStore.subscribe,
      highlightStore.read,
      highlightStore.serverSnapshot,
    )[chapterTitle] ?? EMPTY_CHAPTER;

  const savedVerses =
    useSyncExternalStore(
      savedVerseStore.subscribe,
      savedVerseStore.read,
      savedVerseStore.serverSnapshot,
    )[chapterTitle] ?? EMPTY_CHAPTER;

  const setHighlight = useCallback(
    (colour: string | null) => {
      if (!selected.length) return;
      const next: Record<number, string> = {
        ...(highlightStore.read()[chapterTitle] ?? EMPTY_CHAPTER),
      };
      for (const n of selected) {
        if (colour) next[n] = colour;
        else delete next[n];
      }
      highlightStore.write({ ...highlightStore.read(), [chapterTitle]: next });
    },
    [chapterTitle, selected],
  );

  // Filled only when EVERY selected verse is saved, so the icon never claims
  // more than is true of the whole selection.
  // Null until the reader chooses, so the default follows the chapter rather
  // than a snapshot of it taken on first run.
  const chosenVersionIds = useSyncExternalStore(
    versionsStore.subscribe,
    versionsStore.read,
    versionsStore.serverSnapshot,
  );
  const listedTranslations = useMemo(() => {
    if (!chosenVersionIds || !allTranslations.length) return allTranslations;
    /*
     * A stored choice naming a translation that no longer exists is stale as a
     * WHOLE, not merely in that entry. NIV and NKJV were just dropped, so
     * someone whose stored list was ["niv","nkjv","asv"] would otherwise have
     * had it quietly pruned to ASV alone and been left comparing one
     * translation against nothing, with no way to tell why.
     */
    const known = new Set(allTranslations.map((t) => t.id));
    if (chosenVersionIds.some((id) => !known.has(id))) return allTranslations;
    const picked = allTranslations.filter((t) => chosenVersionIds.includes(t.id));
    return picked.length ? picked : allTranslations;
  }, [chosenVersionIds, allTranslations]);

  const toggleVersion = useCallback(
    (id: string) => {
      const current = versionsStore.read() ?? allTranslations.map((t) => t.id);
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : // Keep the file's order rather than the order they were tapped in.
          allTranslations.filter((t) => current.includes(t.id) || t.id === id).map((t) => t.id);
      // Never leave the card with nothing to show.
      if (!next.length) return;
      versionsStore.write(next);
    },
    [allTranslations],
  );

  const saved = selected.length > 0 && selected.every((n) => savedVerses[n]);
  const toggleSaved = useCallback(() => {
    if (!selected.length) return;
    const current = savedVerseStore.read()[chapterTitle] ?? EMPTY_CHAPTER;
    const allSaved = selected.every((n) => current[n]);
    const next: Record<number, true> = { ...current };
    for (const n of selected) {
      if (allSaved) delete next[n];
      else next[n] = true;
    }
    savedVerseStore.write({ ...savedVerseStore.read(), [chapterTitle]: next });
  }, [chapterTitle, selected]);

  const handleShare = useCallback(() => {
    if (!selected.length || !navigator.share) return;
    const picked = shownVerses.filter((v) => selected.includes(v.number));
    const body = picked.map((v) => v.text).join(" ");
    const ref = `${chapterTitle} ${formatVerseRange(selected)}`;
    navigator.share({
      title: ref,
      text: `"${body}" - ${ref} (${shownVersion})`,
      url: window.location.href,
    });
  }, [chapterTitle, selected, shownVerses, shownVersion]);

  // The three the design carries. It clips Save at the frame edge because the
  // row is a carousel, not because the action is provisional.
  const actions = useMemo<VerseAction[]>(
    () => [
      {
        id: "compare",
        label: "Compare",
        icon: <CompareIcon size={20} />,
        onSelect: () => setShowCompare(true),
      },
      {
        id: "share",
        label: "Share",
        icon: <SendIcon size={20} />,
        onSelect: handleShare,
      },
      {
        id: "save",
        label: "Save",
        // The design's Save instance still carries the Icons/compare glyph —
        // the component was duplicated and only its label changed — so a
        // bookmark stands in rather than shipping two identical icons.
        icon: <BookmarkIcon size={20} filled={saved} />,
        onSelect: toggleSaved,
      },
    ],
    [handleShare, saved, toggleSaved],
  );

  // The page recedes under a sheet or the compare card, which cover it. It no
  // longer recedes under the action bar: the bar is now anchored to a verse
  // inside the scrolling column, and scaling the page would drag its anchor out
  // from under it.
  const recede = showBooks || showCompare ? "sheet-open" : "";

  // Null at Genesis 1 and Revelation 22, where that button is not rendered.
  // Everywhere else it crosses book boundaries: Psalms 150 -> Proverbs 1.
  const prevChapter = adjacentChapter(book, chapter, -1);
  const nextChapter = adjacentChapter(book, chapter, 1);

  // A ring is only honest when every selected verse carries that colour;
  // a mixed selection shows none rather than picking a winner.
  const commonHighlight =
    selected.length > 0 && selected.every((n) => highlights[n] === highlights[selected[0]])
      ? (highlights[selected[0]] ?? null)
      : null;

  // iOS 26 toolbar morph — as verses scroll under the floating header, the pill
  // row shrinks ~4% and its glass panes saturate slightly.
  const anchorRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);

  // Below the verse unless the bar would fall off the bottom, in which case it
  // goes above — the ordinary popover rule, but only when above is CLEAR.
  // Re-measured while scrolling, because the verse it hangs off moves.
  const [placement, setPlacement] = useState<"above" | "below">("below");
  useEffect(() => {
    const el = scroller;
    if (!el) return;
    const measure = () => {
      // Straight to the element. Routing this through state re-rendered the
      // whole reader — every verse, and the action bar — on every scroll event.
      const morph = morphRef.current;
      if (morph) {
        const p = Math.min(1, el.scrollTop / 40);
        morph.style.setProperty("--scroll-progress", String(p));
        if (p > 0.05) morph.setAttribute("data-scrolled", "");
        else morph.removeAttribute("data-scrolled");
      }
      const row = anchorRef.current;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      // The floor is the nav's top edge, not the viewport's, now that the nav
      // stays through a selection — measured rather than assumed, so it keeps
      // working if the nav's height or safe-area inset changes.
      //
      // By its data attribute, not "nav": DesktopNav renders its own <nav>
      // BEFORE this one in the document, so a bare querySelector found the
      // desktop bar at the top of the screen and put the floor at y=16. And a
      // display:none element measures all zeros, which is what the phone nav is
      // at desk — hence the height check rather than a null check.
      const navEl = document.querySelector<HTMLElement>("[data-bottom-nav]");
      const navRect = navEl?.getBoundingClientRect();
      const floor = navRect && navRect.height > 0 ? navRect.top : window.innerHeight;
      // The ceiling is the floating header's bottom edge. The verses scroll
      // BEHIND it, so a bar placed above a verse near the top of the column
      // does not run out of screen — it slides underneath the header and comes
      // out on top of the chapter title and the version pill.
      const ceiling = morph ? morph.getBoundingClientRect().bottom : 0;
      // 17 gap + 78 bar + 16 of breathing room.
      const NEEDED = 111;
      const fitsBelow = rect.bottom + NEEDED <= floor;
      const fitsAbove = rect.top - NEEDED >= ceiling;
      // Flip up only when up is actually clear. On a short viewport — Safari
      // with its URL bar, or a zoomed page — neither side fits, and flipping
      // regardless is what put the bar through the header. Below is the better
      // of the two failures: the column can be scrolled to reach it.
      setPlacement(!fitsBelow && fitsAbove ? "above" : "below");
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [anchor, scroller]);

  return (
    <>
      {/* Fixed background for Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      <DesktopNav activeTab="bible" />

      <div className={`app-shell relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-black
                       md:max-w-[390px] reader-column ${recede}`}>
        {/* Header Section — absolutely overlaid so the verses scroll behind it */}
        <div className="absolute top-0 left-0 right-0 z-10 px-[24px] pt-[40px] desk:pt-[121px]">
          {/* Verse Artwork + Title Row — iOS 26 morph: scales with scroll */}
          <div ref={morphRef} className="app-header-morph flex items-center justify-between h-[72px]">
            <button
              type="button"
              onClick={() => setShowBooks(true)}
              // The frame's 158 is a FLOOR, not the width. It was measured when
              // the reader had one chapter called "Psalm 46"; any of 1,189 can
              // open now, and 158 leaves the title 74px — enough for "John 3"
              // and not for "Psalms 46", which ran straight through the 12px
              // padding. Hugs its content above 158, and only truncates where
              // the row genuinely cannot hold it (a 320px screen showing
              // "1 Thessalonians 5").
              className="flex h-[72px] w-fit min-w-[158px] items-center gap-[12px] rounded-[22px] p-[12px] active:opacity-70 transition-opacity"
              style={{ backgroundColor: "#0E0E0E" }}
            >
              {/* Artwork Thumbnail */}
              <div className="w-[48px] h-[48px] rounded-[12px] border-[0.5px] border-[rgba(120,120,128,0.2)] overflow-hidden flex-shrink-0">
                <img
                  src={artworkSrc}
                  alt={chapterTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Chapter Title */}
              <span className="min-w-0 truncate text-[17px] font-semibold text-white tracking-[-0.408px] leading-[22px]">
                {chapterTitle}
              </span>
            </button>

            {/* Version Selector — opens the reading translation picker. */}
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={versionOpen}
              aria-label={`Version: ${shownVersion}. Change version`}
              onClick={() => setVersionOpen((o) => !o)}
              className="flex h-[38px] flex-shrink-0 items-center justify-center rounded-[19.252px] px-[16px]
                         transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                         active:scale-[0.94]"
              style={{ backgroundColor: "#0E0E0E" }}
            >
              <span className="text-[17px] font-semibold text-white tracking-[-0.408px] leading-[22px]">
                {shownVersion}
              </span>
            </button>
          </div>

          {/* Reading translation. Same language as the feed's topic dropdown —
              a panel under the control it belongs to, rather than a new kind of
              surface for one list. Right-aligned because the pill is. */}
          <div
            role="listbox"
            aria-label="Versions"
            // 120 = the header's 40 top padding + its 72 row + 8 of gap, so
            // the panel clears the pill it drops from instead of covering it.
            className={`absolute right-[24px] top-[120px] z-[600] w-[190px] overflow-hidden rounded-[20px] p-[6px]
                        origin-top-right transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                        ${versionOpen
                          ? "pointer-events-auto scale-100 opacity-100"
                          : "pointer-events-none scale-[0.96] opacity-0"}`}
            style={{ backgroundColor: "rgba(20, 20, 22, 0.96)" }}
          >
            {allTranslations.map((t) => {
              const current = t.id === reading?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={current}
                  tabIndex={versionOpen ? 0 : -1}
                  onClick={() => {
                    readingStore.write(t.id);
                    setVersionOpen(false);
                  }}
                  className={`flex h-[44px] w-full items-center justify-between rounded-[14px]
                              border-none px-[14px] text-left text-[16px] text-white
                              ${current ? "font-medium" : "bg-transparent font-normal"}`}
                  style={current ? { backgroundColor: "#212121" } : undefined}
                >
                  {t.label}
                  {current && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Verses */}
        <div
          ref={attachScroller}
          // pb clears the PAGER, not just the nav. The buttons stand 97 to 149
          // off the bottom, and 140 left the last verse of a chapter sitting
          // under them; 165 is that 149 plus the 16 of air the design gives
          // its other floating surfaces. At desk there is no bottom nav and
          // the buttons sit at 32, so 100 is the same clearance there.
          className="flex-1 overflow-y-auto px-[27px] pt-[144px] pb-[165px] scrollbar-hide
                     desk:px-[24px] desk:pt-[225px] desk:pb-[100px]"
          // A tap on the column itself, rather than on a verse, dismisses the
          // bar — the bar occupies the nav's slot, so there has to be a way back.
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
            setVersionOpen(false);
          }}
        >
          {loadFailed && (
            <p className="text-[21px] font-normal leading-[31.5px]" style={{ color: "#999999" }}>
              This chapter could not be loaded. Check your connection and try again.
            </p>
          )}
          {shownVerses.map((verse) => {
            const isSelected = selected.includes(verse.number);
            const highlight = highlights[verse.number];
            const isAnchor = anchor === verse.number;
            return (
              <div
                key={verse.number}
                ref={isAnchor ? anchorRef : undefined}
                className="relative mb-[24px]"
              >
              <div
                // select-none: a tap on a paragraph otherwise lands as a text
                // selection instead of a tap, which swallowed the first press.
                className="flex select-none active:opacity-60 transition-opacity cursor-pointer"
                onClick={() => toggleVerse(verse.number)}
              >
                {/* Verse Number — 20px gutter, no gap; the design puts the
                    verse text at exactly 20 from the block's left edge. */}
                <span
                  className="flex-shrink-0 text-[20px] font-medium leading-[24px]"
                  style={{ color: "#999999", width: numberGutter }}
                >
                  {verse.number}
                </span>
                {/* Verse Text */}
                <p
                  className={`flex-1 min-w-0 text-[21px] font-normal leading-[31.5px]
                              transition-colors duration-200
                              ${isSelected ? "underline decoration-current decoration-dotted decoration-[1.5px] underline-offset-[7px]" : ""}`}
                  style={
                    highlight
                      ? {
                          // The design draws the swatches but never a
                          // highlighted verse, so this part is a judgement:
                          // the colour goes behind the words and the text
                          // flips dark, because white on #FFFE54 is unreadable.
                          backgroundColor: highlight,
                          color: "#0E0E0E",
                          boxShadow: `0 0 0 4px ${highlight}`,
                          borderRadius: 2,
                        }
                      : { color: "#FFFFFF" }
                  }
                >
                  {verse.text}
                </p>
              </div>

              {/* The bar hangs off this verse rather than the screen, so it
                  scrolls with it and stays next to what it acts on. Sibling of
                  the row, not a child, so the row's press dimming does not take
                  the bar down with it. */}
              {isAnchor && !showCompare && (
                <VerseActionBar
                  highlight={commonHighlight}
                  onHighlight={setHighlight}
                  actions={actions}
                  placement={placement}
                />
              )}
              </div>
            );
          })}
        </div>

        {/* The nav stays through a selection. It used to be hidden because the
            action bar took its slot; the bar is contextual now, so the slot is
            free and there is no reason to take navigation away mid-read. The
            design's selected-verse frames omit it — this is a deliberate
            departure, and the flip below keeps the bar clear of it. */}
        {!showBooks && !showCompare && (
          <BottomNav activeTab="bible" minimized={navMinimized} onExpand={expandNav} />
        )}

        {/*
         * Previous and next chapter. Figma "Bible" 2679:18153 / 2679:18156.
         *
         *   button   52 circle, #0E0E0E — the app's floating-surface colour,
         *            the same one the nav, the title pill and the sheets use
         *   chevron  18.2x9.1 stroked 1.95, white, round cap and join, centred
         *
         * The glyph is ChevronIcon, which is already this exact curve at
         * 14x7 in a 25 box stroked 1.5. 32.5 is that box scaled 1.3, which
         * lands the path on 18.2x9.1 and the stroke on 1.95 — the frame's own
         * numbers, so there is nothing new to draw and nothing to keep in step.
         *
         * The frame insets the left button 47 and the right 41, which reads as
         * a slip rather than an intent: 47 is also where the nav pill's left
         * edge falls on a 375 screen, so both are inset 47 here and the pair
         * lines up with the nav beneath them.
         *
         * Absolute inside the shell rather than fixed, so they sit at the
         * COLUMN's edges and follow it from 375 to 782 without being told to.
         *
         * Hidden while a verse is selected: the action bar is contextual and
         * can hang anywhere, and two more floating circles under it is noise
         * at exactly the moment the reader is doing something else.
         */}
        {!showBooks && !showCompare && !selected.length && (
          <>
            <ChapterPagerButton
              label="Previous chapter"
              side="left"
              target={prevChapter}
              onGo={(b, c) => router.push(`/bible/${bookSlug(b)}/${c}`)}
            />
            <ChapterPagerButton
              label="Next chapter"
              side="right"
              target={nextChapter}
              onGo={(b, c) => router.push(`/bible/${bookSlug(b)}/${c}`)}
            />
          </>
        )}
      </div>

      {/* Books Sheet */}
      {showBooks && (
        <BooksSheet
          currentBook={book}
          currentChapter={chapter}
          onClose={() => setShowBooks(false)}
          onSelect={(nextBook, nextChapter) => {
            // The reference lives in the URL, so a chapter can be linked to and
            // the back button walks the chapters you actually read.
            router.push(`/bible/${bookSlug(nextBook)}/${nextChapter}`);
          }}
        />
      )}

      {/* Compare Sheet — reached from the action bar */}
      {showCompare && selected.length > 0 && (
        <CompareSheet
          // The real reference, not an abbreviation. This used to shorten
          // "Psalm" to "Ps" to fit the card's narrow header, which turned
          // "Psalms 46" into "Pss 46" the moment the book was named from the
          // canonical list. There is nothing to abbreviate FOR any more: the
          // header is min-w-0 flex-1 truncate, so a reference too long for the
          // row ellipsises on its own, and the card is 740 wide at desk.
          verseRef={`${chapterTitle} ${formatVerseRange(selected)}`}
          verseNumbers={selected}
          translations={listedTranslations}
          allTranslations={allTranslations}
          onToggleVersion={toggleVersion}
          onClose={() => setShowCompare(false)}
        />
      )}
    </>
  );
}

function ChapterPagerButton({
  label,
  side,
  target,
  onGo,
}: {
  label: string;
  side: "left" | "right";
  target: { book: string; chapter: number } | null;
  onGo: (book: string, chapter: number) => void;
}) {
  // Nothing to page to means no button, rather than a dimmed one. There are
  // exactly two places this happens in the whole Bible — before Genesis 1 and
  // after Revelation 22 — so a greyed circle is a permanent piece of furniture
  // explaining a rule almost nobody will meet.
  if (!target) return null;

  return (
    <button
      type="button"
      aria-label={`${label}: ${target.book} ${target.chapter}`}
      onClick={() => onGo(target.book, target.chapter)}
      className={`absolute z-[60] flex h-[52px] w-[52px] items-center justify-center rounded-full
                  border-none text-white
                  bottom-[calc(97px+env(safe-area-inset-bottom))] desk:bottom-[32px]
                  transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)]
                  active:scale-[0.94]
                  ${side === "left" ? "left-[47px]" : "right-[47px]"}`}
      style={{ backgroundColor: "#0E0E0E" }}
    >
      {/* Down by default, so a quarter turn each way points it along the row. */}
      <span className={`flex ${side === "left" ? "rotate-90" : "-rotate-90"}`}>
        <ChevronIcon size={32.5} />
      </span>
    </button>
  );
}
