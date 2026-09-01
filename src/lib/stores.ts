/*
 * Everything the app remembers between visits.
 *
 * These lived inside BibleReader until the Library needed to READ what the
 * reader WRITES. Two modules each holding their own copy of a localStorage key
 * is two caches that disagree the moment one of them writes, so there is one
 * store per key and both components subscribe to it.
 *
 * Read through useSyncExternalStore rather than seeded in an effect. The pages
 * are prerendered, so reading during render would hydrate against markup that
 * has neither highlights nor saves in it; and setState inside an effect is a
 * cascading render this project already rejects at build time. getSnapshot
 * must also be referentially stable — a fresh object every call spins React
 * forever — hence the parse cache keyed on the raw string.
 */

const HIGHLIGHT_KEY = "dafod.highlights";
const SAVED_KEY = "dafod.saved";
const VERSIONS_KEY = "dafod.versions";
/* Which translation the READER shows, as opposed to which ones compare lists. */
const READING_KEY = "dafod.reading";
/* Feed cards the reader bookmarked, keyed by psalm id. */
const SAVED_POSTS_KEY = "dafod.savedPosts";

export type ChapterMap<T> = Record<number, T>;
export const EMPTY_CHAPTER = {} as ChapterMap<never>;
export const EMPTY_STORE = {} as Record<string, ChapterMap<never>>;

export function makeJsonStore<T>(key: string, empty: T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null = null;
  let cachedValue: T = empty;

  const read = (): T => {
    let raw = "";
    try {
      raw = localStorage.getItem(key) ?? "";
    } catch {}
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedValue = raw ? (JSON.parse(raw) as T) : empty;
      } catch {
        cachedValue = empty;
      }
    }
    return cachedValue;
  };

  return {
    read,
    subscribe(listener: () => void) {
      listeners.add(listener);
      // Another tab writing the same key should show up here too.
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    write(value: T) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      listeners.forEach((l) => l());
    },
    serverSnapshot: () => empty,
  };
}

export type ChapterStore<T> = Record<string, ChapterMap<T>>;

export const highlightStore = makeJsonStore<ChapterStore<string>>(HIGHLIGHT_KEY, EMPTY_STORE);
export const savedVerseStore = makeJsonStore<ChapterStore<true>>(SAVED_KEY, EMPTY_STORE);

/* Which translations the compare card lists. Null means "whatever the chapter
   ships as its default", so a reader who never opens the picker follows the
   design rather than a snapshot of it frozen at first run. */
export const versionsStore = makeJsonStore<string[] | null>(VERSIONS_KEY, null);
export const readingStore = makeJsonStore<string | null>(READING_KEY, null);

/*
 * The feed's bookmark, which was component state and so survived nothing —
 * not a scroll past the window, not a topic switch, not a reload. The Library
 * grid is the reason it now persists: a grid of saved artwork needs somewhere
 * for "saved" to actually live.
 *
 * Keyed by psalm id rather than by title because a short is titled
 * "Psalm 23:1-3" and its chapter "Psalm 23" — the same artwork under two
 * names. The id is what they agree on.
 */
export const EMPTY_POSTS = {} as Record<number, true>;
export const savedPostStore = makeJsonStore<Record<number, true>>(SAVED_POSTS_KEY, EMPTY_POSTS);

/*
 * Chapters were keyed "Psalm 46" while the reader had exactly one chapter and
 * its title was a hard-coded prop. They are keyed by their real reference now
 * that the reader can open any of 1,189, and the book is named "Psalms" — so
 * every highlight and save made before this would be stranded under a key
 * nothing looks up any more.
 *
 * Renames them once, on the client, merging rather than overwriting in case
 * both keys somehow exist. Cheap enough to attempt on every mount: it does
 * nothing at all once there is no legacy key left, and it writes only when it
 * actually moved something.
 */
const LEGACY_TITLES: Record<string, string> = { "Psalm 46": "Psalms 46" };

export function migrateLegacyChapterKeys() {
  for (const store of [highlightStore, savedVerseStore]) {
    const current = store.read() as ChapterStore<string | true>;
    let next: ChapterStore<string | true> | null = null;
    for (const [from, to] of Object.entries(LEGACY_TITLES)) {
      if (!current[from]) continue;
      next ??= { ...current };
      next[to] = { ...next[to], ...next[from] };
      delete next[from];
    }
    if (next) (store as { write: (v: unknown) => void }).write(next);
  }
}
