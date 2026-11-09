import type { CaptionSpan } from "@/components/FeedItem";
import type { Post } from "@/data/posts";

/*
 * THE LEMOLAB FILMS — the feed, on this branch.
 *
 * Nine short films made in code from github.com/lalaee/lemo-opuscar/Bible:
 * three readings each of Psalm 23 and Psalm 3, two of Psalm 45 and one of
 * Isaiah 41:10-13, each in a different LemoLab style, then ten verse films
 * from the FigJam board (below). Psalm 45's impasto
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
 * 4101). The board's verses follow suit: 304, 2001, 9101, 701, 11801, 2701,
 * 12101 and 4601 for the psalms; 2 Chronicles 20 and Isaiah 40 take
 * chapter x 1000 + 1. They only have to be unique — saved state, /library/[id] and the
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

  // The FigJam board "Dafod verses": the ten verses the feed played as spoken
  // cards before the films, made into films the films' way — Kokoro af_nicole
  // with the films' stone-hall room, over the dafod music bed — on each card's
  // own painting and parallax loop, the words burned in low, ending 78% down
  // (lemo-opuscar dafod/verses/build.py). Psalm 118 keeps the embrace its
  // card moved to (the board's headland is a square source, cropped and blown
  // up), and Psalm 27:3, never recorded before, is new. 20 has no loop
  // rendered, so it holds still as its card did.
  { id: 304,   chapter: 3,   style: "Painting", file: "psalm-3-1-3",   verses: "1-3",   captions: [0.679, 0.78] },
  { id: 2001,  chapter: 20,  style: "Painting", file: "psalm-20-7-8",  verses: "7-8",   captions: [0.679, 0.779] },
  { id: 9101,  chapter: 91,  style: "Painting", file: "psalm-91-4",    verses: "4",     captions: [0.679, 0.78] },
  { id: 701,   chapter: 7,   style: "Painting", file: "psalm-7-1-2",   verses: "1-2",   captions: [0.679, 0.78] },
  { id: 11801, chapter: 118, style: "Painting", file: "psalm-118-6-7", verses: "6-7",   captions: [0.632, 0.78] },
  { id: 2701,  chapter: 27,  style: "Painting", file: "psalm-27-3",    verses: "3",     captions: [0.679, 0.78] },
  { id: 12101, chapter: 121, style: "Painting", file: "psalm-121-1-2", verses: "1-2",   captions: [0.679, 0.78] },
  { id: 4601,  chapter: 46,  style: "Painting", file: "psalm-46-7",    verses: "7",     captions: [0.679, 0.78] },
  { id: 20001, book: "2 Chronicles", chapter: 20, style: "Painting", file: "2-chronicles-20-15", verses: "15", captions: [0.679, 0.78] },
  { id: 40001, book: "Isaiah", chapter: 40, style: "Painting", file: "isaiah-40-30-31", verses: "30-31", captions: [0.632, 0.78] },
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

/*
 * WHICH FILMS THE WEB CAN PLAY, by file name.
 *
 * The list itself now comes from Supabase (lib/filmCatalog.ts), shared with
 * the iPhone app. The app's copies in the `films` bucket are HEVC with the
 * sound muxed in, which Firefox cannot play and Chrome only can where the
 * machine decodes HEVC in hardware — so the web keeps playing its own H.264
 * copies, with the sound beside them, from this folder. A row whose file is
 * not here has no web copy yet and is left off the site until it has one.
 *
 * Psalm 45's impasto reading (4502) is here although it is off the list: its
 * files are, so publishing it in Supabase would bring it straight back.
 */
export const FILM_DIR = DIR;
export const webFilmFiles = new Set([...FILMS.map((f) => f.file), "psalm-45-impasto"]);
