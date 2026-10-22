"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trailStore } from "@/lib/uiStore";

/* Records each page the reader visits, so a page can offer the way back to
   the one before it (BackLink). Renders nothing. */
export default function RouteTrail() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) trailStore.visit(pathname);
  }, [pathname]);
  return null;
}
