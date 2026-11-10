import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

/*
 * robots.txt. Everything readable may be crawled; what is not a page is not:
 * the Bible proxy, the sign-in returns, and a reader's saved feed, which lives
 * in their own browser. The films' media files are crawlable but carry
 * X-Robots-Tag: noindex (next.config.ts) — disallowing them here would hide
 * that header and leave them listed as "crawled, not indexed".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/library/"] },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
