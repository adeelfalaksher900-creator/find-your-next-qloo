# Find Your Next: testing and judging review

**Review date:** October 28, 2026.

**Production site:** https://find-your-next-qloo.vercel.app/

**Scope:** The product, its public integrations and the later Qloo checks described below. This is an engineering review, not a formal accessibility or security certification.

## October 29: collection and image follow-up

- Added an explicit manual collection export and import. The JSON file includes interests and saved items, excludes game-night entries, is not encrypted, and does not provide automatic synchronization. Import validates the version and size, keeps current items, rejects unsafe source/image URLs and limits each list to 60 entries. No user account or server-side profile was added.
- In isolated 390 × 844 Chromium touch-emulation browser profiles, downloaded a collection, imported it into a separate profile, reloaded and confirmed the saved item remained. Invalid JSON preserved the existing collection. A hostile title rendered as text and a `javascript:` source and unapproved image host were rejected. These were controlled tests, not tests on two physical devices or a complete penetration test.
- A responsive image change selects TVmaze's medium portrait only when the displayed width and pixel ratio allow it; otherwise the original is used. For one actual One Piece cover, the provider's medium image was 210 × 295 pixels and 28,852 bytes; the original was 660,465 bytes. A Chromium test at 390 CSS pixels selected medium at DPR 1 and original at DPR 2, preserving the tested image's pixel density. Other covers and network conditions will vary.
- 45 Node tests passed. An online `npm audit --omit=dev` on the isolated test copy reported zero known vulnerabilities. The mobile browser fixture suite passed the collection, navigation, group, error and simulated Qloo journeys. Axe-core found no violations in 20 tested route states at 390 and 1440 CSS pixels; home and privacy-dialog checks still included incomplete items needing manual review. VoiceOver, NVDA, mobile Safari and physical phones remain untested.
- A standard preview and production deployment reached READY without a build-command override or quota diagnostic. On the public URL, a fresh Chromium touch-emulation session searched the real TVmaze catalog for One Piece, saved it, downloaded the collection, imported it into an isolated second browser profile and verified persistence after reload. A separate group comparison found a shared title. The tested page emitted no uncaught page errors. The smoke test did not call Qloo; the earlier production 503 remains unresolved. A deployment-specific error/fatal log count immediately afterward returned no groups. A public repository still needs to be created.

## October 29: Qloo integration follow-up

The owner configured a Qloo event key as a sensitive Vercel environment variable for production and preview. No key value was read, logged or committed. A private, build-only verification used real Qloo responses; the application was subsequently deployed with a private Blob-backed quota guard.

- **Production blocker:** In a 390 × 844 Chromium touch-emulation session, searching TVmaze for One Piece (1999), adding it to interests and asking Qloo for games returned suggestions. A later group request and a separate single-interest request both returned HTTP 503 with the quota guard's unavailable message. The underlying production failure is unresolved; do not describe the Qloo journey as consistently working or submission-ready.
- **Private live checks:** Fixed public examples returned 12 Qloo results each for Portal 2 to books, Portal 2 plus Minecraft to games, One Piece (1999) to games, Radiohead to destinations and Portal 2 to places filtered to Lahore. Most target types returned results for Portal 2, but the destination query with that game was rejected by Qloo as an invalid signal. Radiohead, Spirited Away and Nintendo each returned destination results in separate checks. This is limited coverage, not an assessment of recommendation quality.
- **Disambiguation:** Qloo search returned two exact One Piece titles with 1999 and 2023 release years. The app now carries TVmaze premiere year to the server and uses it to avoid selecting the wrong version. If a year is missing or does not match, the app does not guess.
- **Group flow:** The Together page can send the first game for each of two to four people as combined Qloo signals and can link to PC-price search. It does not measure individual satisfaction or guarantee that everyone likes a result. Mobile tests of this interface used simulated Qloo responses; the real private-build group request succeeded, while the public browser group request failed as described above.
- **Quota guard:** The private store uses consistent reads and conditional writes. A real-store concurrency check accepted three of eight parallel requests under a six-call limit. Unit tests also cover budget reservation, hourly limits, concurrency and fail-closed errors. The guard's production 503s still require diagnosis; the budgets cover only this app and do not prevent denial-of-service or account for other Qloo usage.
- **Accessibility and security:** At 390 and 1440 CSS pixels, axe-core 4.14.0 found zero violations in ten tested states at each width, including simulated group and personal results. Home and privacy dialog checks had incomplete results requiring manual review. REA inspected the mobile group accessibility tree. VoiceOver, NVDA and real phones were not tested. A dependency audit initially found four high-severity findings; a patched dependency override was applied and the subsequent online `npm audit --omit=dev` reported zero findings. Automated audits and limited injection/redirect checks are not a complete penetration test.
- **Load smoke test:** A local single-process run sent 600 requests with 20 concurrent workers, with zero unexpected responses and a p95 of 66.01 ms. It did not call Qloo or other providers and does not establish public capacity.
- **Review limitation:** Automatic security review rejected a proposed diagnostic deployment because it would read and mutate the private quota store and could disrupt the live service. A later read-only preview diagnostic was also rejected because changing the build command on the existing Vercel project could have unclear production impact. Only store-level metadata was inspected; no private quota-content diagnostic was run after those rejections.

