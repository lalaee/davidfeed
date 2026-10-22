"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { ChevronIcon } from "./icons";
import { trailStore } from "@/lib/uiStore";

/* What the way back is called, by where it goes. */
function nameOf(path: string): string {
  if (path.startsWith("/you/saved") || path.startsWith("/library/")) return "Saved";
  if (path.startsWith("/you")) return "Account";
  if (path.startsWith("/bible")) return "Bible";
  return "Home";
}

/*
 * The way back to the page the reader came from, named for it ("Account",
 * "Bible", "Home"). It goes back in history rather than to a fresh copy of
 * that page, so the feed or the chapter is where they left it. Arrived from
 * outside the app — a new tab, Google's consent screen — there is nothing of
 * ours behind it, and it goes Home.
 *
 * The chevron is the collection header's back arrow (DesktopChrome), turned
 * the same way.
 */
export default function BackLink() {
  const router = useRouter();
  const previous = useSyncExternalStore(trailStore.subscribe, trailStore.read, trailStore.serverSnapshot);

  return (
    <Link
      href={previous ?? "/"}
      onClick={(e) => {
        if (!previous) return;
        e.preventDefault();
        router.back();
      }}
      className="mb-[24px] inline-flex items-center gap-[2px] text-[17px] font-medium text-white/70
                 no-underline press hover:text-white"
    >
      <span className="-ml-[6px] flex rotate-90">
        <ChevronIcon size={28} />
      </span>
      {previous ? nameOf(previous) : "Home"}
    </Link>
  );
}
