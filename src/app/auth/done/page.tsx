"use client";

import AuthReturn from "../AuthReturn";
import { supabase } from "@/lib/supabase";

/*
 * Where Apple's sign-in comes back to when it ran in a new tab (lib/auth.ts
 * signIn). Supabase returns here with a one-time ?code=, which its client
 * trades for a session on load (detectSessionInUrl, PKCE, the verifier in
 * localStorage that the opening tab wrote). getSession waits for that.
 */
async function finishAppleSignIn(): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("Sign-in is not configured.");
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) throw error ?? new Error("No session.");
  return "/";
}

export default function AppleReturnPage() {
  return <AuthReturn finish={finishAppleSignIn} />;
}
