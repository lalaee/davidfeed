import type { Metadata } from "next";
import { notFound } from "next/navigation";

import FilmText from "@/components/FilmText";
import VerseOfTheDay from "@/components/VerseOfTheDay";
import { loadFilmCatalog } from "@/lib/filmCatalog";
import { filmDescription, filmPassage, filmSlug } from "@/lib/filmPages";
import { SITE } from "@/lib/site";

/*
 * /film/psalm-23-woodcut — one film at its own address, for search
 * (lib/filmPages.ts). Home's player, as it is (VerseOfTheDay), with the
 * film's reference where "Verse of the day" stands, and the passage it reads:
 * scrolled to under the film on a phone, beside it at desk where the hero's
 * copy stands. Nothing on Home links here, by request; the sitemap does.
 *
 * Every published film the web can play is prerendered, and the list follows
 * Supabase as Home's does: a film added there gets its page on the next
 * regeneration, one taken down 404s.
 */
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { films } = await loadFilmCatalog();
  return films.map((post) => ({ slug: filmSlug(post) }));
}

async function filmFor(slug: string) {
  const { films } = await loadFilmCatalog();
  return films.find((post) => filmSlug(post) === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await filmFor(slug);
  if (!post) return {};
  const description = filmDescription(post.title, await filmPassage(post.title));
  return {
    title: `${post.title} — a short Bible film | Dafod`,
    description,
    alternates: { canonical: `/film/${slug}` },
    openGraph: {
      type: "video.other",
      title: post.title,
      description,
      url: `/film/${slug}`,
      images: [{ url: post.backgroundImage, width: 1080, height: 1920 }],
      videos: post.posterVideoSrc ? [{ url: post.posterVideoSrc, type: "video/mp4" }] : undefined,
    },
  };
}

export default async function FilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await filmFor(slug);
  if (!post) notFound();
  const passage = await filmPassage(post.title);

  // Google's video result: name, description, thumbnail, upload date, file.
  // Without a date (the built-in films, when Supabase is down) it is left out.
  const video = post.createdAt && post.posterVideoSrc && {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: filmDescription(post.title, passage),
    thumbnailUrl: [`${SITE}${post.backgroundImage}`],
    uploadDate: post.createdAt,
    contentUrl: `${SITE}${post.posterVideoSrc}`,
  };

  return (
    // Scrolls on a phone, to the words under the film; at desk they stand
    // beside it and the page holds still, as Home does.
    <main className="h-[var(--app-h)] overflow-y-auto overscroll-contain bg-black desk:overflow-hidden">
      <VerseOfTheDay
        serverDay={new Date().toISOString().slice(0, 10)}
        filmId={post.id}
        heading={post.title}
        copy={<FilmText title={post.title} passage={passage} desk />}
      />
      {/* Above the ambience, which is fixed at z-0 and would wash it out. */}
      <section className="relative z-[1] mx-auto w-full max-w-[375px] px-[24px] pb-[140px] pt-[40px] desk:hidden">
        <FilmText title={post.title} passage={passage} />
      </section>
      {video && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(video) }} />
      )}
    </main>
  );
}
