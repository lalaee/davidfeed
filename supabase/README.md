# Accounts and the Library

Saving films, saving verses and highlighting need a signed-in reader. Sign-in is
Supabase Auth with Apple and Google; each reader's Library is one row in the
`library` table (`migrations/`), protected by row-level security. The client
code is `src/lib/auth.ts`, `src/lib/supabase.ts` and `src/components/AuthSheet.tsx`.

## Local

```bash
open -a Docker
supabase start -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,supavisor,realtime,postgres-meta
```

`.env.local` needs `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY=<the Publishable key supabase start prints>`.
Apple and Google do not work locally; the save/sync flow can be tested with a
user created through the local admin API.

## Production, once

1. **Project.** Create one at supabase.com. From Project Settings → API, take
   the Project URL and the anon / publishable key (never the service-role or
   secret key).
2. **Table.** `supabase login`, `supabase link --project-ref <ref>`,
   `supabase db push` — or paste the migration into the SQL editor.
3. **URLs.** Authentication → URL Configuration: Site URL
   `https://www.dafod.app`; Redirect URLs `https://www.dafod.app/**` and
   `https://dafod.app/**`.
4. **Google.** Google Cloud project `dafod-512122` → Google Auth Platform →
   Clients → OAuth client "Dafod web" (Web application). Authorized JavaScript
   origins `https://www.dafod.app` and `https://dafod.app`; redirect URIs
   `https://www.dafod.app/auth/google` and `https://dafod.app/auth/google`.
   The site's own button sends the reader to Google for an ID token, which
   comes back to `/auth/google` and is handed to Supabase
   (`src/lib/googleSignIn.ts`). That way Google names dafod.app, not
   supabase.co, and supabase.co never becomes an authorised domain, which
   would fail Google's brand verification. Never add the Supabase callback
   here. Paste the client ID and secret into Supabase → Authentication
   → Sign In / Providers → Google, and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. **Apple.** Apple Developer → Certificates, IDs & Profiles:
   - an App ID with Sign in with Apple enabled (the iOS app's will do);
   - a Services ID (this is the web client ID), Sign in with Apple enabled,
     domain `<ref>.supabase.co`, return URL
     `https://<ref>.supabase.co/auth/v1/callback`;
   - a Sign in with Apple key (.p8), noting its Key ID and your Team ID.
   In Supabase → Providers → Apple, enter the Services ID and the secret
   generated from the .p8 (Supabase's Apple guide links the generator).
   **The secret expires after six months** and has to be regenerated.
6. **Vercel.**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
   ```
   then redeploy — `NEXT_PUBLIC_` values are baked in at build time.
