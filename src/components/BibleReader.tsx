"use client";

import { useState, useCallback } from "react";
import BottomNav from "./BottomNav";
import VersePlayerCard from "./VersePlayerCard";
import PlaybackControls from "./PlaybackControls";

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

  return (
    <>
      {/* Fixed background for Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      <div className="relative w-full md:max-w-[375px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="flex-shrink-0 px-[15.5px] pt-[44.52px]">
          {/* Verse Artwork + Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px] bg-[#1c1c1e] rounded-[22px] pr-[20px] h-[63.925px]">
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
            </div>

            {/* Version Selector */}
            <button
              type="button"
              className="bg-[#1c1c1e] rounded-[19.252px] px-[16px] py-[8px] h-[38px] flex items-center justify-center"
            >
              <span className="text-[17px] font-normal text-white tracking-[-0.408px] leading-[22px]">
                {version}
              </span>
            </button>
          </div>

          {/* Read/Listen Toggle */}
          <div className="mt-[31.5px] bg-[#1c1c1e] rounded-[32px] p-[12px] flex items-center gap-[24px] w-[345px]">
            <button
              type="button"
              onClick={() => setActiveTab("read")}
              className={`flex-1 py-[4px] px-[8px] rounded-[16px] flex items-center justify-center transition-colors ${
                activeTab === "read" ? "bg-white" : "bg-transparent"
              }`}
            >
              <span
                className={`text-[17px] font-normal tracking-[-0.408px] leading-[22px] ${
                  activeTab === "read" ? "text-black" : "text-white"
                }`}
              >
                Read
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("listen")}
              className={`flex-1 py-[4px] px-[8px] rounded-[16px] flex items-center justify-center transition-colors ${
                activeTab === "listen" ? "bg-white" : "bg-transparent"
              }`}
            >
              <span
                className={`text-[17px] font-normal tracking-[-0.408px] leading-[22px] ${
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
          <div className="flex-1 overflow-y-auto px-[16px] pt-[40px] pb-[140px] scrollbar-hide">
            {verses.map((verse, index) => (
              <div
                key={verse.number}
                className={`flex gap-[8px] mb-[24px] ${
                  index >= verses.length - 2 ? "opacity-50 blur-[1.5px]" : ""
                }`}
              >
                {/* Verse Number */}
                <span className="text-[20px] font-medium text-white min-w-[23px] flex-shrink-0">
                  {verse.number}
                </span>
                {/* Verse Text */}
                <p className="text-[24px] font-medium text-white leading-normal max-w-[335px]">
                  {verse.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* LISTEN MODE - Player card + controls overlaying blurred verses */
          <div className="flex-1 flex flex-col px-[15px] pt-[24px] pb-[140px] overflow-hidden relative">
            {/* Verse Player Card */}
            {currentVerse && (
              <VersePlayerCard
                verseNumber={currentVerse.number}
                verseText={currentVerse.text}
                onShare={handleShare}
              />
            )}

            {/* Upcoming Verses (blurred preview) - positioned behind controls */}
            <div className="mt-[32px] flex-1 overflow-hidden relative">
              {upcomingVerses.map((verse) => (
                <div
                  key={verse.number}
                  className="flex gap-[8px] mb-[16px] blur-[2px]"
                >
                  <span className="text-[20px] font-semibold text-white/50 min-w-[23px] flex-shrink-0">
                    {verse.number}
                  </span>
                  <p className="text-[24px] font-semibold text-white/50 leading-normal max-w-[335px]">
                    {verse.text}
                  </p>
                </div>
              ))}

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
        <BottomNav activeTab="bible" />
      </div>
    </>
  );
}
