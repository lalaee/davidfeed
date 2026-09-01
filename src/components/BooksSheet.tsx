"use client";

import { useState, useLayoutEffect, useRef } from "react";

import { ChevronIcon, CloseIcon } from "./icons";
import { BOOKS } from "@/data/bible";


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
 * The book list is imported rather than declared here. It used to be a second
 * copy of the same 66 rows, and the loader needs the chapter counts too — one
 * of the two would have drifted.
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
