import type { Metadata } from "next";

import VerseOfTheDay from "@/components/VerseOfTheDay";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/appStore";
import { SITE, YOUTUBE_CHANNEL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/*
 * Home is the verse of the day: one film, the same one the iPhone app shows on
 * the same date, from the list and schedule in Supabase (lib/filmCatalog.ts,
 * provided by the root layout). The scrolling feed it replaced still plays a
 * reader's saved films at /library/[id].
 *
 * The date is the reader's own, so the page works it out in the browser; this
 * passes the server's UTC date for the first paint, which the browser then
 * corrects where its local date differs.
 */
export default function Home() {
  const serverDay = new Date().toISOString().slice(0, 10);
  return (
    <main className="h-[var(--app-h)] bg-black">
      <VerseOfTheDay serverDay={serverDay} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(IDENTITY) }} />
    </main>
  );
}

/*
 * Who Dafod is, for search and answer engines: the site, and the profiles
 * that are also Dafod (sameAs), so the channel, the apps and the site are
 * read as one name rather than as strangers who share it.
 */
const IDENTITY = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Dafod",
      url: SITE,
      logo: `${SITE}/icon.png`,
      description: "Short films of the Bible's verses, a verse of the day and the whole Bible, free on the web, iPhone and Android.",
      sameAs: [YOUTUBE_CHANNEL, APP_STORE_URL, PLAY_STORE_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "Dafod",
      url: SITE,
      publisher: { "@id": `${SITE}/#organization` },
    },
  ],
};
