# dafod.app DNS

dafod.app is registered with Vercel and its DNS is Vercel's
(`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). The records live there and not in
this repo. This file keeps a copy of the ones we added by hand, so they can be
checked or recreated. Vercel's defaults (the apex and `*` ALIAS records and the
CAA records) are left out.

| Name | Type | Value | Why |
| --- | --- | --- | --- |
| `@` | TXT | `google-site-verification=Hp2DSYtTSjevnr9z_rMvzu_EZ4OAaZCOXxPGA1hMPQg` | Google Search Console: proves we own dafod.app |

## The Google verification record

Added on 2026-10-22. It makes dafod.app a verified Domain property in Google
Search Console, under olalekanisaaccb@gmail.com. Google's OAuth brand
verification depends on it: the "Dafod" name and logo on Google's sign-in
screen are shown only while dafod.app, the consent screen's one authorised
domain, stays verified.

**Do not delete it.** Google re-checks it from time to time. If the record is
gone, the domain is un-verified, and Google can stop showing the Dafod name
and logo on its sign-in screen.

To check it:

```bash
dig +short TXT dafod.app
vercel dns ls dafod.app
```

To recreate it:

```bash
vercel dns add dafod.app @ TXT "google-site-verification=Hp2DSYtTSjevnr9z_rMvzu_EZ4OAaZCOXxPGA1hMPQg"
```
