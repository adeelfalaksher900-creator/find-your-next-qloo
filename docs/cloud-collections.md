# Encrypted cloud collections

Implemented October 29, 2026. The dedicated Supabase project is active. Live backend and browser tests passed; the refreshed Vercel frontend is now deployed to Production. The production proxy also passed an encrypted two-client-state check with synthetic data and cleanup.

## Use

Open Saved, select Create cloud collection, then copy the sync key privately. On another device, open Saved and connect with that key. No email, password or account creation is needed. Anyone holding the key can access or delete the collection. There is no recovery service: keep the key and a separate collection backup. Clearing site data removes the remembered connection, not the cloud copy.

Interests and saved titles synchronize. Game-night entries, layout/search preferences and Qloo query selections stay on each device. Local items remain when disconnecting or deleting a cloud copy. Manual downloads are plaintext JSON and should be kept private.

## Data and authorization

The browser generates 32 random bytes with Web Crypto. HKDF-SHA-256 derives three separate values: a public collection identifier, an access token and a non-extractable AES-GCM-256 key. Each encryption uses a new random 96-bit IV and authenticates the collection ID as additional data. The complete sync key is never placed in a URL or sent to the backend.

The same-origin Vercel proxy accepts only a fixed Supabase Edge Function URL, a 64-character hex ID and a derived access token in an Authorization header. It forwards the capability in a dedicated header, never a URL parameter. The Edge Function stores a SHA-256 hash of the derived token. Supabase stores the encrypted envelope, revision, timestamps and request counters. It never receives the plaintext titles or encryption key. The hosting services can still observe request metadata.

The Edge Function uses automatic server secrets to call the private database RPC. Both tables have RLS enabled, with no browser-role policies and no anonymous/authenticated grants. Only service_role can execute the RPC. Supabase's two informational [“RLS Enabled No Policy” notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) are intentional deny-by-default tables; no warning/error-level security advisor was returned. Do not add public SELECT policies to silence them.

This protects stored cloud content from being read without its key. It does not protect a compromised browser, malicious JavaScript running on the app origin, a shared browser profile or someone who obtains the key. Local browser items and the remembered connection are not encrypted at rest by the app.

## Merge and limits

The client reads the latest encrypted revision, decrypts it, merges changes against the last synchronized base, and writes only if that revision is still current. A conflict causes a bounded re-read/retry. Offline additions from both devices combine; removing an item present in the shared base wins over keeping it. Concurrent metadata edits to the same ID prefer the local copy. An overflowing merge fails visibly and preserves local data; items are not silently truncated.

Each list holds 60 entries, plaintext encryption input is limited to 200 KB, the encrypted envelope to 270 KB, and request bodies to 280 KB. The server permits at most 240 authenticated operations per collection per fixed hour, 100 new collections per UTC day, and 500 stored collections. These are free-tier safeguards, not a complete denial-of-service defense. There is no automatic expiry; the holder can delete a collection with its key. Server backups, if configured by the host, follow the host's retention settings.

## Reproduce on another Supabase project

1. Apply `supabase/schema.sql` to a new, dedicated project. It creates the private tables and RPC; do not run it blindly over unrelated existing tables.
2. Deploy `supabase/functions/collection-sync/index.ts` as `collection-sync` with gateway JWT verification disabled. The function validates the high-entropy collection capability itself; it does not rely on the public API key for user authorization. The function uses automatic `SUPABASE_SECRET_KEYS` or legacy server-role secrets in its own environment, never values sent by a browser.
3. Set `COLLECTION_SYNC_URL=https://<project-ref>.supabase.co/functions/v1/collection-sync` and the project's publishable key as `SUPABASE_PUBLISHABLE_KEY` in Preview and Production. Never use a secret/service-role key in the Vercel configuration. Deploy the frontend normally.
4. Run `npm test`. Explicitly opt into `FYN_CLOUD_LIVE=yes npm run verify:cloud` using the private environment configuration. The script touches only the synthetic record it creates and cleans it up in a finally block.
5. For the real cloud UI check, use the optional browser dependencies described in the README, export the cloud settings and `FYN_CLOUD_BROWSER_LIVE=yes`, then run `npm run test:ui`. Local catalog fixtures and disabled Qloo avoid provider quota consumption. The live sync check uses two isolated browser contexts, not two physical phones.

No service-role key, sync key, access token or user collection belongs in source control, screenshots, reports or logs.
