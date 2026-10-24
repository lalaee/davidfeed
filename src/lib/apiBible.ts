/*
 * The licensed translations, from API.Bible (American Bible Society).
 *
 * SERVER ONLY. The key is the account's and must never reach a browser, so
 * this is imported by the chapter route (app/api/bible/...) and nothing else.
 * The reader asks that route for a chapter and gets back the same {b, c, v}
 * shape the public-domain files under public/bible have, plus the two things
 * the licence adds: the publisher's copyright line, which has to be shown with
 * the text, and a FUMS token, which the browser reports when the text is
 * actually displayed (lib/fums.ts).
 *
 * THE PLAN is Starter: free, noncommercial, these three Bibles, and 5,000 calls
 * a month. A chapter is one call, so the route caches each one for 29 days —
 * the terms allow caching as long as cached text is refreshed at least every
 * 30 — and the whole Bible in all three is ~3,600 calls, inside the allowance
 * even if every chapter were read in a month.
 */

/** Our translation id -> API.Bible's Bible id. Listed by GET /v1/bibles. */
export const API_BIBLE_IDS: Record<string, string> = {
  niv: "78a9f6124f344018-01", // New International Version 2011
  nkjv: "63097d2a0a2f7db3-01",
  nlt: "d6e14a625393b4da-01",
};

/** USFM book codes, in BOOKS order (data/bible.ts). */
const USFM = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI",
  "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER",
  "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP",
  "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL",
  "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN",
  "3JN", "JUD", "REV",
];

export function usfmCode(bookIndex: number): string | undefined {
  return USFM[bookIndex];
}

/** 29 days: the terms want cached Scripture refreshed at least every 30. */
export const CACHE_SECONDS = 29 * 24 * 60 * 60;

export interface LicensedChapter {
  b: string;
  c: number;
  /** Verse n is v[n - 1]; "" for a verse the translation omits (Matt 17:21). */
  v: string[];
  copyright: string;
  fums: string | null;
}

/** API.Bible's content-type=json tree, as much of it as we read. */
interface Node {
  type: "tag" | "text";
  name?: string;
  text?: string;
  attrs?: { style?: string; verseId?: string };
  items?: Node[];
}

/**
 * The chapter, or null when it cannot be had (no key, a bad id, the monthly
 * allowance spent). Null is not thrown: the reader drops a translation it
 * cannot load and shows the others.
 */
export async function fetchLicensedChapter(
  translationId: string,
  bookIndex: number,
  bookName: string,
  chapter: number,
): Promise<LicensedChapter | null> {
  const key = process.env.API_BIBLE_KEY?.trim();
  const bibleId = API_BIBLE_IDS[translationId];
  const code = usfmCode(bookIndex);
  if (!key) console.error("api.bible: API_BIBLE_KEY is not set");
  if (!key || !bibleId || !code) return null;

  const url =
    `https://rest.api.bible/v1/bibles/${bibleId}/chapters/${code}.${chapter}` +
    "?content-type=json&include-notes=false&include-titles=false&include-verse-numbers=true";
  // Cached by Next's data cache, which outlives a deploy, so redeploying does
  // not spend the allowance again on chapters already fetched.
  const res = await fetch(url, {
    headers: { "api-key": key },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!res.ok) {
    // Logged so a spent allowance (429) or a bad key (401) shows in the
    // function logs rather than only as the reader quietly losing NIV.
    console.error(`api.bible: ${res.status} for ${translationId} ${code}.${chapter}`, (await res.text()).slice(0, 200));
    return null;
  }
  const body = (await res.json()) as {
    data?: { content?: Node[]; copyright?: string };
    meta?: { fumsToken?: string };
  };
  if (!body.data?.content) return null;

  const verses = collectVerses(body.data.content, chapter);
  if (!verses.length) return null;
  return {
    b: bookName,
    c: chapter,
    v: verses,
    copyright: body.data.copyright?.trim() ?? "",
    fums: body.meta?.fumsToken ?? null,
  };
}

/*
 * The tree flattened to one string per verse.
 *
 * Every text node that is Scripture carries its verse id ("PSA.46.1"); the
 * verse-number markers, the chapter label and the Psalm superscriptions do not,
 * so keeping only text with a verse id is the whole filter. A verse can run
 * across several paragraphs (each line of a psalm is one), and those join with
 * a space; text WITHIN a paragraph joins with nothing, because a word set in
 * small caps ("LORD") is its own node with the comma straight after.
 * The small caps themselves become capitals, which is how the KJV files already
 * set the divine name. NIV and NLT mark it as the divine name (style nd), NKJV
 * as plain small caps (sc); both are read the same way.
 */
function collectVerses(content: Node[], chapter: number): string[] {
  const parts = new Map<number, string>();
  let paraStart = false;

  const walk = (nodes: Node[], style?: string) => {
    for (const n of nodes) {
      if (n.type === "text") {
        // Anchored at the start only: where a translation joins verses the id
        // can be a range ("ROM.3.1-ROM.3.2"), and the text files under the first.
        const m = /^[^.]+\.(\d+)\.(\d+)/.exec(n.attrs?.verseId ?? "");
        if (!m || Number(m[1]) !== chapter || !n.text) continue;
        const verse = Number(m[2]);
        const text = style === "nd" || style === "sc" ? n.text.toUpperCase() : n.text;
        const before = parts.get(verse);
        parts.set(verse, before === undefined ? text : before + (paraStart ? " " : "") + text);
        paraStart = false;
      } else if (n.name !== "verse" && n.items) {
        if (n.name === "para") paraStart = true;
        walk(n.items, n.name === "char" ? n.attrs?.style : style);
      }
    }
  };
  walk(content);

  const last = Math.max(0, ...parts.keys());
  const out: string[] = [];
  for (let i = 1; i <= last; i++) {
    out.push(
      (parts.get(i) ?? "")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:!?’”)])/g, "$1")
        .trim(),
    );
  }
  return out;
}
