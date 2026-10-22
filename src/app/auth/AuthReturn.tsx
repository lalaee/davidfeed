"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/*
 * The page a sign-in comes back to, in the tab the sign-in sheet opened.
 *
 * `finish` completes the sign-in and says where this tab would go if it were
 * the only one. When the sheet opened this tab, it closes itself: the page
 * the reader was on is still open behind it, and Supabase has already handed
 * it the session. When there is no opener (the browser refused a new tab and
 * the sign-in ran in place, or the tab was opened some other way), it goes on
 * to that page instead. Seen for a moment at most.
 */
export default function AuthReturn({ finish }: { finish: () => Promise<string> }) {
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  // Once only: the token and its nonce are single-use, and a second run (dev's
  // double-mounted effect) would find them spent and report a failure.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    finish()
      .then((returnTo) => {
        if (window.opener && !window.opener.closed) {
          setState("done");
          window.close();
          return;
        }
        window.location.replace(returnTo);
      })
      .catch(() => setState("failed"));
  }, [finish]);

  const message = {
    working: "Signing you in…",
    done: "You're signed in. You can close this tab.",
    failed: "Signing in didn't go through.",
  }[state];

  return (
    <main className="flex h-[var(--app-h)] flex-col items-center justify-center gap-[24px] bg-black px-[24px] text-center">
      <p className="text-[18px] font-normal leading-[27px]" style={{ color: "#999999" }}>
        {message}
      </p>
      {state === "failed" && (
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
