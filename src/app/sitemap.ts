import type { MetadataRoute } from "next";

import { BOOKS, bookSlug } from "@/data/bible";
import { loadFilmCatalog } from "@/lib/filmCatalog";
import { filmSlug } from "@/lib/filmPages";
import { SITE } from "@/lib/site";

/*
 * sitemap.xml: Home, the policy pages, every film at its own page
 * (/film/psalm-23-woodcut, app/film), and every chapter of the Bible at its
 * own URL (/bible/psalms/23), which is what people search for. /bible itself
 * is left out: it is the default chapter under another name, and points its
 * canonical there (bible/[[...ref]]/page.tsx).
 */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/support`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "monthly", priority: 0.2 },
  ];
  const { films } = await loadFilmCatalog();
  for (const post of films) {
    pages.push({ url: `${SITE}/film/${filmSlug(post)}`, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const { name, chapters } of BOOKS) {
    for (let c = 1; c <= chapters; c++) {
      pages.push({ url: `${SITE}/bible/${bookSlug(name)}/${c}`, changeFrequency: "yearly", priority: 0.6 });
    }
  }
  return pages;
}
