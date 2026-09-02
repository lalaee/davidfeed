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
    cover: "figure-on-cliff-at-dawn.jpg",
    art: "'my rock, my fortress... my high tower' — the figure is ON the rock, and high." },
  { id: 62, title: "Psalm 62:2,6", clip: "psalm62-v2-6-web", seconds: 18.99,
    cover: "figure-on-rock-in-waves.jpg",
    art: "'He alone is my rock... I will never be greatly shaken' — the sea moves, the rock does not." },
  { id: 46, title: "Psalm 46:1-2", clip: "psalm46-v1-2-web", seconds: 14.26,
    cover: "figure-before-storm-over-fjord.jpg",
    art: "'though the mountains are shaken into the heart of the seas' — mountain, sea, and a figure not running." },
  { id: 61, title: "Psalm 61:3", clip: "psalm61-v3-web", seconds: 9.01,
    cover: "figure-beneath-mountain.jpg",
    art: "'a strong tower from the enemy' — the mountain above him IS the tower, without drawing one." },
  { id: 28, title: "Psalm 28:7-8", clip: "psalm28-v7-8-web", seconds: 23.64,
    cover: "figure-under-shield-in-rain.jpg",
    art: "'The LORD is my strength and my shield' — he is sheltering under a shield, in the rain, with the light breaking." },
  { id: 1001, title: "Proverbs 18:10", clip: "proverbs18-v10-web", seconds: 8.22,
    cover: "figure-running-through-flowers.jpg",
    art: "'the righteous RUN to him, and are safe' — the only card in the set with a body in motion." },
  { id: 1002, title: "Nahum 1:7", clip: "nahum1-v7-web", seconds: 10.17,
    cover: "figure-sheltering-on-rock.jpg",
    art: "'a stronghold in the day of trouble' — sheltering on the rock while the weather goes on around it." },
  { id: 1003, title: "2 Samuel 22:29", clip: "2samuel22-v29-web", seconds: 10.08,
    cover: "figure-lamp-in-darkness.jpg",
    art: "'you are my lamp... will light up my darkness' — one light, one dark field, nothing else in the frame." },
  { id: 1004, title: "Isaiah 41:10", clip: "isaiah41-v10-web", seconds: 17.0,
    cover: "figure-before-black-cloud.jpg",
    art: "'Don't you be afraid' — she is small, the storm is enormous, and she has not turned around." },
  { id: 1005, title: "Deuteronomy 31:6", clip: "deuteronomy31-v6-web", seconds: 14.86,
    cover: "figure-facing-lightning.jpg",
    art: "'Be strong and courageous' — standing to face it rather than sheltering from it." },
  { id: 1006, title: "Isaiah 12:2", clip: "isaiah12-v2-web", seconds: 13.98,
    cover: "figure-arms-raised-in-sea.jpg",
    art: "'God is my salvation' — the one picture here of someone actually being saved out of something." },
  { id: 1007, title: "Hebrews 13:6", clip: "hebrews13-v6-web", seconds: 12.17,
    cover: "figure-under-stormbank.jpg",
    art: "'The Lord is my helper. I will not fear.' — squared up to the viewer, calm, under a very dark sky." },
  { id: 1008, title: "1 Peter 3:14", clip: "1peter3-v14-web", seconds: 14.02,
    cover: "figure-leaning-into-gale.jpg",
    art: "'even if you should suffer... neither be troubled' — enduring weather, not defeating it." },
  { id: 1009, title: "Romans 8:31", clip: "romans8-v31-web", seconds: 11.33,
    cover: "figure-before-golden-expanse.jpg",
    art: "'If God is for us, who can be against us?' — the widest, grandest frame in the set, for the widest claim." },
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
 * WAITING ON A RECORDING — the artwork is in, the voice is not.
 *
 * The cover and its loop are built and sitting in /assets/verses, and the WEB
 * text is already ours: "I will go before you, and make the rough places
 * smooth. I will break the doors of brass in pieces, and cut apart the bars of
 * iron." What is missing is the reading, and a card cannot ship without one —
 * the feed plays narration, and the captions are force-aligned TO that
 * narration, so without it there is nothing to hear and nothing to time
 * against. Hence a list of its own rather than a half-filled entry in
 * VERSE_CARDS, which would throw on the missing captions.
 *
 * Its loop was rendered at strength 46, not the 104 that
 * `round(60 * width / 736)` prescribes for a 1280px cover. The giant's hand is
 * a thin limb silhouetted against a far, empty sky — a depth discontinuity —
 * and at 104 the forearm tore into visible banding. Compared at 104/70/46/30:
 * 70 still streaked, 46 is clean and still reads as motion.
 *
 * To finish when the mp3 lands:
 *   1. public/assets/shorts/isaiah45-v2-web.mp3
 *   2. add it to scripts/web-clips.json, run scripts/align-web-clips.py
 *   3. move this entry into VERSE_CARDS with its measured `seconds`
 *   4. re-run scripts/build-share-videos.py so it has a shareable clip
 */
export const AWAITING_AUDIO: Omit<VerseCard, "seconds">[] = [
  { id: 1010, title: "Isaiah 45:2", clip: "isaiah45-v2-web",
    cover: "road-toward-vast-figure.jpg",
    art: "'I will go before you, and make the rough places smooth' — the road is already laid across the desert, and the one who goes ahead of it fills the sky." },
];

/** Same floor the psalm shorts use: below this a card is a fragment, not a short. */
const MIN_SECONDS = 7;

export const webVersePosts: Post[] = VERSE_CARDS.map(({ id, title, clip, cover, seconds }) => {
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
    // drift apart the way a second hand-written path eventually would.
    posterVideoSrc: `/assets/verses/${cover.replace(/\.jpg$/, "-loop.mp4")}`,
    audioSrc: `/assets/shorts/${clip}.mp3`,
    subtitles,
  };
});

/** Ids in this set, for the topic list. */
export const webVerseIds = VERSE_CARDS.map((c) => c.id);
