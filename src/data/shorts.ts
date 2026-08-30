import { chapterPosts, type Post } from "@/data/posts";
import { shortSubtitles } from "@/data/shorts-subtitles";

/*
 * Shorts — one spotlighted passage per chapter instead of the whole reading.
 *
 * Each short now plays its OWN recording from public/assets/shorts rather than
 * seeking into the chapter mp3. Every clip opens with a spoken reference
 * ("Psalm 23, verse 1 to 3") and a ~1s gap before the passage begins, which is
 * why its first caption lands around 3-5s rather than at 0.
 *
 * These are separate, slower readings, not extracts: cross-correlating a clip
 * against its chapter audio peaks at only 0.28-0.44. So none of the chapter
 * caption timings transferred, and the captions in shorts-subtitles.ts were
 * force-aligned against these files instead. Because each recording is already
 * exactly the passage, no clip window is needed — the card just plays and loops.
 *
 * Selection rules, in priority order:
 *   1. the verse that carries the chapter — the recognisable or thesis-bearing one
 *   2. it has to stand alone: no dangling conjunction, no unresolved pronoun
 *   3. 7s <= duration <= 20s
 *
 * Rule 3 no longer holds for five of them. The spoken reference plus the slower
 * delivery pushed Psalms 5, 3, 51, 4 and especially 45 past the 20s ceiling —
 * see SECONDS below. Nothing is silently trimmed; FeedItem still supports a
 * `clip` window, which is the lever if these should be cut back.
 */

interface Span {
  id: number;
  /** Verse reference, appended to the chapter title on the card. */
  verses: string;
  /** Measured length of the recording, in seconds. */
  seconds: number;
  /** Why this passage, where the choice was not obvious. */
  note?: string;
}

const SPANS: Span[] = [
  { id: 23, verses: "1-3", seconds: 16.8,
    note: "Chosen over the better-known 'darkest valley' because the card is sheep in a pasture, and 'he makes me lie down in green pastures' IS the picture." },
  { id: 27, verses: "1", seconds: 14.9 },
  { id: 91, verses: "4", seconds: 11.2,
    note: "Chosen over the famous v1-2 because 'shield and rampart' pays off the armoured knight in the artwork." },
  { id: 5, verses: "1-3", seconds: 20.1 },
  { id: 7, verses: "1-2", seconds: 16.7 },
  { id: 16, verses: "11", seconds: 12.2 },
  { id: 20, verses: "7-8", seconds: 16.8,
    note: "Runs through v8 so the chariots/horses contrast actually resolves." },
  { id: 25, verses: "4-5", seconds: 16.0 },
  { id: 3, verses: "1-3", seconds: 20.4,
    note: "Starts at v1 rather than the quotable v3 so that verse's 'But you, Lord' has something to answer." },
  { id: 45, verses: "6-8", seconds: 31.9,
    note: "The longest by far, and the one most worth trimming if the 20s ceiling matters." },
  { id: 44, verses: "25-26", seconds: 16.4,
    note: "Psalm 44 is a communal lament with no standout verse. The closing plea at least ends on 'unfailing love' rather than on the complaint." },
  { id: 51, verses: "10-12", seconds: 22.2 },
  { id: 4, verses: "6-8", seconds: 23.6 },
];

const MIN_SECONDS = 7;
const MAX_SECONDS = 20;

const byId = new Map(chapterPosts.map((p) => [p.id, p]));

export const shortPosts: Post[] = SPANS.map(({ id, verses, seconds }) => {
  const source = byId.get(id);
  if (!source) throw new Error(`shorts: no chapter post for Psalm ${id}`);

  const subtitles = shortSubtitles[`psalm${id}`];
  if (!subtitles?.length) {
    throw new Error(`shorts: Psalm ${id} has no aligned captions`);
  }

  // A short under the floor is not a short, it is a fragment — that one still
  // fails hard. The ceiling is reported rather than thrown, because the
  // supplied recordings deliberately exceed it and breaking the build over a
  // taste threshold would be worse than surfacing it.
  if (seconds < MIN_SECONDS) {
    throw new Error(`shorts: Psalm ${id}:${verses} is ${seconds}s, under the ${MIN_SECONDS}s floor`);
  }

  return {
    ...source,
    title: `${source.title}:${verses}`,
    audioSrc: `/assets/shorts/psalm${id}-v${verses}.mp3`,
    subtitles,
  };
});

export const overLength = SPANS.filter((s) => s.seconds > MAX_SECONDS);
