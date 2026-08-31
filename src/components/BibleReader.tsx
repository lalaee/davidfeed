"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import BottomNav from "./BottomNav";
import BooksSheet from "./BooksSheet";
import CompareSheet from "./CompareSheet";
import VerseActionBar, { type VerseAction } from "./VerseActionBar";
import { BookmarkIcon, CompareIcon, SendIcon } from "./icons";
import type { Translation } from "@/data/psalm46";

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
 *                 height auto (24 at that size), #999999, in a 20px gutter.
 *                 The number is very nearly the size of the verse — it reads
 *                 small because it is grey and its tighter line box lifts it
 *                 ~4px, not because it is set smaller.
 *   header labels Inter Semi Bold 17/22, -0.408 tracking, both of them
 *   verse pitch   120 on 96-tall blocks = 24 apart
 *
 * The motion is the app's own and is deliberately kept: the header still
 * morphs on scroll, presses answer on pointer-down, and the bar arrives on the
 * shared iOS curve.
 */
interface Verse {
  number: number;
  text: string;
}

interface BibleReaderProps {
  chapterTitle: string;
  artworkSrc?: string;
  version?: string;
  verses: Verse[];
  /** The translations the compare card lists by default. */
  translations?: Translation[];
  /** Further translations the picker can offer but that are not listed. */
  moreTranslations?: Translation[];
}

/*
 * Highlights outlive the visit, so they live in localStorage, keyed per
 * chapter.
 *
 * Read through useSyncExternalStore rather than seeded in an effect. The page
 * is prerendered, so reading during render would hydrate against markup that
 * has no highlights in it; and setState inside an effect is a cascading render
 * this project already rejects at build time. The store answers with a stable
 * reference — reparsing only when the raw string actually changes — because
 * useSyncExternalStore loops forever on a snapshot that is a new object each
 * call.
 */
const HIGHLIGHT_KEY = "dafod.highlights";
const SAVED_KEY = "dafod.saved";
const VERSIONS_KEY = "dafod.versions";

type ChapterMap<T> = Record<number, T>;
const EMPTY_CHAPTER = {} as ChapterMap<never>;
const EMPTY_STORE = {} as Record<string, ChapterMap<never>>;

/*
 * One localStorage-backed store per key, read through useSyncExternalStore.
 *
 * Not seeded in an effect: the page is prerendered, so reading during render
 * would hydrate against markup that has neither highlights nor saves in it,
 * and setState inside an effect is a cascading render this project rejects at
 * build time. getSnapshot must also be referentially stable — a fresh object
 * every call spins React forever — hence the parse cache keyed on the raw
 * string.
 */
function makeJsonStore<T>(key: string, empty: T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null = null;
  let cachedValue: T = empty;

  const read = (): T => {
    let raw = "";
    try {
      raw = localStorage.getItem(key) ?? "";
    } catch {}
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedValue = raw ? (JSON.parse(raw) as T) : empty;
      } catch {
        cachedValue = empty;
      }
    }
    return cachedValue;
  };

  return {
    read,
    subscribe(listener: () => void) {
      listeners.add(listener);
      // Another tab writing the same key should show up here too.
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    write(value: T) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      listeners.forEach((l) => l());
    },
    serverSnapshot: () => empty,
  };
}

type ChapterStore<T> = Record<string, ChapterMap<T>>;
const highlightStore = makeJsonStore<ChapterStore<string>>(HIGHLIGHT_KEY, EMPTY_STORE);
const savedStore = makeJsonStore<ChapterStore<true>>(SAVED_KEY, EMPTY_STORE);
/* Which translations the compare card lists. Null means "whatever the chapter
   ships as its default", so a reader who never opens the picker follows the
   design rather than a snapshot of it frozen at first run. */
const versionsStore = makeJsonStore<string[] | null>(VERSIONS_KEY, null);

/*
 * "v 1", "v 1-3", "v 1, 4-5". Runs are collapsed because a multi-verse
 * selection is usually contiguous, and "v 3-9" is what a person would write
 * where a list of seven numbers is what a loop would produce.
 */
