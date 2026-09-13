import type { Post } from "@/data/posts";
import { pressureVerseIds, refugeVerseIds } from "@/data/web-verses";

/*
 * Topics for the header dropdown.
 *
 * Neither the set nor the grouping came from the design — the Figma frame only
 * shows "Mental strength" and a chevron — so this is a first pass, grouped by
 * what each spotlighted passage is actually ABOUT rather than by psalm number.
 * It is meant to be edited: change `ids` and the feed follows.
 *
 * Two deliberate choices:
 *
 *   Psalms may belong to more than one topic. Psalm 16:11 is both a promise of
 *   joy and a promise of direction, and forcing a single home would make the
 *   smaller topics too thin to feel like a feed.
 *
 *   Every topic holds at least three, because two cards do not read as a feed.
 *   That is the constraint that shaped the grouping, and the assertion below
 *   enforces it rather than trusting it.
 */
export interface Topic {
  id: string;
  label: string;
  /**
   * Post ids, in feed order. `null` means every card.
   *
   * These were psalm numbers when every card was a psalm. The World English
   * Bible set brought in Romans, Isaiah, Nahum and five other books, so the
   * field is what it always actually was — a list of Post.id — and the name
   * says so now.
   */
  ids: number[] | null;
}

/*
 * The labels are what the reader is CARRYING, not what the psalm supplies.
 *
 * The desktop header reads "Deal with <label>", and that sentence only works
 * one way round: you deal with a difficulty, never with its remedy. "Deal with
 * Mental strength" is not English. So each label is now the trouble the reader
 * brings, and the psalms under it are the answer to it — which is also the way
 * someone actually arrives at a devotional feed. They come with the problem.
 *
 * Each one is read off what its cards actually say, not chosen for symmetry:
 *
 *   Pressure     enemies, pursuit, chariots and horses, "whom shall I fear"
 *   Anxiety      green pastures, quiet waters, lying down and sleeping in peace
 *   Uncertainty  "show me your ways", "lead me", the path of life
 *   Guilt        "create in me a pure heart", the lament, the plea
 *   Fear         rock, fortress, stronghold, "don't be afraid" — the WEB set
 *
 * Fear was "every card in web-verses.ts" until the PRESSURE board added nine
 * more to that same file. Those answer being closed in on, not the dread, so
 * they are tagged there and join Pressure here; Fear now takes the refuge set
 * by name rather than by whatever happens to be in the file.
 *
 * Both Pressure and Fear are about threat, and they are not the same thing:
 * Pressure is being closed in on by people, Fear is the dread itself, which is
 * why the refuge verses sit under the second and the enemy psalms under the
 * first.
 */
export const TOPICS: Topic[] = [
  { id: "pressure",    label: "Pressure",    ids: [27, 3, 20, 91, 7, ...pressureVerseIds] },
  { id: "anxiety",     label: "Anxiety",     ids: [23, 4, 16] },
  { id: "uncertainty", label: "Uncertainty", ids: [25, 5, 16] },
  { id: "guilt",       label: "Guilt",       ids: [51, 44, 45] },
  { id: "fear",        label: "Fear",        ids: refugeVerseIds },
  { id: "all",         label: "Anything",    ids: null },
];

export const DEFAULT_TOPIC = TOPICS[0].id;

/**
 * Which topic a visit opens on.
 *
 * The feed used to open on Pressure every time — TOPICS[0], because
 * DEFAULT_TOPIC was the initial state and nothing ever varied it. The reader
 * asked for the filters to be randomised, and the right vehicle already
 * exists: Feed already draws one random seed per page load to deal the card
 * order (see the note above `readFeedSeed` there). This picks the opening
 * topic from that same seed, so one load makes one consistent deal.
 *
 * Seed 0 is the server's value — the static prerender has no randomness to
 * offer — and it yields DEFAULT_TOPIC so the prerendered markup is stable and
 * hydration has nothing to disagree with. The client re-reads the seed after
 * hydration and lands on the real pick, by the same mechanism that already
 * reveals the shuffled order.
 *
 * "Anything" is in the pool on purpose: it is one of the six filters, and the
 * complaint was landing on the same one every time, not on that one.
 */
export function topicForSeed(seed: number): string {
  if (!seed) return DEFAULT_TOPIC;
  return TOPICS[seed % TOPICS.length].id;
}

const MIN_PER_TOPIC = 3;
for (const t of TOPICS) {
  if (t.ids && t.ids.length < MIN_PER_TOPIC) {
    throw new Error(
      `topics: "${t.label}" has ${t.ids.length} card(s); ${MIN_PER_TOPIC} is the floor for something to read as a feed`,
    );
  }
}

/**
 * The posts for a topic, in the topic's own order. Unknown ids are dropped
 * rather than throwing, so a topic can name a card the current feed does not
 * carry — the chapter feed and the shorts feed hold different sets.
 */
export function postsForTopic(posts: Post[], topicId: string): Post[] {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic?.ids) return posts;
  const byId = new Map(posts.map((p) => [p.id, p]));
  return topic.ids.map((id) => byId.get(id)).filter((p): p is Post => Boolean(p));
}
