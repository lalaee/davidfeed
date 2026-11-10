import Link from "next/link";

import { bookSlug } from "@/data/bible";
import { type Passage, filmRef } from "@/lib/filmPages";

import ScriptureViewed from "./ScriptureViewed";

/*
 * A film page's words (app/film/[slug]): the passage the film reads, in the
 * NIV with its publisher's line (or the WEB, lib/filmPages.ts), and the way
 * to its whole chapter in the reader. Below
 * the film on a phone, scrolled to; beside it at desk, in the hero's place
 * (DesktopChrome `copy`), in the hero's larger type.
 */
export default function FilmText({
  title,
  passage,
  desk = false,
}: {
  title: string;
  passage: Passage | null;
  desk?: boolean;
}) {
  // The chapter, linked even when its text couldn't be had.
  const ref = passage?.ref ?? filmRef(title);
  return (
    <div className={`flex flex-col ${desk ? "gap-[24px]" : "gap-[16px]"}`}>
      <h2
        className={`font-semibold text-white ${desk ? "text-[40px] leading-[44px]" : "text-[24px] leading-[30px]"}`}
        style={{ letterSpacing: desk ? "-1.2px" : "-0.5px" }}
      >
        {title}
      </h2>
      {passage && (
        <p
          className={desk ? "max-h-[40vh] overflow-y-auto text-[19px] leading-[150%]" : "text-[18px] leading-[150%]"}
          style={{ color: "rgba(255, 255, 255, 0.9)" }}
        >
          {passage.verses.map(([n, text]) => (
            <span key={n}>
              <sup className="mr-[3px] text-[0.6em] font-semibold" style={{ color: "#999999" }}>
                {n}
              </sup>
              {text}{" "}
            </span>
          ))}
        </p>
      )}
      <p className="text-[15px] font-medium leading-[22px]" style={{ color: "#999999" }}>
        {passage &&
          (passage.translation === "NIV" ? (
            <>{passage.copyright || "New International Version. Biblica, Inc."} </>
          ) : (
            <>World English Bible (public domain). </>
          ))}
        {ref && (
          <Link
            href={`/bible/${bookSlug(ref.book)}/${ref.chapter}`}
            className="pointer-events-auto text-white underline"
          >
            Read the whole chapter
          </Link>
        )}
      </p>
      {/* The licence's report that the NIV is on screen (lib/fums.ts). */}
      {passage?.fums && <ScriptureViewed token={passage.fums} />}
    </div>
  );
}