function formatVerseRange(numbers: number[]): string {
  if (!numbers.length) return "";
  const runs: string[] = [];
  let start = numbers[0];
  let prev = numbers[0];
  for (const n of numbers.slice(1).concat(NaN)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  return `v ${runs.join(", ")}`;
}

export default function BibleReader({
  chapterTitle = "Psalm 46",
  artworkSrc = "/assets/feed-poster-frame.jpg",
  version = "WEB",
  verses = [],
  translations = [],
  moreTranslations = [],
}: BibleReaderProps) {
  // Everything the picker can offer: the listed set first, then the rest.
  const allTranslations = useMemo(
    () => [...translations, ...moreTranslations],
    [translations, moreTranslations],
  );
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
      savedStore.subscribe,
      savedStore.read,
      savedStore.serverSnapshot,
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
    if (!chosenVersionIds) return translations;
    const picked = allTranslations.filter((t) => chosenVersionIds.includes(t.id));
    // A stored choice can go stale if a translation is renamed or dropped;
    // fall back rather than showing an empty card.
    return picked.length ? picked : translations;
  }, [chosenVersionIds, translations, allTranslations]);

  const toggleVersion = useCallback(
    (id: string) => {
      const current = versionsStore.read() ?? translations.map((t) => t.id);
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : // Keep the file's order rather than the order they were tapped in.
          allTranslations.filter((t) => current.includes(t.id) || t.id === id).map((t) => t.id);
      // Never leave the card with nothing to show.
      if (!next.length) return;
      versionsStore.write(next);
    },
    [translations, allTranslations],
  );

  const saved = selected.length > 0 && selected.every((n) => savedVerses[n]);
  const toggleSaved = useCallback(() => {
    if (!selected.length) return;
    const current = savedStore.read()[chapterTitle] ?? EMPTY_CHAPTER;
    const allSaved = selected.every((n) => current[n]);
    const next: Record<number, true> = { ...current };
    for (const n of selected) {
      if (allSaved) delete next[n];
      else next[n] = true;
    }
    savedStore.write({ ...savedStore.read(), [chapterTitle]: next });
  }, [chapterTitle, selected]);

  const handleShare = useCallback(() => {
    if (!selected.length || !navigator.share) return;
    const picked = verses.filter((v) => selected.includes(v.number));
    const body = picked.map((v) => v.text).join(" ");
    const ref = `${chapterTitle} ${formatVerseRange(selected)}`;
    navigator.share({
      title: ref,
      text: `"${body}" - ${ref} (${version})`,
      url: window.location.href,
    });
  }, [chapterTitle, selected, verses, version]);

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

  // A ring is only honest when every selected verse carries that colour;
  // a mixed selection shows none rather than picking a winner.
  const commonHighlight =
    selected.length > 0 && selected.every((n) => highlights[n] === highlights[selected[0]])
      ? (highlights[selected[0]] ?? null)
      : null;

  // iOS 26 toolbar morph — as verses scroll under the floating header, the pill
  // row shrinks ~4% and its glass panes saturate slightly.
  const versesScrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Below the verse unless the bar would fall off the bottom, in which case it
  // goes above — the ordinary popover rule. Re-measured while scrolling,
  // because the verse it hangs off moves.
  const [placement, setPlacement] = useState<"above" | "below">("below");
  useEffect(() => {
    const el = versesScrollRef.current;
    if (!el) return;
    const measure = () => {
      setScrollProgress(Math.min(1, el.scrollTop / 40));
      const row = anchorRef.current;
      if (!row) return;
      const bottom = row.getBoundingClientRect().bottom;
      // 17 gap + 78 bar + 16 of breathing room at the edge.
      setPlacement(bottom + 111 > window.innerHeight ? "above" : "below");
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [anchor]);

  return (
    <>
      {/* Fixed background for Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      <div className={`app-shell relative w-full md:max-w-[390px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden ${recede}`}>
        {/* Header Section — absolutely overlaid so the verses scroll behind it */}
        <div className="absolute top-0 left-0 right-0 z-10 px-[24px] pt-[40px]">
          {/* Verse Artwork + Title Row — iOS 26 morph: scales with scroll */}
          <div
            className="app-header-morph flex items-center justify-between h-[72px]"
            style={{ ["--scroll-progress" as string]: scrollProgress } as React.CSSProperties}
            data-scrolled={scrollProgress > 0.05 ? "" : undefined}
          >
            <button
              type="button"
              onClick={() => setShowBooks(true)}
              className="flex h-[72px] w-[158px] items-center gap-[12px] rounded-[22px] p-[12px] active:opacity-70 transition-opacity"
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
              <span className="text-[17px] font-semibold text-white tracking-[-0.408px] leading-[22px] whitespace-nowrap">
                {chapterTitle}
              </span>
            </button>

            {/* Version Selector */}
            <button
              type="button"
              className="rounded-[19.252px] px-[16px] h-[38px] flex items-center justify-center"
              style={{ backgroundColor: "#0E0E0E" }}
            >
              <span className="text-[17px] font-semibold text-white tracking-[-0.408px] leading-[22px]">
                {version}
              </span>
            </button>
          </div>
        </div>

        {/* Verses */}
        <div
          ref={versesScrollRef}
          className="flex-1 overflow-y-auto px-[27px] pt-[144px] pb-[140px] scrollbar-hide"
          // A tap on the column itself, rather than on a verse, dismisses the
          // bar — the bar occupies the nav's slot, so there has to be a way back.
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
          {verses.map((verse) => {
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
                  className="w-[20px] flex-shrink-0 text-[20px] font-medium leading-[24px]"
                  style={{ color: "#999999" }}
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

        {/* The nav belongs to the page and recedes with it. The bar does not,
            so it is rendered outside the shell below. */}
        {!selected.length && !showBooks && !showCompare && <BottomNav activeTab="bible" />}
      </div>

      {/* Books Sheet */}
      {showBooks && (
        <BooksSheet
          currentBook={chapterTitle.startsWith("Psalm ") ? "Psalms" : chapterTitle.split(" ")[0]}
          currentChapter={parseInt(chapterTitle.split(" ").pop() ?? "1", 10)}
          onClose={() => setShowBooks(false)}
        />
      )}

      {/* Compare Sheet — reached from the action bar */}
      {showCompare && selected.length > 0 && (
        <CompareSheet
          verseRef={`${chapterTitle.replace("Psalm", "Ps")} ${formatVerseRange(selected)}`}
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