The sections below preserve earlier results and describe the state at the time of each earlier review.

## Latest integration and testing follow-up

- A server-side live check now requires explicit opt-in, uses one fixed interest, makes at most two Qloo calls and prints only counts or sanitized errors. It has **not** been run against an issued key. The key reported by the owner as received has not yet been configured in this project.
- The adapter now ignores malformed or duplicate provider entities, and the discovery endpoint rejects content types other than JSON. Regression tests cover both fixes; 34 Node tests passed.
- Qloo book and TV suggestions now offer a search in the corresponding existing catalog. The links search by title and do not assert that an exact match or availability exists. The Qloo results region announces updates; a responsive action layout groups buttons on small screens.
- A 390 × 844 Chromium touch-emulation scenario used **simulated** Qloo responses to exercise an interest, a book result, a TV result, catalog navigation, a rate-limit message and keyboard-accessible status. The result area was checked for horizontal overflow at 320 and 390 CSS pixels. The remaining mobile checks used simulated catalog responses. No live Qloo recommendation was tested.
- Axe-core 4.14.0 reported zero detected violations across nine states at 390 and 1440 CSS pixels, including the simulated Qloo result. The home screen had one incomplete check and the privacy dialog had two incomplete checks at each size. REA inspected a fresh accessibility tree for the live site's game-night workflow. Neither action operated a screen reader or establishes accessibility compliance.
- A bounded local load run completed 600 requests with 20 concurrent workers and no unexpected responses. The single-process test excluded external providers and cannot predict real production capacity or Qloo quota behavior.
- The existing security checks include malformed requests, invalid provider output, a local HTML-injection probe and a synthetic-key redirect test. This is not a full penetration test. The public Qloo proxy remains disabled pending a shared rate limit and global quota protection.
- Vercel reported the follow-up deployment ready. A fresh 390 × 844 Chromium touch-emulation session verified real TVmaze search, saving, game-night matching and the privacy dialog at the production URL, and confirmed that Qloo remained disabled. The served JavaScript contained the new catalog actions; those actions were exercised only with simulated Qloo responses.

## October 29 follow-up

