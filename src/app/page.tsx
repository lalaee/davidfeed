import type { Metadata } from "next";

import VerseOfTheDay from "@/components/VerseOfTheDay";

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
    </main>
  );
}
