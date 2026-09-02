import type { Post } from "@/data/posts";
import { webVerseIds } from "@/data/web-verses";

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

export const TOPICS: Topic[] = [
  { id: "mental-strength", label: "Mental strength", ids: [27, 3, 20, 91, 7] },
  { id: "peace",           label: "Peace",           ids: [23, 4, 16] },
  { id: "guidance",        label: "Guidance",        ids: [25, 5, 16] },
  { id: "renewal",         label: "Renewal",         ids: [51, 44, 45] },
  { id: "refuge",          label: "Refuge",          ids: webVerseIds },
  { id: "all",             label: "All",             ids: null },
];

export const DEFAULT_TOPIC = TOPICS[0].id;

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
