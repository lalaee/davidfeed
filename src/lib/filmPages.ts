import type { Post } from "@/data/posts";
import { BOOKS, bookSlug } from "@/data/bible";

import { fetchLicensedChapter } from "./apiBible";
import { SITE } from "./site";

/*
 * A FILM'S OWN PAGE (app/film/[slug]) — what Google needs to list a film:
 * an address, a title, and words to index beside the video.
 *
 * The address is the film's file name ("psalm-23-woodcut"), unique where the
 * titles are not: three films are "Psalm 23". The words are the passage the
 * film reads, in the NIV, as the films mostly read it — through API.Bible as
 * the reader has it (lib/apiBible.ts: cached 29 days, inside the licence's
 * 30), shown with the publisher's copyright line and reported to FUMS when on
 * screen (FilmText). Where API.Bible can't be had, the World English Bible
 * from the site's own public-domain files, so the page never stands empty.
 *
 * SERVER ONLY, for the API.Bible key: app/film and app/sitemap import it.
 */

/** "/assets/films/no-outro/psalm-23-woodcut.mp4" -> "psalm-23-woodcut". */
export function filmSlug(post: Post): string {
  const path = post.posterVideoSrc ?? post.videoSrc ?? post.backgroundImage;
  return (path.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
}

export interface FilmRef {
  book: string;
  chapter: number;
  /** The verses the film reads, both inclusive; the whole chapter when absent. */
  from?: number;
  to?: number;
}

/** "Psalm 45:2-8" -> Psalms 45, 2 to 8. Null for a title that names no chapter. */
export function filmRef(title: string): FilmRef | null {
  const m = /^(.+?) (\d+)(?::(\d+)(?:-(\d+))?)?$/.exec(title.trim());
  if (!m) return null;
  const book = m[1] === "Psalm" ? "Psalms" : m[1];
  if (!BOOKS.some((b) => b.name === book)) return null;
  const from = m[3] ? Number(m[3]) : undefined;
  return { book, chapter: Number(m[2]), from, to: m[4] ? Number(m[4]) : from };
}

export interface Passage {
  ref: FilmRef;
  /** [verse number, text], in order. */
  verses: [number, string][];
  /** "NIV", or "WEB" when the NIV couldn't be had. */
  translation: "NIV" | "WEB";
  /** The publisher's line, shown with the text (NIV only). */
  copyright?: string;
  /** API.Bible's token, reported when the text is on screen (NIV only). */
  fums?: string | null;
}

function pick(v: string[], ref: FilmRef): [number, string][] {
  const from = ref.from ?? 1;
  const to = Math.min(ref.to ?? v.length, v.length);
  const verses: [number, string][] = [];
  for (let n = from; n <= to; n++) if (v[n - 1]) verses.push([n, v[n - 1]]);
  return verses;
}

/** The film's passage: NIV, else WEB, else null (the page still stands). */
export async function filmPassage(title: string): Promise<Passage | null> {
  const ref = filmRef(title);
  if (!ref) return null;
  const bookIndex = BOOKS.findIndex((b) => b.name === ref.book);
  const niv = await fetchLicensedChapter("niv", bookIndex, ref.book, ref.chapter);
  if (niv) {
    const verses = pick(niv.v, ref);
    if (verses.length) return { ref, verses, translation: "NIV", copyright: niv.copyright, fums: niv.fums };
  }
  // The WEB fetched over HTTP rather than read off disk, so a page regenerated
  // at runtime for a film added in Supabase finds it too.
  try {
    const res = await fetch(`${SITE}/bible/web/${bookSlug(ref.book)}/${ref.chapter}.json`, {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const { v } = (await res.json()) as { v: string[] };
    const verses = pick(v, ref);
    return verses.length ? { ref, verses, translation: "WEB" } : null;
  } catch {
    return null;
  }
}

/** The search snippet: the passage's opening words, cut at a word near 150. */
export function filmDescription(title: string, passage: Passage | null): string {
  const tail = "A short Bible film on Dafod.";
  if (!passage) return `${title}. ${tail}`;
  const text = passage.verses.map(([, t]) => t).join(" ");
  const cut = text.length > 150 ? `${text.slice(0, 150).replace(/\s+\S*$/, "")}…` : text;
  return `${title}: “${cut}” ${tail}`;
}
