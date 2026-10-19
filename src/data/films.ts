import type { Post } from "@/data/posts";

/*
 * THE LEMOLAB FILMS — the feed, on this branch.
 *
 * Eight short films made in code from github.com/lalaee/lemo-opuscar/Bible:
 * three readings of Psalm 23, three of Psalm 3, two of Psalm 45, each in a
 * different LemoLab style. They arrive as finished films — voice, score,
 * burned-in captions, credits and the dafod outro — so a card here is wired
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
 *
 * Video and audio are the same length and start together on activation, so
 * they stay in step across a loop within a frame or two.
 *
 * IDS are psalm x 100 + take: 2301..2303, 301..303, 4501, 4502. They only
 * have to be unique — saved state, /library/[id] and the topic lists key off
 * them — and these sit clear of both the 1-150 a psalm occupies and the
 * 1001+ the other books use (see web-verses.ts).
 *
 * Files live in /assets/films, named for the source file in lemo-opuscar.
 */
interface Film {
  id: number;
  psalm: number;
  /** The LemoLab style. Names the file only; the card shows the reference. */
  style: string;
  /** Basename in /assets/films and in the source repo. */
  file: string;
  /**
   * The verses the film reads, when it is only part of the chapter. A whole
   * chapter is named alone ("Psalm 3"); part of one carries its verses
   * ("Psalm 45:2-8"). The ranges are the films' own briefs, the same ones the
   * iOS import reads: 23 is 1-6 and 3 is 1-8, both whole; 45 is 2-8 of 17.
   */
  verses?: string;
}

const FILMS: Film[] = [
  { id: 2301, psalm: 23, style: "Paper-cut lightbox", file: "psalm-23-paper-cut-lightbox" },
  { id: 2302, psalm: 23, style: "Watercolor",         file: "psalm-23-watercolor" },
  { id: 2303, psalm: 23, style: "Woodcut",            file: "psalm-23-woodcut" },
  { id: 301,  psalm: 3,  style: "Shadow puppet",      file: "psalm-3-shadow-puppet" },
  { id: 302,  psalm: 3,  style: "Stained glass",      file: "psalm-3-stained-glass" },
  { id: 303,  psalm: 3,  style: "Woodcut",            file: "psalm-3-woodcut" },
  { id: 4501, psalm: 45, style: "Art deco",           file: "psalm-45-art-deco", verses: "2-8" },
  { id: 4502, psalm: 45, style: "Impasto",            file: "psalm-45-impasto",  verses: "2-8" },
];

export const filmPosts: Post[] = FILMS.map(({ id, psalm, file, verses }) => ({
  id,
  // The reference, never the style — the style is the picture's to show.
  title: verses ? `Psalm ${psalm}:${verses}` : `Psalm ${psalm}`,
  backgroundImage: `/assets/films/${file}.jpg`,
  posterVideoSrc: `/assets/films/${file}.mp4`,
  audioSrc: `/assets/films/${file}.m4a`,
}));
