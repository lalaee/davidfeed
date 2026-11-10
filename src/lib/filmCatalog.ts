import type { CaptionSpan } from "@/components/FeedItem";
import { FILM_DIR, filmPosts, webFilmFiles } from "@/data/films";
import type { Post } from "@/data/posts";

/*
 * THE FILMS, FROM SUPABASE — the same list the iPhone app reads.
 *
 * `public.films` and `public.film_days` (supabase/migrations/20261108000000_films.sql,
 * from the iOS session) hold which films are published and which one is each
 * date's verse of the day. Both are readable with the public anon key. Reading
 * them here, rather than films.ts, is what lets a film be added, taken down or
 * scheduled in Supabase and reach the site and the app together, with no
 * deploy and no App Review.
 *
 * The rows name the APP's media (HEVC in the `films` bucket), which not every
 * browser plays. The web keeps its own H.264 copies and plays those instead,
 * matched on the file name — see webFilmFiles in data/films.ts. A published
 * film with no web copy is left off the site.
 *
 * Fetched on the server, cached for five minutes (FILMS_REVALIDATE), and handed
 * to the client by the root layout (components/FilmCatalog.tsx). Should
 * Supabase be unreachable — the Free project pauses after a week without use —
 * the site falls back to the nine films it has always shipped and the shared
 * rotation, rather than an empty Home.
 */

export interface FilmCatalog {
  /** Published films the web can play, in the table's order. */
  films: Post[];
  /** "2026-11-08" -> film id, a fortnight either side of today. */
  days: Record<string, number>;
}

/** Seconds a fetched catalog is reused before Supabase is asked again. */
export const FILMS_REVALIDATE = 300;

export const FALLBACK_CATALOG: FilmCatalog = { films: filmPosts, days: {} };

interface FilmRow {
  id: number;
  title: string;
  background_image: string;
  poster_video_src: string | null;
  video_src: string | null;
  captions: unknown;
  /** 'black' | 'white' | null; absent until migration 20261109000000 runs. */
  title_ink?: unknown;
  created_at?: string;
}

/** "/assets/verses/psalm-23-woodcut.mp4" -> "psalm-23-woodcut". */
function fileStem(path: string | null): string | null {
  const name = path?.split("/").pop();
  return name ? name.replace(/\.[^.]+$/, "") : null;
}

function captionSpan(value: unknown): CaptionSpan | undefined {
  if (Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === "number")) {
    return [value[0], value[1]] as const;
  }
  return undefined;
}

/** A row as the web plays it, or null when the web has no copy of its film. */
function toPost(row: FilmRow): Post | null {
  const stem = fileStem(row.poster_video_src ?? row.video_src);
  if (!stem || !webFilmFiles.has(stem)) return null;
  return {
    id: row.id,
    title: row.title,
    backgroundImage: `${FILM_DIR}/${stem}.jpg`,
    posterVideoSrc: `${FILM_DIR}/${stem}.mp4`,
    audioSrc: `${FILM_DIR}/${stem}.m4a`,
    captions: captionSpan(row.captions),
    titleInk: row.title_ink === "black" || row.title_ink === "white" ? row.title_ink : undefined,
    createdAt: row.created_at,
  };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The catalog, or the fallback. Server-side: the anon key is public, but the
 * fetch belongs with the page so it is cached once for everyone.
 *
 * FILMS_SUPABASE_URL / FILMS_SUPABASE_ANON_KEY point the films at another
 * project than sign-in uses. Unset in production, where both are the one
 * project; set in `.env.local`, where sign-in runs on a local Supabase that has
 * no films, so development still shows the real list.
 */
export async function loadFilmCatalog(): Promise<FilmCatalog> {
  const base = process.env.FILMS_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.FILMS_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return FALLBACK_CATALOG;

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const init = { headers, next: { revalidate: FILMS_REVALIDATE } };
  // A fortnight either side, as the app asks, which also covers every time
  // zone's "today" whatever the server's clock says.
  const now = Date.now();
  const from = isoDay(new Date(now - 14 * 86_400_000));
  const to = isoDay(new Date(now + 14 * 86_400_000));

  try {
    const [filmsRes, daysRes] = await Promise.all([
      // Every column, not a list: naming one the database does not have yet
      // (title_ink, before its migration runs) fails the whole query, and the
      // site would fall back to the built-in films for nothing.
      fetch(`${base}/rest/v1/films?select=*&order=position,id`, init),
      fetch(`${base}/rest/v1/film_days?select=day,film_id&day=gte.${from}&day=lte.${to}`, init),
    ]);
    if (!filmsRes.ok || !daysRes.ok) throw new Error(`films ${filmsRes.status}, days ${daysRes.status}`);
    const rows = (await filmsRes.json()) as FilmRow[];
    const schedule = (await daysRes.json()) as { day: string; film_id: number }[];

    const films = rows.map(toPost).filter((p): p is Post => p !== null);
    if (!films.length) throw new Error("no film the web can play");
    const days: Record<string, number> = {};
    for (const { day, film_id } of schedule) days[day] = film_id;
    return { films, days };
  } catch (err) {
    console.error("films: Supabase unavailable, using the built-in list", err);
    return FALLBACK_CATALOG;
  }
}