- **Design:** Reworked the home hero and navigation spacing; added two labeled examples using actual TVmaze and Open Library records and covers, and a multi-column footer with working product and source links. The images are catalog artwork, not personalized Qloo output. Feature data is rendered as soon as the catalog response arrives; the browser no longer preloads six large hero candidates.
- **Mobile interaction:** On a 390 × 844 Chromium touch-emulation context, tested search, save, reload, removal, group validation, adding/removing a person, privacy dialog, retry after an interrupted catalog request and navigation focus. Catalog responses were controlled fixtures. Also checked the anime, book and TV routes, the nine disabled Qloo modes, and document overflow at 320, 390, 768, 1024 and 1440 CSS pixels. A separate real-source check returned TVmaze and Open Library results. REA captured the group accessibility tree on the original production deployment. Real phones, mobile Safari and VoiceOver were not tested.
- **Accessibility:** Axe-core 4.14.0 ran WCAG-tagged rules against six routes, a populated interest state and the privacy dialog at 390 and 1440 CSS pixels, using controlled catalog data. Initial contrast and visible-label/accessibility-name mismatches were fixed; the rerun reported zero detected violations in those states. Some checks were marked incomplete for decorative icon contrast and the dialog overlay/close symbol and require manual review. The skip-to-content link now preserves the current SPA route; an automated keyboard regression covers it. A real screen reader was not operated.
- **Security:** A local redirect test demonstrated that the prior Qloo client could forward a custom API-key header to a redirect destination. Redirects now fail closed, and the test confirms the recipient receives no request. The test used a synthetic key; no live Qloo key was involved. Local probes also checked sensitive/traversal-like paths, malformed requests and an inert HTML injection payload in the browser. This is a bounded review, not a comprehensive penetration test. Public catalog endpoints still lack a shared rate limit; Qloo must remain disabled until shared rate/quota protections are available.
- **Load:** One local run of `node scripts/load-check.mjs` completed 600 requests with 20 concurrent workers, zero unexpected responses, 232.6 requests/second, and p95 236.4 ms. This is a single-process smoke test on one machine, with no external provider calls, and does not predict production capacity or reliability.
- **Automated tests:** 33 Node tests passed; an online `npm audit --omit=dev` reported zero vulnerabilities for the production lockfile, which has no third-party runtime dependencies. The browser and axe scripts are included for reproduction. Neither audit nor tests prove the app secure or fully accessible.
- **Production verification:** The updated Vercel production deployment reached READY. On a fresh Chromium touch-emulation context, a real TVmaze anime search, save, saved view, group match and privacy dialog worked; the status endpoint confirmed Qloo remains disabled. Live TVmaze and Open Library example artwork and a CheapShark game hero loaded in the test browser. A short deployment-specific runtime-log query returned no error/fatal entries. This does not establish long-term uptime or real-device behavior.

The original October 28 findings below are retained as historical evidence; the mobile and test counts there describe that earlier review.

## What is deployed

The frontend is browser-native JavaScript, HTML and CSS. The backend consists of Node.js serverless endpoints on Vercel. TVmaze supplies anime/TV search, Open Library supplies book records/covers, and CheapShark supplies PC-game offers and source links. The Qloo adapter is server-side but disabled on production; it has not made verified live Qloo calls.

Interests, saved items and group inputs are stored in browser local storage on the same device. There is no PostgreSQL database, Supabase backend, account system, server-side user profile, cross-device sync, or row-level security in this version. A browser user can lose these lists by clearing site data, changing devices, or using private browsing; people sharing the same browser profile can see the same local lists.

## Test results

| Area | Evidence from this review | Result / limit |
| --- | --- | --- |
| Automated suite | `npm test`: 29 passing Node tests | Covers core matching and validation, controlled provider failures, local HTTP endpoints and simulated Qloo responses. It is not an exhaustive test of all UI states. |
| Catalogs | Desktop browser: One Piece (anime), Portal 2 (PC deals), Dune (books), Breaking Bad (TV) | Actual named provider results appeared. Images may be unavailable and deal prices change. |
| Interests and saved items | Added a catalog item, saved it, reloaded, viewed the saved item, removed it; manually added an artist; checked a one-character and duplicate entry | Expected state and feedback appeared in the tested desktop browser. |
| Game night | Tested empty input, shared titles, invalid zero minutes, valid 90/60-minute inputs, and adding/removing people up to four | After the fix, zero is rejected and the result says the shortest entered duration is 60 minutes. Calendar overlap and ownership are not inferred. |
| Taste selection | Selected and deselected interests, including five selections; visited nine category pages | The interface reports the four-interest limit. Qloo search remains disabled and was not live-tested. |
| Privacy dialog | Opened Sources & privacy and dismissed with Escape | Source and local-storage explanations were visible; this is not a screen-reader audit. |
| Mobile | Inspected a fresh 390 × 844 browser screenshot of the home page | The top bar, stacked hero and bottom navigation were visible. Mobile taps, other mobile screens, real-device rendering and orientation were not tested. |
| Security checks | Input bounds, malformed JSON, HTTP methods, upstream errors, host restrictions and failed-closed Qloo status covered in tests; production security headers inspected | `npm audit --omit=dev --offline` reported zero vulnerabilities. No full penetration test, dependency registry scan, distributed load test or formal privacy review was performed. |
| Latest production deployment | Vercel reported READY and the changed game-night and saved-item controls were checked in a desktop browser | The live site reports Qloo discovery as not configured. |

## Fixes made during the review

