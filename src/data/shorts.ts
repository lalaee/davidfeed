import { chapterPosts, type Post } from "@/data/posts";

/*
 * Shorts — one spotlighted passage per chapter instead of the whole reading.
 *
 * Every span is 7-20s of the EXISTING narration, so nothing had to be
 * re-recorded: the card seeks into the chapter mp3, plays the passage, and
 * loops back to its start.
 *
 * Spans are declared as caption INDEX ranges, not timestamps, and the seconds
 * are read back out of chapter-subtitles.ts. Timestamps were the first attempt
 * and they were subtly wrong: transcribing 12.897 as "12.90" put the boundary
 * a few ms past the end of the phrase, so Psalm 23 silently captured the
 * opening of verse 4 as well. Indices cannot drift from the captions they
 * point at, and the window becomes a slice instead of a float comparison.
 *
 * Because the boundaries are caption edges, and those captions come from
 * dafod's per-word timings, the cuts land on real speech edges rather than
 * estimates — with one exception, noted on Psalm 91 below.
 *
 * Selection rules, in priority order:
 *   1. the verse that carries the chapter — the recognisable or thesis-bearing one
 *   2. it has to stand alone: no dangling conjunction, no unresolved pronoun
 *   3. it must open and close on a caption boundary
 *   4. 7s <= duration <= 20s, asserted below rather than trusted
 */

interface Span {
  id: number;
  /** Verse reference, appended to the chapter title on the card. */
  verses: string;
  /** Inclusive caption index range within that chapter's subtitle array. */
  from: number;
  to: number;
  /** Why this passage, where the choice was not obvious. */
  note?: string;
}

const SPANS: Span[] = [
  { id: 23, verses: "1-3", from: 0, to: 4,
    note: "Chosen over the better-known 'darkest valley' because the card is sheep in a pasture, and 'he makes me lie down in green pastures' IS the picture." },
  { id: 27, verses: "1", from: 0, to: 3 },
  { id: 91, verses: "4", from: 8, to: 10,
    note: "Chosen over the famous v1-2 because 'shield and rampart' pays off the armoured knight in the artwork. NOTE: psalm91's captions were split proportionally by character count rather than derived from word timings, so these are the only estimated boundaries here and may clip by a few hundred ms." },
  { id: 5, verses: "1-3", from: 0, to: 8 },
  { id: 7, verses: "1-2", from: 0, to: 4 },
  { id: 16, verses: "11", from: 26, to: 28 },
  { id: 20, verses: "7-8", from: 17, to: 20,
    note: "Runs through v8 so the chariots/horses contrast actually resolves; v7 alone is 5.8s, under the floor." },
  { id: 25, verses: "4-5", from: 8, to: 12 },
  { id: 3, verses: "1-3", from: 0, to: 5,
    note: "Starts at v1 rather than the quotable v3 so that verse's 'But you, Lord' has something to answer." },
  { id: 45, verses: "6-8", from: 14, to: 21,
    note: "Ends at v8; stopping after the throne verse would cut on a semicolon." },
  { id: 44, verses: "25-26", from: 58, to: 61,
    note: "Psalm 44 is a communal lament with no standout verse. The closing plea at least ends on 'unfailing love' rather than on the complaint." },
  { id: 51, verses: "10-12", from: 22, to: 28 },
  { id: 4, verses: "6-8", from: 14, to: 21,
    note: "The sleep verse alone is 5.6s, so this opens at v6 to carry it over the floor." },
];

const MIN_SECONDS = 7;
const MAX_SECONDS = 20;

const byId = new Map(chapterPosts.map((p) => [p.id, p]));

export const shortPosts: Post[] = SPANS.map(({ id, verses, from, to }) => {
  const source = byId.get(id);
  if (!source?.subtitles?.length) {
    throw new Error(`shorts: Psalm ${id} has no captions to cut against`);
  }

  const phrases = source.subtitles.slice(from, to + 1);
  if (phrases.length !== to - from + 1) {
    throw new Error(`shorts: Psalm ${id} has no captions at [${from}..${to}]`);
  }

  const start = phrases[0].startTime;
  const end = phrases[phrases.length - 1].endTime;
  const seconds = end - start;

  // The whole premise of this feed is the attention budget, so a span that
  // drifts outside it should fail loudly rather than ship as a 40s "short".
  if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
    throw new Error(
      `shorts: Psalm ${id}:${verses} is ${seconds.toFixed(2)}s, outside ${MIN_SECONDS}-${MAX_SECONDS}s`,
    );
  }

  return {
    ...source,
    title: `${source.title}:${verses}`,
    clip: { start, end },
    subtitles: phrases,
  };
});
