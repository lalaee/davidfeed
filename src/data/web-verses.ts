import type { Post } from "@/data/posts";
import { webSubtitles } from "@/data/web-subtitles";

/*
 * Verse cards — a single passage, standing on its own.
 *
 * The thirteen shorts in shorts.ts are DERIVED: each one borrows its artwork
 * and its title from the chapter post of the same psalm, and only replaces the
 * audio. That works because every one of them is a psalm the feed already
 * carries a full chapter for. None of these fifteen is. Eight are not even
 * psalms, and the five that are — 18, 28, 46, 61, 62 — have no chapter post to
 * borrow from. So each card here declares its own title, cover and clip
 * outright rather than inheriting one, which is also why this is a separate
 * list instead of more entries in SPANS.
 *
 * The recordings are the World English Bible, and they arrived as a set: every
 * one of them is about refuge — rock, fortress, stronghold, strong tower, "don't
 * be afraid". They are grouped as the "Fear" topic in topics.ts.
 *
 * Two things differ from the NIV shorts, both measured off the files:
 *
 *   No startAt. Those clips open with up to 1.5s of silence and every card
 *   seeks past it; these begin speaking at t=0, so there is nothing to skip.
 *
 *   The spoken reference is still there ("Psalm 18 verse 2, ..."), which is why
 *   the first caption lands 2-5s in rather than at 0. Captions are absolute and
 *   force-aligned per clip; see web-subtitles.ts.
 *
 * IDS. The feed keys off Post.id — saved state, /library/[id], and the topic
 * lists all use it — so these only have to be unique, not meaningful. The five
 * psalms take their own psalm numbers, which were free. The other books take
 * 1001+, well clear of the 1-150 a psalm can occupy.
 *
 * COVERS live in /assets/verses, each beside a `-loop.mp4` rendered from it by
 * the cover-parallax skill — a depth map, then the image displaced through it
 * along a closed elliptical camera path, so the loop is exact and nothing can
 * be invented. Without one a card just sits there while its neighbours drift.
 *
 * They are named for what they SHOW, not for the verse they serve. posts.ts
 * learned that the hard way: its covers were reassigned once and every filename
 * there now lies about which psalm it belongs to. A descriptive name cannot go
 * stale that way.
 */

interface VerseCard {
  id: number;
  /**
   * Which trouble this verse answers, for topics.ts.
   *
   * The first fifteen are all refuge — rock, fortress, stronghold — so Fear was
   * once simply "every card in this file", and topics.ts said so by taking
   * webVerseIds wholesale. The PRESSURE set breaks that: it is the same file
   * and the same reader, but it answers being closed in on rather than the
   * dread itself. Defaulting to "fear" keeps the original fifteen untouched.
   */
  topic?: "fear" | "pressure";
  /**
   * No loop — the cover holds still.
   *
   * posterVideoSrc is derived from the cover below rather than declared, so
   * this is how a card opts out: without it the derivation would hand every
   * card a loop whether one should exist or not. FeedItem already guards the
   * video element, so a still card simply sits there while its neighbours
   * drift, which is the intent.
   */
  still?: boolean;
  /** Rendered on the card, and the reference the reader speaks. */
  title: string;
  /** Basename shared by the mp3 in /assets/shorts and the key in webSubtitles. */
  clip: string;
  /** File in /assets/verses, named for its subject. */
  cover: string;
  /** Measured length of the recording, in seconds. */
  seconds: number;
  /** Why this picture for this verse, where the link is worth stating. */
  art?: string;
}

