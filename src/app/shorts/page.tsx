import { redirect } from "next/navigation";

/*
 * Shorts moved to /. Kept as a redirect rather than deleted because this path
 * was live in production and may be bookmarked or linked.
 */
export default function ShortsPage() {
  redirect("/");
}
