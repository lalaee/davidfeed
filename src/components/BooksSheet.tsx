"use client";

import { useState, useEffect, useRef } from "react";

const BOOKS: { name: string; chapters: number }[] = [
  // Old Testament
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Songs", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  // New Testament
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];

interface BooksSheetProps {
  currentBook?: string;
  currentChapter?: number;
  onClose: () => void;
  onSelect?: (book: string, chapter: number) => void;
}

export default function BooksSheet({
  currentBook = "Psalms",
  currentChapter = 46,
  onClose,
  onSelect,
}: BooksSheetProps) {
  const [expandedBook, setExpandedBook] = useState<string>(currentBook);
  const activeBookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      activeBookRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 320);
    return () => clearTimeout(timer);
  }, []);

  const handleBookPress = (bookName: string) => {
    setExpandedBook((prev) => (prev === bookName ? "" : bookName));
  };

  const handleChapterPress = (bookName: string, chapter: number) => {
    onSelect?.(bookName, chapter);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[110] animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[111] animate-slide-up">
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col items-start pb-[48px] px-[16px] overflow-y-auto max-h-[90dvh] scrollbar-hide">

          {/* Header row — stays pinned while the book list scrolls behind it */}
          <div className="sticky top-0 z-20 bg-black flex gap-[10px] items-center w-full shrink-0 -mx-[16px] px-[16px] pt-[24px] pb-[24px]">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1c1c1e] rounded-full w-[48px] h-[48px] flex-shrink-0 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <p className="text-white text-[20px] font-semibold leading-[1.5] tracking-[-0.26px] flex-1 min-w-0">
              Books
            </p>
          </div>

          {/* Book list */}
          <div className="flex flex-col gap-[16px] w-full shrink-0">
            {BOOKS.map(({ name, chapters }) => {
              const isExpanded = expandedBook === name;
              const chapterNums = Array.from({ length: chapters }, (_, i) => i + 1);

              return (
                <div key={name} ref={name === currentBook ? activeBookRef : null} className="flex flex-col gap-[16px] w-full">
                  {/* Book row — sticks below the sheet header while this book's chapter grid scrolls past */}
                  <button
                    type="button"
                    onClick={() => handleBookPress(name)}
                    className="sticky top-[96px] z-10 bg-black flex gap-[8px] h-[40px] items-center px-[16px] rounded-[41px] w-full text-left"
                  >
                    <span className={`flex-1 min-w-0 text-[20px] font-normal leading-[1.5] tracking-[-0.26px] ${isExpanded ? "text-white" : "text-[#afafaf]"}`}>
                      {name}
                    </span>
                    {/* Chevron — up when expanded, down when collapsed */}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke={isExpanded ? "white" : "#afafaf"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {/* Chapter grid — shown when expanded */}
                  {isExpanded && (
                    <div className="px-[16px] flex flex-col gap-[10px]">
                      {/* Chunk chapters into rows of 5 */}
                      {Array.from({ length: Math.ceil(chapterNums.length / 5) }, (_, rowIdx) => (
                        <div key={rowIdx} className="flex gap-[10px]">
                          {chapterNums.slice(rowIdx * 5, rowIdx * 5 + 5).map((ch) => {
                            const isCurrentChapter = name === currentBook && ch === currentChapter;
                            return (
                              <button
                                key={ch}
                                type="button"
                                onClick={() => handleChapterPress(name, ch)}
                                className={`flex-1 flex items-center justify-center p-[12px] rounded-[7px] ${isCurrentChapter ? "bg-white" : "bg-[#101010]"}`}
                              >
                                <span className={`text-[16px] font-normal leading-[1.5] tracking-[-0.26px] text-center ${isCurrentChapter ? "text-black" : "text-[#afafaf]"}`}>
                                  {ch}
                                </span>
                              </button>
                            );
                          })}
                          {/* Fill empty slots in last row so tiles stay equal width */}
                          {chapterNums.slice(rowIdx * 5, rowIdx * 5 + 5).length < 5 &&
                            Array.from({ length: 5 - chapterNums.slice(rowIdx * 5, rowIdx * 5 + 5).length }).map((_, i) => (
                              <div key={`empty-${i}`} className="flex-1" />
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}