const VERSE_CARDS: VerseCard[] = [
  { id: 18, title: "Psalm 18:2", clip: "psalm18-v2-web", seconds: 15.05,
    cover: "figure-between-rock-walls.jpg",
    art: "'my rock, my fortress... my high tower' — the figure is ON the rock, and high." },
  { id: 62, title: "Psalm 62:2,6", clip: "psalm62-v2-6-web", seconds: 18.99,
    cover: "figure-on-rock-in-waves.jpg",
    art: "'He alone is my rock... I will never be greatly shaken' — the sea moves, the rock does not." },
  { id: 46, title: "Psalm 46:1-2", clip: "psalm46-v1-2-web", seconds: 14.26,
    cover: "sea-in-uproar.jpg",
    art: "'though the mountains are shaken into the heart of the seas' — mountain, sea, and a figure not running." },
  { id: 61, title: "Psalm 61:3", clip: "psalm61-v3-web", seconds: 9.01,
    cover: "arches-opening-on-light.jpg",
    art: "'a strong tower from the enemy' — the mountain above him IS the tower, without drawing one." },
  { id: 28, title: "Psalm 28:7-8", clip: "psalm28-v7-8-web", seconds: 23.64,
    cover: "light-held-before-a-crowd.jpg",
    art: "'The LORD is my strength and my shield' — he is sheltering under a shield, in the rain, with the light breaking." },
  { id: 1001, title: "Proverbs 18:10", clip: "proverbs18-v10-web", seconds: 8.22,
    cover: "lit-door-down-a-dark-run.jpg",
    art: "'the righteous RUN to him, and are safe' — the only card in the set with a body in motion." },
  { id: 1002, title: "Nahum 1:7", clip: "nahum1-v7-web", seconds: 10.17,
    cover: "cradled-in-the-dark.jpg",
    art: "'a stronghold in the day of trouble' — sheltering on the rock while the weather goes on around it." },
  { id: 1003, title: "2 Samuel 22:29", clip: "2samuel22-v29-web", seconds: 10.08,
    cover: "flame-carried-at-dusk.jpg",
    art: "'you are my lamp... will light up my darkness' — one light, one dark field, nothing else in the frame." },
  { id: 1004, title: "Isaiah 41:10", clip: "isaiah41-v10-web", seconds: 17.0,
    cover: "caught-on-the-water.jpg",
    art: "'Don't you be afraid' — she is small, the storm is enormous, and she has not turned around." },
  { id: 1005, title: "Deuteronomy 31:6", clip: "deuteronomy31-v6-web", seconds: 14.86,
    cover: "walked-with-through-fog.jpg",
    art: "'Be strong and courageous' — standing to face it rather than sheltering from it." },
  { id: 1006, title: "Isaiah 12:2", clip: "isaiah12-v2-web", seconds: 13.98,
    cover: "reaching-into-the-well.jpg",
    art: "'God is my salvation' — the one picture here of someone actually being saved out of something." },
  { id: 1007, title: "Hebrews 13:6", clip: "hebrews13-v6-web", seconds: 12.17,
    cover: "small-figure-and-colossus.jpg",
    art: "'The Lord is my helper. I will not fear.' — squared up to the viewer, calm, under a very dark sky." },
  { id: 1008, title: "1 Peter 3:14", clip: "1peter3-v14-web", seconds: 14.02,
    cover: "lamb-reflected-as-lion.jpg",
    art: "'even if you should suffer... neither be troubled' — enduring weather, not defeating it." },
  { id: 1009, title: "Romans 8:31", clip: "romans8-v31-web", seconds: 11.33,
    cover: "guard-behind-the-child.jpg",
    art: "'If God is for us, who can be against us?' — the widest, grandest frame in the set, for the widest claim." },
  // The one NIV recording in this list, so its clip carries no -web suffix and
  // its caption wording lives in the manifest rather than in public/bible/web.
  { id: 1010, title: "Isaiah 45:2", clip: "isaiah45-v2", seconds: 10.91,
    cover: "gate-in-the-cloud-wall.jpg",
    art: "'I will go before you and will level the mountains' — the road is already laid across the desert, and the one who goes ahead of it fills the sky." },

  // ---- The PRESSURE board, September 2026 -------------------------------
  // Nine verses recorded as a set in the World English Bible, same reader and
  // same register as the fifteen above, with covers taken from the FigJam
  // board that chose them. Psalm 27:3 is the tenth on that board and is not
  // here: it has no recording yet.
  { id: 118, topic: "pressure", title: "Psalm 118:6-7", clip: "psalm118-v6-7-web", seconds: 20.48,
    cover: "held-in-the-long-grass.jpg",
    art: "'the LORD is on my side' — two of them, sitting with it, not braced against anything." },
  { id: 56, topic: "pressure", title: "Psalm 56:3-4", clip: "psalm56-v3-4-web", seconds: 18.76,
    cover: "hands-laid-on-his-head.jpg",
    art: "'when I am afraid, I will put my trust in you' — the trust is the hands, and he is under them." },
  { id: 121, topic: "pressure", title: "Psalm 121:1-2", clip: "psalm121-v1-2-web", seconds: 13.70,
    cover: "citadel-on-the-hill.jpg",
    art: "'I will lift up my eyes to the hills' — so the hill is the whole frame, and it is inhabited." },
  { id: 138, topic: "pressure", title: "Psalm 138:7", clip: "psalm138-v7-web", seconds: 14.40,
    cover: "path-through-the-wheat.jpg",
    art: "'though I walk in the midst of trouble' — the walking is the point, and the path already goes through." },
  // 46 belongs to the 46:1-2 card, so this one takes the 1001+ block even
  // though it is a psalm. The rule is uniqueness, not tidiness.
  { id: 1011, topic: "pressure", title: "Psalm 46:6-7", clip: "psalm46-v6-7-web", seconds: 19.13,
    cover: "light-through-the-face.jpg",
    art: "'the LORD of Armies is with us' — the light is on him and coming through him, not aimed at him." },
  { id: 1012, topic: "pressure", title: "2 Chronicles 20:15", clip: "2chronicles20-v15-web", seconds: 22.62,
    cover: "spear-against-the-red-sun.jpg",
    art: "'the battle is not yours, but God's' — one figure, one spear, and a horizon that dwarfs both." },
  { id: 1013, topic: "pressure", still: true, title: "Exodus 14:13-14", clip: "exodus14-v13-14-web", seconds: 22.38,
    cover: "one-facing-the-host.jpg",
    art: "'stand still, and see' — he is standing still, and the army is what he is standing still in front of." },
  { id: 1014, topic: "pressure", title: "Isaiah 40:30-31", clip: "isaiah40-v30-31-web", seconds: 22.62,
    cover: "eagle-against-the-sky.jpg",
    art: "'they will mount up with wings like eagles' — the eagle, looking up, before any of the flying." },
  { id: 1015, topic: "pressure", still: true, title: "2 Corinthians 4:8-9", clip: "2corinthians4-v8-9-web", seconds: 16.44,
    cover: "two-running-under-the-tree.jpg",
    art: "'pursued, yet not forsaken' — they are running, and they are running together." },
];

