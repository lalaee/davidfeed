"use client";

import { useState, useCallback } from "react";
import BottomNav from "./BottomNav";
import VersePlayerCard from "./VersePlayerCard";
import PlaybackControls from "./PlaybackControls";
import VerseActionSheet from "./VerseActionSheet";
import BooksSheet from "./BooksSheet";
import PersonaliseSheet from "./PersonaliseSheet";

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
  const [activeTab, setActiveTab] = useState<"read" | "listen">("read");
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [showBooks, setShowBooks] = useState(false);
  const [showPersonalise, setShowPersonalise] = useState(false);

  const currentVerse = verses[currentVerseIndex];

  const handlePrevious = useCallback(() => {
    setCurrentVerseIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentVerseIndex((prev) => Math.min(verses.length - 1, prev + 1));
  }, [verses.length]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share && currentVerse) {
      navigator.share({
        title: `${chapterTitle}:${currentVerse.number}`,
        text: `"${currentVerse.text}" - ${chapterTitle}:${currentVerse.number} (${version})`,
        url: window.location.href,
      });
    }
  }, [chapterTitle, currentVerse, version]);

  // Get upcoming verses for blur preview (in listen mode)
  const upcomingVerses = verses.slice(currentVerseIndex + 1, currentVerseIndex + 4);

  // Any sheet open → BibleReader recedes (scale + corner radius) behind the sheet's blurred scrim
  const anySheetOpen = !!selectedVerse || showBooks || showPersonalise;

  return (
    <>
      {/* Fixed background for Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      <div className={`app-shell relative w-full md:max-w-[390px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden ${anySheetOpen ? "sheet-open" : ""}`}>
        {/* Header Section */}
        <div className="flex-shrink-0 px-[15.5px] pt-[44.52px]">
          {/* Verse Artwork + Title Row */}
          <div className="relative h-[63.925px]">
            <button
              type="button"
              onClick={() => setShowBooks(true)}
              className="flex items-center gap-[10px] bg-[#1c1c1e] rounded-[22px] pr-[10px] h-[63.925px] w-[162px] active:opacity-70 transition-opacity">
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

            {/* Version Selector — absolutely placed to match Figma left:299px */}
            <button
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#1c1c1e] rounded-[19.252px] px-[16px] pt-[8px] pb-[9px] h-[38px] flex items-center justify-center"
            >
              <span className="text-[17px] font-normal text-white tracking-[-0.408px] leading-[22px]">
                {version}
              </span>
            </button>
          </div>

          {/* Read/Listen Toggle — segmented control with a single sliding pill */}
          <div className="relative mt-[31.5px] bg-[#1c1c1e] rounded-[32px] p-[12px] flex items-center gap-[24px] w-full">
            {/* Sliding white indicator — translates between the two slots on the same iOS curve as the sheets */}
            <div
              aria-hidden
              className={`absolute top-[12px] left-[12px] h-[calc(100%-24px)] w-[calc(50%-24px)] bg-white rounded-[16px] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                activeTab === "listen" ? "translate-x-[calc(100%+24px)]" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={() => setActiveTab("read")}
              className="relative flex-1 py-[4px] px-[8px] flex items-center justify-center"
            >
              <span
                className={`text-[17px] font-normal tracking-[-0.408px] leading-[22px] transition-colors duration-200 ${
                  activeTab === "read" ? "text-black" : "text-white"
                }`}
              >
                Read
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("listen")}
              className="relative flex-1 py-[4px] px-[8px] flex items-center justify-center"
            >
              <span
                className={`text-[17px] font-normal tracking-[-0.408px] leading-[22px] transition-colors duration-200 ${
                  activeTab === "listen" ? "text-black" : "text-white"
                }`}
              >
                Listen
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "read" ? (
          /* READ MODE - Scrollable verses */
          <div className="flex-1 overflow-y-auto px-[15.5px] pt-[40px] pb-[140px] scrollbar-hide">
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
        ) : (
          /* LISTEN MODE - Player card + controls overlaying blurred verses */
          <div className="flex-1 flex flex-col px-[15.5px] pt-[24px] pb-[140px] overflow-hidden relative">
            {/* Verse Player Card */}
            {currentVerse && (
              <VersePlayerCard
                verseNumber={currentVerse.number}
                verseText={currentVerse.text}
                onShare={handleShare}
                onPersonalise={() => setShowPersonalise(true)}
              />
            )}

            {/* Upcoming Verses (blurred preview) */}
            <div className="mt-[32px] flex-1 overflow-hidden relative">
              {upcomingVerses.map((verse) => (
                <div
                  key={verse.number}
                  className="flex mb-[16px] blur-[1.5px]"
                >
                  <span className="text-[20px] font-semibold text-[rgba(255,255,255,0.49)] w-[23px] flex-shrink-0">
                    {verse.number}
                  </span>
                  <p className="text-[24px] font-semibold text-[rgba(255,255,255,0.49)] leading-normal flex-1 min-w-0 ml-[16px]">
                    {verse.text}
                  </p>
                </div>
              ))}

              {/* Gradient fade overlay */}
              <div className="absolute inset-x-[-15px] bottom-0 h-[431px] bg-gradient-to-t from-[rgba(0,0,0,0.97)] from-[23.666%] to-transparent pointer-events-none z-[5]" />

              {/* Playback Controls - Pinned above bottom nav */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-[20px] z-[10]">
                <PlaybackControls
                  onPrevious={handlePrevious}
                  onPlayPause={handlePlayPause}
                  onNext={handleNext}
                  isPlaying={isPlaying}
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        {!selectedVerse && !showPersonalise && !showBooks && <BottomNav activeTab="bible" />}
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

      {/* Personalise Sheet */}
      {showPersonalise && currentVerse && (
        <PersonaliseSheet
          verseRef={`${chapterTitle.replace("Psalm", "Ps")} v ${currentVerse.number} | ${version}`}
          verseText={currentVerse.text}
          onClose={() => setShowPersonalise(false)}
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
