import type { Metadata } from "next";

import { SavedLibrary } from "@/components/Library";

export const metadata: Metadata = {
  title: "Saved — Dafod",
};

/* What the reader saved: opened from its row on You (Account). */
export default function SavedPage() {
  return (
    <main className="h-[100dvh] bg-black">
      <SavedLibrary />
    </main>
  );
}
