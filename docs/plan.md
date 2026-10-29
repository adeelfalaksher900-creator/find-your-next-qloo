# Product and engineering plan

## Purpose

Find Your Next is a cross-category discovery workspace for people who want to act on interests they choose to share, alone or with friends. One local taste profile is reusable across anime and games, books and screen, travel, creators, gifts and event planning. Qloo is intended to connect categories; source links and data provenance must stay visible. We have not established that this product is unique, or validated its impact with users.

## User journeys

1. Browse or search actual public catalogs, inspect a result and add it to a private-on-device interests list.
2. Choose an outcome; the server resolves exact user-selected interests to Qloo entities, requests cross-category insights and reports unresolved input and provider failures. Never invent results.
3. Friends enter games they are willing to play and find common choices on their device, ignoring differences in case and punctuation. If everyone gives a playtime, the shortest duration is shown; the app does not establish calendar overlap. A future live Qloo group ranking must score the same candidate set independently per person and aggregate ranks, not compare normalized affinity numbers as if they were probabilities.
4. Gifts can be explored as games/books/brands; actual PC prices are supplied by CheapShark when available. Travel uses Qloo places and location filters. Event planning means exploring venues/artists, not claiming events or dates unless a verified event provider is connected.
5. Save and remove items, clear the local profile, navigate from desktop sidebar or mobile bottom bar.

## Boundaries

- No claims that live Qloo is operational until tested with an issued event key; no fabricated Qloo results.
- Public catalogs are separate sources, not Qloo taste matches. Provider attribution and links stay visible.
- Do not infer demographics, maturity, medical needs, pricing, real-time event tickets or collaborator availability. Ask users for constraints and make missing data explicit.
- Favorites and group names remain in local browser storage. No user accounts or shared database are required for this version; it does not sync across devices.
- API keys live on the server. The public Qloo proxy must remain disabled until there is a durable rate limit and overall quota budget. Inputs are capped and upstream hosts are fixed.

## Provider and API plan

- Qloo: search exact entity names and insights by target type; use response entity IDs and provenance. Live access is blocked on key approval.
- TVmaze: search anime and TV shows, with source links and CC BY-SA attribution. Anime results are filtered by TVmaze's own genre labels, not guaranteed comprehensive. https://www.tvmaze.com/api.
- CheapShark: live PC games/deals; USD, prices can change; use CheapShark redirect links, per https://apidocs.cheapshark.com/.
- Open Library search: books with author, publication year, cover and a source link; https://openlibrary.org/dev/docs/api/search.
- AniList was considered but not selected because its terms restrict competing anime tracking/discovery services; do not assume this use is permitted. https://docs.anilist.co/guide/terms-of-use.
- Ticketmaster requires a key. We will not invent event listings, dates or ticket availability.

## Design direction

Use a compact discovery application shell rather than a marketing splash page. Distinct dark navy navigation and cool-neutral content, clear category filters, strong headings, real covers and source labels, accessible focus states, and a five-section mobile bottom bar. Inspiration: Mobbin's search and filtering patterns, content-discovery examples on Dribbble, and Apple's guidance to use labeled tab bars for navigation. Do not copy protected layouts or images; show actual source images only.

## Verification

Test public API boundaries, input validation, provider errors, exact seed resolution, group intersection, persistence helpers and no-key behavior. Test deployed HTTP routes and live public-source integrations. Browser interaction, responsive layouts and live Qloo must be verified independently; limitations must be reported if browser access or credentials are unavailable. Keep a public MIT-licensed repository and deployment ready for judges only after all required integrations are verified.
