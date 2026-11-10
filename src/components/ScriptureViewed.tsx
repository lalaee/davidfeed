"use client";

import { useEffect } from "react";

import { reportScriptureView } from "@/lib/fums";

/*
 * Reports a licensed passage rendered on the server as shown, once it is
 * (lib/fums.ts) — for a film page's NIV (FilmText). Rendered twice there, for
 * the phone and the desk; the token is reported once per page all the same.
 */
export default function ScriptureViewed({ token }: { token: string }) {
  useEffect(() => {
    reportScriptureView(token);
  }, [token]);
  return null;
}
