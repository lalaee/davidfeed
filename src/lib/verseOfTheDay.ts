import type { Post } from "@/data/posts";

/*
 * WHICH FILM IS TODAY'S — the same answer the iPhone app gives on the same
 * date (ios/…/Feed/VerseOfTheDayView.swift, FilmCatalog.swift).
 *
 * By the reader's LOCAL calendar date, so it turns over at their midnight:
 *
 *   1. the film `film_days` schedules for that date, if it is still published;
 *   2. otherwise the shared rotation over the published films — one film per
 *      passage per round, passages in list order — indexed by whole local days
 *      since 8 November 2026 (the day the feature was made), modulo the count.
 *
 * Both halves must stay as iOS has them, or the site and the app would show
 * different films on the same day.
 */

/** "2026-11-08" for a date, in the local time zone. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The passage a film reads: its title up to the verse colon. */
function passageOf(title: string): string {
  return title.split(":")[0].trim();
}

/**
 * The order the days take: one film from each passage in turn, passages in the
 * order the list first names them. With the nine films that is 2301, 301,
 * 4501, 41001, 2302, 302, 4503, 2303, 303.
 */
export function rotation(posts: Post[]): Post[] {
  const passages: string[] = [];
  const groups = new Map<string, Post[]>();
  for (const p of posts) {
    const key = passageOf(p.title);
    if (!groups.has(key)) {
      passages.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  }
  const out: Post[] = [];
  for (let round = 0; out.length < posts.length; round++) {
    for (const key of passages) {
      const film = groups.get(key)![round];
      if (film) out.push(film);
    }
  }
  return out;
}

/** Midnight, local, on 8 November 2026: day 0 of the rotation. */
const FIRST_DAY = new Date(2026, 10, 8);

/** Whole local days from FIRST_DAY to `date` (negative before it). */
function daysSinceFirst(date: Date): number {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Rounded, because a day that crosses a clock change is 23 or 25 hours.
  return Math.round((start.getTime() - FIRST_DAY.getTime()) / 86_400_000);
}

/** The film for a local date: the schedule's, else the rotation's. */
export function filmForDay(films: Post[], days: Record<string, number>, date: Date): Post | null {
  const scheduled = days[dayKey(date)];
  const hit = scheduled != null ? films.find((f) => f.id === scheduled) : undefined;
  if (hit) return hit;
  const order = rotation(films);
  if (!order.length) return null;
  const n = order.length;
  return order[((daysSinceFirst(date) % n) + n) % n];
}

/** Parses a dayKey back to that local date's midnight. */
export function dateOfKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
