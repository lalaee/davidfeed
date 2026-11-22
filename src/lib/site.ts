/** The site's own address: canonicals, the sitemap and robots.txt. */
export const SITE = "https://www.dafod.app";

/** Dafod's YouTube channel (＠dafodapp). */
export const YOUTUBE_CHANNEL = "https://www.youtube.com/@dafodapp";

/** Dafod's Instagram (＠dafod.app). */
export const INSTAGRAM = "https://www.instagram.com/dafod.app/";

/**
 * Each film's YouTube Short, by film page slug, and when it goes public. A
 * Short is private until then, so a film page names it only from that moment:
 * pages regenerate every few minutes, so the link appears without a deploy.
 */
export const FILM_SHORTS: Record<string, { url: string; publicFrom: string }> = {
  "psalm-23-woodcut": { url: "https://www.youtube.com/shorts/7vZsB1DEGlU", publicFrom: "2026-11-23T08:00:00+01:00" },
  "isaiah-41-10-13-woodcut": { url: "https://www.youtube.com/shorts/b-O1B5Li6WI", publicFrom: "2026-11-24T08:00:00+01:00" },
  "philippians-4-woodcut": { url: "https://www.youtube.com/shorts/31gTVbRcy7s", publicFrom: "2026-11-25T08:00:00+01:00" },
  "jeremiah-29-woodcut": { url: "https://www.youtube.com/shorts/jcgOnJon3zI", publicFrom: "2026-11-26T08:00:00+01:00" },
  "john-3-woodcut": { url: "https://www.youtube.com/shorts/5vlsziCPaDg", publicFrom: "2026-11-27T08:00:00+01:00" },
};

/** The film's Short, once it is public. */
export function publicShort(slug: string, now = Date.now()): string | undefined {
  const short = FILM_SHORTS[slug];
  return short && now >= Date.parse(short.publicFrom) ? short.url : undefined;
}
