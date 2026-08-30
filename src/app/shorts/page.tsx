import Feed from "@/components/Feed";
import { shortPosts } from "@/data/shorts";

export const metadata = {
  title: "Shorts — DavidFeed",
  description: "One spotlighted passage from each psalm, 7 to 20 seconds.",
};

export default function ShortsPage() {
  return (
    <main className="h-[100dvh] bg-black">
      <Feed posts={shortPosts} activeTab="shorts" />
    </main>
  );
}
