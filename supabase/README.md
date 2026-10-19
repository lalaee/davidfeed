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
4. **Google.** Google Cloud console → APIs & Services → Credentials → OAuth
   client ID, type Web application. Authorized JavaScript origin
   `https://www.dafod.app`; authorized redirect URI
   `https://<ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret
   into Supabase → Authentication → Sign In / Providers → Google.
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
   ```
   then redeploy — `NEXT_PUBLIC_` values are baked in at build time.