1. The group planner previously claimed to find an overlapping time from durations alone. It now reports the shortest entered playtime and asks people to choose a time. An invalid duration now receives a visible message.
2. Catalog results from a slower previous search can no longer overwrite a newer search in the same result area. The ordering guard has a controlled asynchronous unit test; the race was identified by code review rather than reproduced against the live providers.
3. Qloo configuration checks fail closed after a bounded timeout instead of waiting indefinitely for the initial status request. The test uses simulated responses and an aborted request.
4. Catalog action buttons have title-specific accessible names, source links disclose a new tab, and touch targets have been increased. The game-price action uses the returned item category rather than a dropdown that may have changed during a request. The Qloo result action itself awaits real-key testing.
5. Provider errors, malformed/oversized requests, partial Qloo matches, location parameters and selection boundaries have additional tests. A local Devpost story was rewritten to distinguish current functionality from planned Qloo behavior.

## Hackathon readiness against the judging criteria

The official rules require a working Qloo-integrated agentic tool, a publicly hosted working application, an accessible public source repository with an identifiable open-source license, and an accurate description. Entries must remain available for judges through the judging period. The four stated criteria are equally weighted after a preliminary viability check. [Official rules](https://qloo.devpost.com/rules); [Qloo Insights documentation](https://github.com/qloo/docs-public/blob/main/reference/insights-api-deep-dive.md).

| Criterion | Current evidence | What still matters |
| --- | --- | --- |
| Technological implementation | Server-side adapter resolves exact names, requests insights and returns explainability only where supplied in simulated tests. | No event key is configured; real search/insights, explainability shape, failure behavior and results have not been verified. A shared rate limit and global quota budget are needed before exposing the Qloo proxy publicly. |
| Design | Desktop flows work, sources are labeled and unavailable functionality is disclosed. A mobile home-page screenshot showed the responsive shell. | Test the other mobile screens, keyboard-only navigation, screen readers, contrast, loading/error recovery and real-device performance. Many category links currently lead to an unavailable Qloo flow. |
| Potential impact | Searching multiple catalog types and comparing entered game lists are usable now. | No user study, measured outcome or demonstrated improvement exists. Test a concrete decision journey with real users; compare task success with a simple non-Qloo baseline. |
| Quality of idea | Cross-category discovery and a group flow offer a direction. | Cross-category gifting and game discovery already exist, including [Taste Gifts](https://devpost.com/software/taste-gifts) and [MustPlay Scout](https://devpost.com/software/mustplay-scout). Their descriptions are competitor claims, not independently verified performance. A more distinctive group-taste workflow needs real Qloo data and user testing. |

**Priority product hypothesis:** Let each friend contribute a few favorites, retrieve Qloo candidates per person, and show a group shortlist with reasons and an explicit way to reject a suggestion. Compare ranks or another documented aggregation method carefully; do not present Qloo affinities as a shared probability or claim fairness without evidence. This is a proposed next step, not an implemented feature.

**Other gaps:** Event/meetup pages do not provide verified event listings or tickets. Gift pages do not verify product stock or budget. Creator pages do not establish audience overlap or willingness to collaborate. Destination pages do not verify hours or booking. The current planner cannot compare calendar times. Recommendation output for non-game categories needs actionable source links and real-response testing.

## Devpost and release status

The project text and one thumbnail are present. Devpost reports the project page as public because it was unintentionally published during an earlier save; its Qloo hackathon entry has no submitted date. The required start date and app URL are known, but the public-repository field cannot be completed honestly until a repository is created. The refreshed submission text is in `docs/submission-draft.md` and has not been posted over the public project page during this review.

No final entry was submitted, and the 15-image gallery and video phase was not started. The code includes an MIT license, but no public repository exists yet and its license is therefore not visible to judges.

## Remaining checks

- Obtain the event key securely; verify allowed use and lifetime, implement shared rate/quota protection, and run the full real Qloo journey without exposing the key.
- Create the authorized public repository with all code, tests, source attribution and the detectable license; protect the default branch where the available account plan allows.
- Test network timeouts and retry interactions in a browser, all main flows on actual mobile devices, keyboard focus order, screen readers, contrast and performance under realistic load.
- Validate the intended group use case with real people and record observations without inventing impact or treating a few tests as proof of broad demand.
- Enter the remaining Devpost custom fields, review the accurate submission and wait for explicit authorization before final submission.
