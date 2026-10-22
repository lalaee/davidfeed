"use client";

import AuthReturn from "../AuthReturn";
import { finishGoogleSignIn } from "@/lib/googleSignIn";

/*
 * Where Google sends the reader back to, with an ID token in the address's
 * fragment (lib/googleSignIn.ts). It trades the token for a session; then
 * AuthReturn closes the tab, or goes back to the page the reader came from.
 */
export default function GoogleCallbackPage() {
  return <AuthReturn finish={finishGoogleSignIn} />;
}