/*
 * HELD BACK, deliberately — not a leftover.
 *
 * Psalm 25:4-5 is already a card. shorts.ts spotlights exactly this passage on
 * the existing Psalm 25 short, so switching this on puts the same two verses in
 * the feed twice, once in NIV and once in the WEB. The clip, its captions and
 * its cover are all in place; enabling it is moving this entry into the array
 * above and deleting the NIV one from SPANS — but which recording survives is a
 * content call, not a wiring one, so it is being left to be made rather than
 * made silently here.
 */
export const HELD_VERSE_CARDS: VerseCard[] = [
  { id: 25, title: "Psalm 25:4-5", clip: "psalm25-v4-5-web", seconds: 19.27,
    cover: "figure-on-lit-path.jpg",
    art: "'Show me your ways... Guide me in your truth' — a lit path across an otherwise trackless field." },
];

/*
 * A NOTE ON THE ISAIAH 45:2 LOOP, because it breaks the rule on purpose.
 *
 * It is rendered at strength 46, not the 104 that round(60 * width / 736)
 * prescribes for a 1280px cover. The giant's hand is a thin limb silhouetted
 * against far, empty sky — exactly the depth discontinuity the parallax skill
 * warns tears first — and at 104 the forearm broke into visible banding.
 * Compared at 104/70/46/30 on the hand at the orbit's extreme: 70 still
 * streaked, 46 is clean and still measures as oscillation rather than a frozen
 * frame. Re-render it at 46 or the tear comes back.
 */

/** Same floor the psalm shorts use: below this a card is a fragment, not a short. */
const MIN_SECONDS = 7;

export const webVersePosts: Post[] = VERSE_CARDS.map(({ id, title, clip, cover, seconds, still }) => {
  const subtitles = webSubtitles[clip];
  if (!subtitles?.length) throw new Error(`web-verses: ${title} has no aligned captions`);
  if (seconds < MIN_SECONDS) {
    throw new Error(`web-verses: ${title} is ${seconds}s, under the ${MIN_SECONDS}s floor`);
  }
  return {
    id,
    title,
    backgroundImage: `/assets/verses/${cover}`,
    // Derived from the cover, never declared, so the still and its loop cannot
    // drift apart the way a second hand-written path eventually would. A card
    // marked `still` gets none, and shows the cover alone.
    ...(still ? {} : { posterVideoSrc: `/assets/verses/${cover.replace(/\.jpg$/, "-loop.mp4")}` }),
    audioSrc: `/assets/shorts/${clip}.mp3`,
    subtitles,
  };
});

/** Ids in this set, for the topic list. */
export const webVerseIds = VERSE_CARDS.map((c) => c.id);
/** The refuge set — Fear. */
export const refugeVerseIds = VERSE_CARDS.filter((c) => c.topic !== "pressure").map((c) => c.id);
/** The PRESSURE board's verses, which join the psalms already under that label. */
export const pressureVerseIds = VERSE_CARDS.filter((c) => c.topic === "pressure").map((c) => c.id);
