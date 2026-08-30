import Feed from "@/components/Feed";
import { shortPosts } from "@/data/shorts";

/*
 * Home is the shorts feed. The full chapter readings ran 45s to 2m40s, which
 * turned out to be more than a feed can hold attention for, so the spotlighted
 * passages replaced them outright rather than living behind a second tab.
 *
 * chapterPosts is still the source of every card's artwork and parallax loop —
 * see src/data/shorts.ts — so the chapter data stays live in the codebase. It
 * is only the full-length narration and its captions that no longer play.
 */
export default function Home() {
  return (
    <main className="h-[100dvh] bg-black">
      <Feed posts={shortPosts} activeTab="home" />
    </main>
  );
}
