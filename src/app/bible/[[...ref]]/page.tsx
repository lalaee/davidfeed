import BibleReader from "@/components/BibleReader";
import { BOOKS, DEFAULT_BOOK, DEFAULT_CHAPTER, bookSlug, parseRef } from "@/data/bible";

/*
 * /bible, /bible/psalms, /bible/psalms/46 — all the same reader.
 *
 * An optional catch-all rather than a plain /bible page because the reference
 * belongs in the URL now that all 1,189 chapters are reachable: a chapter can
 * be linked to, and the back button walks the chapters actually read instead
 * of leaving the Bible altogether.
 *
 * parseRef is total — a book that does not exist falls back to the default
 * chapter and a chapter past the end of its book falls back to 1 — so a
 * mistyped URL lands on something readable rather than on a 404. That is the
 * right call for a reader and the wrong one for the Library's saved feed, which
 * does 404, because there the id identifies a specific card the viewer chose.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  // Only the landing reference is prerendered. Every book prerendered would be
  // 1,189 pages of identical markup — the text is fetched at runtime, so the
  // HTML does not differ between them.
  return [{ ref: [] as string[] }, { ref: [bookSlug(DEFAULT_BOOK), String(DEFAULT_CHAPTER)] }];
}

export async function generateMetadata({ params }: { params: Promise<{ ref?: string[] }> }) {
  const { book, chapter } = parseRef((await params).ref);
  return { title: `${book} ${chapter} — Dafod` };
}

export default async function BiblePage({ params }: { params: Promise<{ ref?: string[] }> }) {
  const { book, chapter } = parseRef((await params).ref);
  const known = BOOKS.some((b) => b.name === book);
  return (
    <main className="h-[100dvh] bg-black">
      <BibleReader
        book={known ? book : DEFAULT_BOOK}
        chapter={known ? chapter : DEFAULT_CHAPTER}
        artworkSrc="/assets/feed-poster-frame.jpg"
      />
    </main>
  );
}
