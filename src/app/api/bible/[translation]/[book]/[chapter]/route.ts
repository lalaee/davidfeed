import { BOOKS, bookSlug } from "@/data/bible";
import { API_BIBLE_IDS, CACHE_SECONDS, fetchLicensedChapter } from "@/lib/apiBible";

/*
 * GET /api/bible/<translation>/<book-slug>/<chapter> — one chapter of NIV, NKJV
 * or NLT, in the shape public/bible's static files have (see lib/apiBible.ts).
 *
 * The route exists to keep API.Bible's key on the server. It refuses anything
 * that is not a real chapter BEFORE calling out, so a bad URL costs nothing
 * against the monthly allowance.
 *
 * Two caches in front of API.Bible: Next's data cache inside fetchLicensedChapter
 * (29 days, survives deploys), and the CDN via the header below, which a deploy
 * clears — hence the CDN's shorter week. The browser keeps a day.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ translation: string; book: string; chapter: string }> },
) {
  const { translation, book, chapter } = await params;
  const bookIndex = BOOKS.findIndex((b) => bookSlug(b.name) === book);
  const n = Number(chapter);
  if (
    !API_BIBLE_IDS[translation] ||
    bookIndex < 0 ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > BOOKS[bookIndex].chapters
  ) {
    return Response.json({ error: "No such chapter." }, { status: 404 });
  }

  const found = await fetchLicensedChapter(translation, bookIndex, BOOKS[bookIndex].name, n);
  if (!found) {
    // Not cached, so the chapter comes back as soon as API.Bible does.
    return Response.json(
      { error: "This translation is unavailable right now." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(found, {
    headers: {
      "Cache-Control": `public, max-age=86400, s-maxage=${Math.min(CACHE_SECONDS, 604800)}, stale-while-revalidate=86400`,
      // Scripture text served for the reader, not a page to index.
      "X-Robots-Tag": "noindex",
    },
  });
}
