// Makes the Sign in with Apple client secret Supabase asks for: an ES256 JWT
// signed with the .p8 key. Prints it; nothing is sent anywhere.
//   node scripts/apple-secret.mjs ~/Downloads/AuthKey_SV82W38GAF.p8
// Paste the output into Supabase → Authentication → Providers → Apple →
// Secret Key (for OAuth). Apple caps it at six months; the one made on
// 2026-10-20 expires 2027-04-21. Never commit the .p8 or the output.
import { readFileSync } from "node:fs";
import { sign } from "node:crypto";

const TEAM_ID = "LZ7G2KT2U7";
const KEY_ID = "SV82W38GAF";
const SERVICES_ID = "app.dafod.web";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node apple-secret.mjs <path to AuthKey_SV82W38GAF.p8>");
  process.exit(1);
}
const key = readFileSync(path.replace(/^~/, process.env.HOME), "utf8");

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: KEY_ID };
// Apple caps the lifetime at six months (15777000 s).
const payload = { iss: TEAM_ID, iat: now, exp: now + 15777000, aud: "https://appleid.apple.com", sub: SERVICES_ID };

const data = `${b64url(header)}.${b64url(payload)}`;
const signature = sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");

console.log(`${data}.${signature}`);
console.error(`\nExpires ${new Date((now + 15777000) * 1000).toDateString()}. Regenerate before then.`);
