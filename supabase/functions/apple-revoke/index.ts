// Revokes a reader's Sign in with Apple authorization when they delete their
// account in the iOS app (Apple: apps using Sign in with Apple should revoke
// the user's tokens with the REST API on account deletion).
//
// The app gets a fresh authorization code from Apple when the reader confirms
// the deletion and posts it here, signed in (the caller's Supabase JWT is
// checked by the platform: verify_jwt). This trades the code for a refresh
// token at appleid.apple.com/auth/token and revokes it at /auth/revoke. Both
// need a client secret: an ES256 JWT for client_id com.davidfeed.ios, signed
// here, per call, with the Sign in with Apple key -- so it never expires.
//
// Secrets (Supabase > Edge Functions > Secrets, or `supabase secrets set`):
//   APPLE_P8      the contents of AuthKey_SV82W38GAF.p8 (PEM, PKCS#8)
//   APPLE_KEY_ID  SV82W38GAF   (optional; this is the default)
//   APPLE_TEAM_ID LZ7G2KT2U7   (optional; this is the default)
//
// Deploy: supabase functions deploy apple-revoke --project-ref ulmptivzgvcpbygpkkfv

const CLIENT_ID = "com.davidfeed.ios";
const TEAM_ID = Deno.env.get("APPLE_TEAM_ID") ?? "LZ7G2KT2U7";
const KEY_ID = Deno.env.get("APPLE_KEY_ID") ?? "SV82W38GAF";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const text = (s: string) => new TextEncoder().encode(s);

async function clientSecret(pem: string): Promise<string> {
  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(text(JSON.stringify({ alg: "ES256", kid: KEY_ID })));
  const body = b64url(text(JSON.stringify({
    iss: TEAM_ID, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: CLIENT_ID,
  })));
  // WebCrypto's ECDSA signature is already r||s (IEEE P1363), which JWS wants.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, text(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

async function apple(path: string, form: Record<string, string>) {
  const res = await fetch(`https://appleid.apple.com/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* revoke answers with an empty body */ }
  return { ok: res.ok, status: res.status, data };
}

/*
 * The caller must be a signed-in reader, not merely the holder of the public
 * anon key. verify_jwt has already checked the token's signature, but the anon
 * key is itself a valid JWT (role "anon"), so the role is checked here too.
 * The signature being verified upstream is what makes reading the payload
 * without re-verifying it safe.
 */
function signedInUser(req: Request): string | null {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    return claims.role === "authenticated" && typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!signedInUser(req)) return json({ error: "sign in first" }, 401);
  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code) return json({ error: "missing code" }, 400);
  const p8 = Deno.env.get("APPLE_P8");
  if (!p8) return json({ error: "APPLE_P8 is not set" }, 500);

  const secret = await clientSecret(p8);
  const token = await apple("token", {
    client_id: CLIENT_ID, client_secret: secret, code, grant_type: "authorization_code",
  });
  const refresh = token.data.refresh_token;
  if (!token.ok || typeof refresh !== "string") {
    return json({ error: "exchange failed", apple: token.data.error ?? token.status }, 502);
  }
  const revoked = await apple("revoke", {
    client_id: CLIENT_ID, client_secret: secret, token: refresh, token_type_hint: "refresh_token",
  });
  if (!revoked.ok) return json({ error: "revoke failed", apple: revoked.data.error ?? revoked.status }, 502);
  return json({ revoked: true });
});
