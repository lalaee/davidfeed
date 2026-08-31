"use client";

import { useState, useEffect, useRef } from "react";
import BottomNav from "./BottomNav";
import VerseActionSheet from "./VerseActionSheet";
import BooksSheet from "./BooksSheet";

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

export default function BibleReader({
  chapterTitle = "Psalm 46",
  artworkSrc = "/assets/feed-poster-frame.jpg",
  version = "NIV",
  verses = [],
}: BibleReaderProps) {
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [showBooks, setShowBooks] = useState(false);


  // Any sheet open → BibleReader recedes (scale + corner radius) behind the sheet's blurred scrim
  const anySheetOpen = !!selectedVerse || showBooks;

  // iOS 26 toolbar morph — as verses scroll under the floating header, the pill
  // row shrinks ~4% and its glass panes saturate slightly. Threshold (80px)
  // matches the UINavigationBar large-title→inline transition iOS uses.
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
        <div className="absolute top-0 left-0 right-0 z-10 px-[15.5px] pt-[44.52px]">
          {/* Verse Artwork + Title Row — iOS 26 morph: scales with scroll, glass saturates */}
          <div
            className="app-header-morph flex items-center justify-between h-[63.925px]"
            style={{ ["--scroll-progress" as string]: scrollProgress } as React.CSSProperties}
            data-scrolled={scrollProgress > 0.05 ? "" : undefined}
          >
            <button
              type="button"
              onClick={() => setShowBooks(true)}
              className="flex items-center gap-[10px] bg-[#1c1c1e] rounded-[22px] pr-[10px] h-[63.925px] w-[162px] active:opacity-70 transition-opacity"
            >
              {/* Artwork Thumbnail */}
              <div className="w-[48px] h-[48px] rounded-[12px] border-[0.5px] border-[rgba(120,120,128,0.2)] overflow-hidden ml-[10px]">
                <img
                  src={artworkSrc}
                  alt={chapterTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Chapter Title */}
              <span className="text-[17px] font-bold text-white tracking-[-0.408px] leading-[22px]">
                {chapterTitle}
              </span>
            </button>

            {/* Version Selector — the only thing left on the right now that the
                compact Read/Listen pills are gone, so it no longer needs a
                flex row of its own. */}
            <button
              type="button"
              className="bg-[#1c1c1e] rounded-[19.252px] px-[16px] pt-[8px] pb-[9px] h-[38px] flex items-center justify-center"
            >
              <span className="text-[17px] font-normal text-white tracking-[-0.408px] leading-[22px]">
                {version}
              </span>
            </button>
          </div>
        </div>

        {/* Verses — the only mode. The Read/Listen toggle and the listen
            player were removed; a chapter is read here, and the feed is
            where a psalm is listened to. */}
        <div
          ref={versesScrollRef}
          // 148px cleared the header alone; the extra 86 was the toggle row
          // (31.5 margin + its height), which is gone.
          className="flex-1 overflow-y-auto px-[15.5px] pt-[148px] pb-[140px] scrollbar-hide"
        >
          {verses.map((verse) => (
            <div
              key={verse.number}
              className="flex gap-[8px] mb-[24px] active:opacity-60 transition-opacity cursor-pointer"
              onClick={() => setSelectedVerse(verse)}
            >
              {/* Verse Number */}
              <span className="text-[20px] font-medium text-white min-w-[23px] flex-shrink-0">
                {verse.number}
              </span>
              {/* Verse Text */}
              <p className="text-[24px] font-medium text-white leading-normal flex-1 min-w-0">
                {verse.text}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Navigation Bar */}
        {!selectedVerse && !showBooks && <BottomNav activeTab="bible" />}
      </div>

      {/* Verse Action Sheet */}
      {selectedVerse && (
        <VerseActionSheet
          verse={selectedVerse}
          chapterTitle={chapterTitle}
          version={version}
          onClose={() => setSelectedVerse(null)}
        />
      )}

      {/* Books Sheet */}
      {showBooks && (
        <BooksSheet
          currentBook={chapterTitle.startsWith("Psalm ") ? "Psalms" : chapterTitle.split(" ")[0]}
          currentChapter={parseInt(chapterTitle.split(" ").pop() ?? "1", 10)}
          onClose={() => setShowBooks(false)}
        />
      )}
    </>
  );
}
