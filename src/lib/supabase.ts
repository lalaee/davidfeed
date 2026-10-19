import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * The one Supabase client, browser only.
 *
 * Every page here is prerendered and the Library is read and written from the
 * client, so there is no server half: the session lives in localStorage and
 * the database's row-level security is what keeps one reader out of another's
 * Library. The anon key is public by design — it is the policies, not the key,
 * that grant anything.
 *
 * PKCE rather than the implicit flow, so the provider hands back a one-time
 * ?code= instead of tokens in the URL fragment; detectSessionInUrl trades it
 * for a session on whatever page the reader lands back on.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (typeof window === "undefined" || !url || !key) return null;
  client ??= createClient(url, key, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
