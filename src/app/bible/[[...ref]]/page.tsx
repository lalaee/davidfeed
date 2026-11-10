import BibleReader from "@/components/BibleReader";
import { BOOKS, DEFAULT_BOOK, DEFAULT_CHAPTER, bookSlug, parseRef } from "@/data/bible";
import { loadFilmCatalog } from "@/lib/filmCatalog";
import { chapterFilms } from "@/lib/filmPages";

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

// Each chapter is its own search result: its own title, description and
// canonical. /bible, and any URL parseRef had to correct, point at the
// chapter they show.
export async function generateMetadata({ params }: { params: Promise<{ ref?: string[] }> }) {
  const { book, chapter } = parseRef((await params).ref);
  const known = BOOKS.some((b) => b.name === book);
  const [b, c] = known ? [book, chapter] : [DEFAULT_BOOK, DEFAULT_CHAPTER];
  return {
    title: `${b} ${c} — Read the Bible on Dafod`,
    description: `Read ${b} chapter ${c} in the NIV, NKJV, NLT, KJV, ASV or WEB. Free, with no ads, on Dafod.`,
    alternates: { canonical: `/bible/${bookSlug(b)}/${c}` },
  };
}

export default async function BiblePage({ params }: { params: Promise<{ ref?: string[] }> }) {
  const { book, chapter } = parseRef((await params).ref);
  const known = BOOKS.some((b) => b.name === book);
  const [b, c] = known ? [book, chapter] : [DEFAULT_BOOK, DEFAULT_CHAPTER];
  // The films made of this chapter, matched by their titles' references, so
  // the chapter links to each one's page (app/film) in the served HTML.
  const { films } = await loadFilmCatalog();
  return (
    <main className="h-[var(--app-h)] bg-black">
      <BibleReader book={b} chapter={c} films={chapterFilms(films, b, c)} />
    </main>
  );
}
