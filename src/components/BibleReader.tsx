"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import BottomNav from "./BottomNav";
import BooksSheet from "./BooksSheet";
import CompareSheet from "./CompareSheet";
import VerseActionBar, { type VerseAction } from "./VerseActionBar";
import { CompareIcon, SendIcon } from "./icons";

/*
 * Geometry, type and colour follow Figma "Bible" — 2641:1161 (reading) and
 * 2642:1725 (verse selected) — measured off the frames rather than eyeballed:
 *
 *   page margin   24 for the header, 27 for the verses (the design insets the
 *                 verse column 3px further than the header pill)
 *   header row    y=40, 72 tall
 *   title pill    158x72, radius 18, #212121, artwork inset 12, 12 gap
 *   version pill  61x38, #212121
 *   verses top    144  (header row y=40 + 104)
 *   verse         21px/31.5 regular white, number 21px/24 regular #999999 in
 *                 a 20px gutter — the number is the SAME SIZE as the verse,
 *                 not a small superscript; it only reads smaller because it is
 *                 grey and its tighter line box lifts it ~4px
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

type ChapterHighlights = Record<number, string>;
const NO_HIGHLIGHTS: ChapterHighlights = {};
const EMPTY_STORE: Record<string, ChapterHighlights> = {};

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: Record<string, ChapterHighlights> = EMPTY_STORE;

function readHighlights(): Record<string, ChapterHighlights> {
  let raw = "{}";
  try {
    raw = localStorage.getItem(HIGHLIGHT_KEY) ?? "{}";
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = JSON.parse(raw);
    } catch {
      cachedValue = EMPTY_STORE;
    }
  }
  return cachedValue;
}

function writeHighlights(chapter: string, next: ChapterHighlights) {
  try {
    const all = { ...readHighlights(), [chapter]: next };
    localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(all));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribeHighlights(listener: () => void) {
  listeners.add(listener);
  // Another tab writing the same key should show up here too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export default function BibleReader({
  chapterTitle = "Psalm 46",
  artworkSrc = "/assets/feed-poster-frame.jpg",
  version = "NIV",
  verses = [],
}: BibleReaderProps) {
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [showBooks, setShowBooks] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const allHighlights = useSyncExternalStore(
    subscribeHighlights,
    readHighlights,
    () => EMPTY_STORE,
  );
  const highlights = allHighlights[chapterTitle] ?? NO_HIGHLIGHTS;

  const setHighlight = useCallback(
    (colour: string | null) => {
      if (!selectedVerse) return;
      const next = { ...(readHighlights()[chapterTitle] ?? NO_HIGHLIGHTS) };
      if (colour) next[selectedVerse.number] = colour;
      else delete next[selectedVerse.number];
      writeHighlights(chapterTitle, next);
    },
    [chapterTitle, selectedVerse],
  );

  const handleShare = useCallback(() => {
    if (!selectedVerse || !navigator.share) return;
    navigator.share({
      title: `${chapterTitle}:${selectedVerse.number}`,
      text: `"${selectedVerse.text}" - ${chapterTitle}:${selectedVerse.number} (${version})`,
      url: window.location.href,
    });
  }, [chapterTitle, selectedVerse, version]);

  // The design clips its third action at the frame edge because the row is a
  // carousel; these are the ones legible in it. Adding another is one entry.
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
    ],
    [handleShare],
  );

  // Only a real sheet makes the reader recede; the action bar is part of the
  // page, not something laid over it.
  const anySheetOpen = showBooks || showCompare;

  // iOS 26 toolbar morph — as verses scroll under the floating header, the pill
  // row shrinks ~4% and its glass panes saturate slightly.
  const versesScrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const el = versesScrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollProgress(Math.min(1, el.scrollTop / 40));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Fixed background for Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      <div className={`app-shell relative w-full md:max-w-[390px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden ${anySheetOpen ? "sheet-open" : ""}`}>
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
              className="flex h-[72px] w-[158px] items-center gap-[12px] rounded-[18px] p-[12px] active:opacity-70 transition-opacity"
              style={{ backgroundColor: "#212121" }}
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
              <span className="text-[17px] font-bold text-white tracking-[-0.408px] leading-[22px] whitespace-nowrap">
                {chapterTitle}
              </span>
            </button>

            {/* Version Selector */}
            <button
              type="button"
              className="rounded-[19.252px] px-[16px] h-[38px] flex items-center justify-center"
              style={{ backgroundColor: "#212121" }}
            >
              <span className="text-[17px] font-normal text-white tracking-[-0.408px] leading-[22px]">
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
            if (e.target === e.currentTarget) setSelectedVerse(null);
          }}
        >
          {verses.map((verse) => {
            const selected = selectedVerse?.number === verse.number;
            const highlight = highlights[verse.number];
            return (
              <div
                key={verse.number}
                // select-none: a tap on a paragraph otherwise lands as a text
                // selection instead of a tap, which swallowed the first press.
                className="flex mb-[24px] select-none active:opacity-60 transition-opacity cursor-pointer"
                onClick={() =>
                  setSelectedVerse((prev) =>
                    prev?.number === verse.number ? null : verse,
                  )
                }
              >
                {/* Verse Number — 20px gutter, no gap; the design puts the
                    verse text at exactly 20 from the block's left edge. */}
                <span
                  className="w-[20px] flex-shrink-0 text-[21px] font-normal leading-[24px]"
                  style={{ color: "#999999" }}
                >
                  {verse.number}
                </span>
                {/* Verse Text */}
                <p
                  className={`flex-1 min-w-0 text-[21px] font-normal leading-[31.5px]
                              transition-colors duration-200
                              ${selected ? "underline decoration-current decoration-dotted decoration-[1.5px] underline-offset-[7px]" : ""}`}
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
            );
          })}
        </div>

        {/* The bar takes the nav's place while a verse is selected, exactly as
            the design does — its frame has no nav in it. */}
        {selectedVerse ? (
          <VerseActionBar
            highlight={highlights[selectedVerse.number] ?? null}
            onHighlight={setHighlight}
            actions={actions}
          />
        ) : (
          !showBooks && !showCompare && <BottomNav activeTab="bible" />
        )}
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
      {showCompare && selectedVerse && (
        <CompareSheet
          verseRef={`${chapterTitle.replace("Psalm", "Ps")} v ${selectedVerse.number}`}
          onClose={() => setShowCompare(false)}
        />
      )}
    </>
  );
}
