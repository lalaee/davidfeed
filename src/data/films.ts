import type { CaptionSpan } from "@/components/FeedItem";
import type { Post } from "@/data/posts";

/*
 * THE LEMOLAB FILMS — the feed, on this branch.
 *
 * Nine short films made in code from github.com/lalaee/lemo-opuscar/Bible:
 * three readings each of Psalm 23 and Psalm 3, two of Psalm 45 and one of
 * Isaiah 41:10-13, each in a different LemoLab style. Psalm 45's impasto
 * reading (4502) was taken off the feed: its words sit at both ends of the
 * frame and a short phone could not keep both clear of the nav. Its files
 * stay in /assets/films/no-outro. They arrive as finished films —
 * voice, score, burned-in captions and credits — so a card here is wired
 * differently from a short:
 *
 *   posterVideoSrc   the film, re-encoded for the web and stripped of audio.
 *                    FeedItem plays it muted and looped on top of the cover,
 *                    exactly as it plays a parallax loop.
 *   audioSrc         the film's own soundtrack, lifted out as AAC, so sound
 *                    goes through the card's audio element — the sound toggle,
 *                    the ambient bed, pause and the autoplay fallback all keep
 *                    working — instead of through a video the feed mutes.
 *   backgroundImage  a frame from the film, held under the video until it
 *                    decodes and fed to the ambience behind the column.
 *   subtitles        none. The captions are burned into the picture; drawing
 *                    the feed's own over them would double every line.
 *   captions         the span its burned-in words occupy, [highest, lowest],
 *                    as fractions of the film's height. A phone too short
 *                    for the whole film crops outside it (globals.css,
 *                    .feed-card). Measured by OCR over a frame every two
 *                    seconds of each film, misreads of texture dropped, with
 *                    a hundredth of margin: the end-card titles ("PSALM 23")
 *                    near the head, the verses near the foot. Isaiah's title
 *                    was read off its frames by eye; OCR missed it.
 *
 * Video and audio are the same length and start together on activation, so
 * they stay in step across a loop within a frame or two.
 *
 * IDS are chapter x 100 + take: 2301..2303, 301..303, 4501..4503, and
 * Isaiah's 41001 (chapter x 1000 + take, so it can never meet Psalm 41's
 * 4101). They only have to be unique — saved state, /library/[id] and the
 * topic lists key off them — and these sit clear of both the 1-150 a psalm
 * occupies and the 1001+ the other books use (see web-verses.ts).
 *
 * Files live in /assets/films/no-outro, named for the source file in
 * lemo-opuscar's Bible/no-outro: the same films without the dafod outro card
 * at the end. The first cut, outro and all, stays in /assets/films beside it.
 */
const DIR = "/assets/films/no-outro";

interface Film {
  id: number;
  /** Defaults to Psalms. */
  book?: string;
  chapter: number;
  /** The LemoLab style. Names the file only; the card shows the reference. */
  style: string;
  /** Basename in /assets/films and in the source repo. */
  file: string;
  /**
   * The verses the film reads, when it is only part of the chapter. A whole
   * chapter is named alone ("Psalm 3"); part of one carries its verses
   * ("Psalm 45:2-8"). The ranges are the films' own briefs, the same ones the
   * iOS import reads: 23 is 1-6 and 3 is 1-8, both whole; 45 is 2-8 of 17;
   * Isaiah 41 is 10-13, as its file is named.
   */
  verses?: string;
  captions: CaptionSpan;
}

const FILMS: Film[] = [
  { id: 2301,  chapter: 23, style: "Paper-cut lightbox", file: "psalm-23-paper-cut-lightbox", captions: [0.09, 0.88] },
  { id: 2302,  chapter: 23, style: "Watercolor",         file: "psalm-23-watercolor",         captions: [0.13, 0.89] },
  { id: 2303,  chapter: 23, style: "Woodcut",            file: "psalm-23-woodcut",            captions: [0.07, 0.88] },
  { id: 301,   chapter: 3,  style: "Shadow puppet",      file: "psalm-3-shadow-puppet",       captions: [0.05, 0.23] },
  { id: 302,   chapter: 3,  style: "Stained glass",      file: "psalm-3-stained-glass",       captions: [0.75, 0.96] },
  // The verses reach 0.95 and the end card's "PSALM" starts at 0.10; on the
  // shortest screens the two cannot both clear the nav, and the verses run
  // the whole film, so the title gives up its top few px: 0.105.
  { id: 303,   chapter: 3,  style: "Woodcut",            file: "psalm-3-woodcut",             captions: [0.105, 0.95] },
  { id: 4501,  chapter: 45, style: "Art deco",           file: "psalm-45-art-deco",  verses: "2-8", captions: [0.84, 0.95] },
  { id: 4503,  chapter: 45, style: "Engraving",          file: "psalm-45-engraving", verses: "2-8", captions: [0.87, 0.94] },
  { id: 41001, book: "Isaiah", chapter: 41, style: "Ink wash", file: "isaiah-41-10-13-ink-wash", verses: "10-13", captions: [0.20, 0.89] },
];

export const filmPosts: Post[] = FILMS.map(({ id, book = "Psalm", chapter, file, verses, captions }) => ({
  id,
  // The reference, never the style — the style is the picture's to show.
  title: verses ? `${book} ${chapter}:${verses}` : `${book} ${chapter}`,
  backgroundImage: `${DIR}/${file}.jpg`,
  posterVideoSrc: `${DIR}/${file}.mp4`,
  audioSrc: `${DIR}/${file}.m4a`,
  captions,
}));
