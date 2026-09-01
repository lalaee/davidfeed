/*
 * The Bible: which books exist, which translations, and how to get a chapter.
 *
 * The text is NOT bundled. 66 books in three translations is 12.6MB, which has
 * no business in a JavaScript payload, so scripts/build-bible.py writes it to
 * public/bible/<translation>/<book-slug>/<chapter>.json — one file per chapter,
 * fetched when it is read and cached by the CDN like any other static asset.
 * A chapter costs about 4KB per translation.
 *
 * All three are public domain: KJV (1769, from eBible.org, which asserts public
 * domain outright — see the note in the build script about the GPL-packaged
 * edition we deliberately did not use), ASV (1901) and WEB. NIV and NKJV used
 * to be here and are gone: both are copyrighted, and both had been transcribed
 * from memory rather than from a licensed source, so they were unusable twice
 * over.
 */

export interface Translation {
  id: string;
  label: string;
  /** Keyed by verse number, for the chapter currently loaded. */
  verses: Record<number, string>;
}

export interface TranslationMeta {
  id: string;
  label: string;
  /** Shown where the app has to say where the text came from. */
  note: string;
}

/** In the order the compare card lists them. */
export const TRANSLATIONS: TranslationMeta[] = [
  { id: "kjv", label: "KJV", note: "King James Version (1769). Public domain." },
  { id: "asv", label: "ASV", note: "American Standard Version (1901). Public domain." },
  { id: "web", label: "WEB", note: "World English Bible. Public domain." },
];

/** What the reader opens on, and the fallback for anything unrecognised. */
export const DEFAULT_BOOK = "Psalms";
export const DEFAULT_CHAPTER = 46;

/*
 * The 66 books and their chapter counts. One list, used by the books sheet to
 * draw its rows and by the loader to reject a reference that cannot exist —
 * the sheet used to carry its own copy, which is two lists to keep in step.
 * Verified against all three translations by scripts/build-bible.py.
 */
export const BOOKS: { name: string; chapters: number }[] = [
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

/** "1 Samuel" -> "1-samuel". Must match slug() in scripts/build-bible.py. */
export function bookSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The chapter reference a page shows, e.g. "Psalms 46". */
export function chapterTitle(book: string, chapter: number): string {
  return `${book} ${chapter}`;
}

/**
 * The inverse, for the Library: it holds highlights stamped with a title and
 * has to turn each back into something it can fetch. Returns null for a title
 * naming a book that does not exist, which is what a stale stored key is.
 */
export function parseTitle(title: string): { book: string; chapter: number } | null {
  const m = /^(.*) (\d+)$/.exec(title.trim());
  if (!m) return null;
  const book = BOOKS.find((b) => b.name === m[1]);
  if (!book) return null;
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  return { book: book.name, chapter };
}

/** The translation the reader is set to, falling back to the first listed. */
export function readingTranslation(readingId: string | null): TranslationMeta {
  return TRANSLATIONS.find((t) => t.id === readingId) ?? TRANSLATIONS[0];
}

/**
 * A URL's /bible/<book>/<chapter> turned into a real reference, or the default
 * where it names something that does not exist. The reader always has a
 * chapter, so a bad URL lands somewhere readable rather than on an error.
 */
export function parseRef(segments: string[] | undefined): {
  book: string;
  chapter: number;
} {
  const fallback = { book: DEFAULT_BOOK, chapter: DEFAULT_CHAPTER };
  if (!segments?.length) return fallback;
  const wanted = decodeURIComponent(segments[0]).toLowerCase();
  const book = BOOKS.find((b) => bookSlug(b.name) === wanted);
  if (!book) return fallback;
  const n = Number(segments[1] ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > book.chapters) {
    return { book: book.name, chapter: 1 };
  }
  return { book: book.name, chapter: n };
}

/**
 * The chapter before or after this one, crossing book boundaries — Psalms 150
 * is followed by Proverbs 1 — and null at the two ends of the Bible, which is
 * what disables the pager at Genesis 1 and Revelation 22.
 */
export function adjacentChapter(
  book: string,
  chapter: number,
  delta: 1 | -1,
): { book: string; chapter: number } | null {
  const i = BOOKS.findIndex((b) => b.name === book);
  if (i < 0) return null;
  const next = chapter + delta;
  if (next >= 1 && next <= BOOKS[i].chapters) return { book, chapter: next };
  const j = i + delta;
  if (j < 0 || j >= BOOKS.length) return null;
  return { book: BOOKS[j].name, chapter: delta === 1 ? 1 : BOOKS[j].chapters };
}

/** The path a chapter's text lives at. */
export function chapterUrl(translationId: string, book: string, chapter: number): string {
  return `/bible/${translationId}/${bookSlug(book)}/${chapter}.json`;
}

interface ChapterFile {
  b: string;
  c: number;
  v: string[];
}

/**
 * Every listed translation of one chapter.
 *
 * Fetched together because the compare card needs all of them the moment a
 * verse is selected, and three 4KB files in parallel is not worth staging. A
 * translation that fails to load is dropped rather than throwing: the reader
 * showing two of three is better than a blank page.
 */
export async function fetchChapter(
  book: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<Translation[]> {
  const results = await Promise.all(
    TRANSLATIONS.map(async (t): Promise<Translation | null> => {
      const verses = await fetchChapterIn(t.id, book, chapter, signal);
      return verses ? { id: t.id, label: t.label, verses } : null;
    }),
  );
  return results.filter((t): t is Translation => t !== null);
}

/**
 * One chapter in one translation, as verse number -> text. Null when it cannot
 * be had, so a caller can render what it does have instead of failing whole.
 * The Library uses this: it quotes saved verses in the reading translation and
 * has no use for the other two.
 */
export async function fetchChapterIn(
  translationId: string,
  book: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<Record<number, string> | null> {
  try {
    const res = await fetch(chapterUrl(translationId, book, chapter), { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as ChapterFile;
    const verses: Record<number, string> = {};
    data.v.forEach((text, i) => {
      if (text) verses[i + 1] = text;
    });
    return verses;
  } catch {
    return null;
  }
}
