import type { Metadata } from "next";

import Library from "@/components/Library";

export const metadata: Metadata = {
  title: "You — Dafod",
};

/* The account centre: your account, what you saved, and the rest. The
   component keeps its old name, Library, because Saved is still most of it. */
export default function YouPage() {
  return (
    <main className="h-[100dvh] bg-black">
      <Library />
    </main>
  );
}
