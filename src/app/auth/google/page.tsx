"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { finishGoogleSignIn } from "@/lib/googleSignIn";

/*
 * Where Google sends the reader back to, with an ID token in the address's
 * fragment (lib/googleSignIn.ts). It trades the token for a session and
 * returns them to the page they signed in from, where the save they tapped is
 * applied. Seen for a moment at most; if anything went wrong it says so and
 * offers the way home.
 */
export default function GoogleCallbackPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    finishGoogleSignIn()
      .then((returnTo) => window.location.replace(returnTo))
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="flex h-[100dvh] flex-col items-center justify-center gap-[24px] bg-black px-[24px] text-center">
      <p className="text-[18px] font-normal leading-[27px]" style={{ color: "#999999" }}>
        {failed ? "Signing in with Google didn't go through." : "Signing you in…"}
      </p>
      {failed && (
        <Link
          href="/"
          className="rounded-[19.25px] bg-white px-[16px] py-[8px] text-[17px] font-semibold leading-[22px]
                     text-[#0E0E0E] no-underline press"
        >
          Back to Dafod
        </Link>
      )}
    </main>
  );
}
