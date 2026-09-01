"use client";

import { notFound, useParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";

import Feed from "@/components/Feed";
import { shortPosts } from "@/data/shorts";
import { savedPostStore } from "@/lib/stores";

/*
 * A saved tile, opened as a feed.
 *
 * The collection is what you saved, not the topic you happened to be browsing:
 * running the list back through postsForTopic would drop cards the viewer
 * explicitly bookmarked, because a saved psalm need not belong to the topic
 * that is currently selected. So Feed is handed the list outright and told to
 * skip topic filtering.
 *
 * Client-side because the list lives in localStorage, which the prerender
 * cannot see. The store's server snapshot is empty, so the first paint is the
 * requested card alone and the rest arrive on hydration — which is why Feed
 * resolves the card to open on LIVE rather than freezing it at first render.
 */
export default function SavedFeedPage() {
  const params = useParams<{ psalm: string }>();
  const psalm = Number(params.psalm);

  const live = useSyncExternalStore(
    savedPostStore.subscribe,
    savedPostStore.read,
    savedPostStore.serverSnapshot,
  );

  /*
   * The saved set, plus the card the URL names whether or not it is still
   * saved. Without that clause, un-bookmarking the card you arrived on would
   * empty the very route you are standing in. Un-bookmarking any OTHER card
   * does drop it from the list, which is the honest answer for a list OF
   * bookmarks — the snap simply carries you to the next one.
   */
  const posts = useMemo(
    () => shortPosts.filter((p) => live[p.id] || p.id === psalm),
    [live, psalm],
  );

  // A URL naming a psalm the feed does not carry is a bad URL, not an empty
  // library — say so rather than opening someone else's card.
  if (!shortPosts.some((p) => p.id === psalm)) notFound();

  return (
    <main className="h-[100dvh] bg-black">
      <Feed
        posts={posts}
        activeTab="library"
        collectionLabel="Saved"
        collectionBackHref="/library"
        initialPostId={psalm}
      />
    </main>
  );
}
