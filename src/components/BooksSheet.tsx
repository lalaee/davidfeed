"use client";

import { useState, useLayoutEffect, useRef } from "react";

import { ChevronIcon, CloseIcon } from "./icons";

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

/*
 * Books and chapters.
 *
 * Figma "Bible" 2654:2933, frame 36942 — the same card the compare sheet uses,
 * 480 tall instead of 444:
 *
 *   card      333x480, radius 18.8333, #0E0E0E, padding 24/16, gap 32, at x=21
 *             and 10 from the bottom
 *   header    48 tall, gap 10: a 48x48 #212121 close circle, then "Books" in
 *             Inter Semi Bold 17/150%
 *   book row  40 tall, radius 41, 16 padding, label Inter Regular 18/150% in
 *             #FFFFFF whether it is open or shut, with Iconly's curved chevron
 *   chapters  rows of five, 10 apart, each chip 46x48 at radius 7 on #212121,
 *             the number in Inter Regular 16/150%
 *
 * The list scrolls inside the card, which is fixed: Psalms alone is thirty rows
 * of chapters. Book rows stick as their own chapters scroll under them, which
 * the design cannot show in a still frame but which a 150-chapter book needs.
 */
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentChapterRef = useRef<HTMLButtonElement>(null);

  /*
   * Open on the chapter you are reading, not merely on its book. Psalms is
   * thirty rows of chips, so scrolling Genesis..Psalms to the top still left
   * chapter 46 nine rows below the fold — which is what "the chapter was not in
   * view" was.
   *
   * Positioned a third of the way down rather than at the very top, so the
   * chapter has chapters either side of it and reads as a place in a list
   * rather than as the beginning of one.
   *
   * Layout effect and an immediate scrollTop, not scrollIntoView: this runs
   * before paint so the sheet is already in the right place when it arrives,
   * and setting the container directly cannot scroll an ancestor by accident.
   */
  useLayoutEffect(() => {
    const box = scrollRef.current;
    const chip = currentChapterRef.current;
    if (!box || !chip) return;
    const delta = chip.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += delta - box.clientHeight / 3;
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
      {/* Transparent — the design dims nothing; this only catches a tap. */}
      <div className="fixed inset-0 z-[110]" onClick={onClose} />

      <div
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[111]
                   flex h-[480px] max-h-[calc(100dvh-120px)] w-[calc(100%-42px)] -translate-x-1/2
                   flex-col gap-[32px] md:max-w-[348px]
                   rounded-[18.8333px] px-[16px] py-[24px]"
        style={{ backgroundColor: "#0E0E0E" }}
      >
        {/* Header */}
        <div className="flex h-[48px] flex-shrink-0 items-center gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-full
                       border-none text-white transition-transform duration-[190ms]
                       ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94]"
            style={{ backgroundColor: "#212121" }}
          >
            <CloseIcon size={20} />
          </button>
          <p className="min-w-0 flex-1 text-[17px] font-semibold leading-[25.5px] text-white">
            Books
          </p>
        </div>

        {/* Books, scrolling inside the card */}
        <div ref={scrollRef} className="scrollbar-hide flex flex-1 flex-col gap-[16px] overflow-y-auto">
          {BOOKS.map(({ name, chapters }) => {
            const isExpanded = expandedBook === name;
            const chapterNums = Array.from({ length: chapters }, (_, i) => i + 1);
            const rows = Math.ceil(chapterNums.length / 5);

            return (
              <div key={name} className="flex w-full flex-col gap-[16px]">
                <button
                  type="button"
                  onClick={() => handleBookPress(name)}
                  aria-expanded={isExpanded}
                  // Sticky so the book you are inside stays named while its
                  // chapters scroll past. #0E0E0E to match the card it sits on.
                  className="sticky top-0 z-10 flex h-[40px] w-full flex-shrink-0 items-center gap-[8px]
                             rounded-[41px] border-none px-[16px] text-left"
                  style={{ backgroundColor: "#0E0E0E" }}
                >
                  <span className="min-w-0 flex-1 text-[18px] font-normal leading-[27px] text-white">
                    {name}
                  </span>
                  <span
                    className={`flex flex-shrink-0 text-white transition-transform duration-200
                                ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <ChevronIcon size={25} />
                  </span>
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-[10px] px-[16px]">
                    {Array.from({ length: rows }, (_, rowIdx) => {
                      const slice = chapterNums.slice(rowIdx * 5, rowIdx * 5 + 5);
                      return (
                        <div key={rowIdx} className="flex gap-[10px]">
                          {slice.map((ch) => {
                            const current = name === currentBook && ch === currentChapter;
                            return (
                              <button
                                key={ch}
                                ref={current ? currentChapterRef : null}
                                type="button"
                                onClick={() => handleChapterPress(name, ch)}
                                aria-current={current ? "page" : undefined}
                                className="flex h-[48px] flex-1 items-center justify-center rounded-[7px]
                                           border-none transition-transform duration-[190ms]
                                           ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.94]"
                                // The design draws no selected chapter — every
                                // chip in the frame reads "1". This keeps the
                                // one you are reading marked, in the card's own
                                // palette rather than an invented colour.
                                style={{ backgroundColor: current ? "#FFFFFF" : "#212121" }}
                              >
                                <span
                                  className="text-[16px] font-normal leading-[24px]"
                                  style={{ color: current ? "#0E0E0E" : "#FFFFFF" }}
                                >
                                  {ch}
                                </span>
                              </button>
                            );
                          })}
                          {/* Keep the last row's chips the same width as the rest. */}
                          {slice.length < 5 &&
                            Array.from({ length: 5 - slice.length }).map((_, i) => (
                              <div key={`empty-${i}`} className="flex-1" />
                            ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
