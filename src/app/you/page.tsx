import type { Metadata } from "next";

import Library from "@/components/Library";

export const metadata: Metadata = {
  title: "You — Dafod",
};

/* The account centre: who you are, and rows for Saved (its own page, at
   /you/saved), privacy and the account. The component keeps its old name,
   Library, from when this page was the saved grid. */
export default function YouPage() {
  return (
    <main className="h-[100dvh] bg-black">
      <Library />
    </main>
  );
}
