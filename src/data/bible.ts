import {
  PSALM_46_ALSO_AVAILABLE,
  PSALM_46_TRANSLATIONS,
  type Translation,
} from "@/data/psalm46";

/*
 * Chapter lookup, keyed by the same title the stores are keyed by.
 *
 * The reader is handed its chapter as props by the route. The Library is not:
 * it holds a bag of highlights stamped "Psalm 46" and has to turn each one
 * back into words. That needs a registry, so this is it.
 *
 * One chapter so far, because one chapter is what src/data ships. Adding a
 * second is adding a line here and a route, not a rewrite.
 */
export interface Chapter {
  title: string;
  /** Every translation the chapter carries, listed first, extras after. */
  translations: Translation[];
}

export const CHAPTERS: Chapter[] = [
  {
    title: "Psalm 46",
    translations: [...PSALM_46_TRANSLATIONS, ...PSALM_46_ALSO_AVAILABLE],
  },
];

/**
 * The translation a saved verse should be quoted in: whatever the reader is
 * reading, falling back to the chapter's own first translation. Returns
 * undefined for a chapter that is no longer in the registry, which is what a
 * stale localStorage entry looks like.
 */
export function chapterTranslation(
  title: string,
  readingId: string | null,
): Translation | undefined {
  const chapter = CHAPTERS.find((c) => c.title === title);
  if (!chapter) return undefined;
  return chapter.translations.find((t) => t.id === readingId) ?? chapter.translations[0];
}
