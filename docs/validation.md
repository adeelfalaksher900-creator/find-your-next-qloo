# Find Your Next: current validation

**Reviewed:** October 29, 2026. **Production:** https://find-your-next-qloo.vercel.app/ . This report separates the active backend, tested source and earlier public frontend. It is an engineering review, not an accessibility or security certification.

## Release status

The public frontend still serves the earlier Vercel release. A fresh Portal 2 → books production request returned HTTP 503 from the quota guard in this review. The error remains unresolved; no successful repeatable public Qloo journey is claimed.

The owner explicitly approved a protected Preview deployment of `17c1484`, followed by Production only after successful live checks. The API's documented default Preview request was rejected by automatic approval review because the target was considered ambiguous; the explicit `preview` target then passed review but was rejected by Vercel's API with HTTP 400. The official CLI supports an explicit Preview target and requires a separate device authorization. No new Vercel deployment or protection bypass was created. The newer cloud source described below builds on that tested commit and is prepared for review.

The dedicated free Supabase project was successfully created after the owner freed a slot. The `collection-sync` function and private SQL schema are active. Preview and Production environment configuration now points to it; existing deployments do not automatically receive new environment values.

## Checks completed

| Area | Observed result | Limit |
| --- | --- | --- |
| Node suite | 57 passing tests | Matching, providers, HTTP, quotas, encryption, merge, offline recovery, conflicts and proxy validation; not every possible state. |
| Core browser journeys | Chromium 153 touch emulation, 390 × 844: search, save/reload/remove, grid/list, filter/sort, manual import/export in independent profiles, group matching, validation, retry, navigation and keyboard skip link passed | Controlled catalogs/Qloo responses; physical hardware was not used. |
| Cloud backend, live | Created/read/updated one synthetic encrypted collection; wrong token denied, stale write/delete returned conflict, malformed envelope rejected, anonymous table/RPC access denied | The verifier deletes only its own record; no user content is inspected. |
| Cloud browser, live | Two isolated profiles connected with a private key; additions/removals synchronized; reload persisted; deleting cloud copy retained local items; key reveal/hide and invalid-key feedback worked | Local frontend/proxy with real Supabase, not the unreleased public Vercel frontend or two physical devices. |
| Cloud failure handling | Controlled offline/error/retry UI, capacity conflicts, tampered ciphertext, incorrect encryption key and failed connection storage tested | Does not establish resilience to every network or browser failure. |
| Accessibility automation | 34 states across 390 and 1440 px reported zero detected axe-core 4.14.0 WCAG-tagged violations, including connected/error/revealed-key cloud states | Privacy-dialog contrast included incomplete checks requiring manual assessment. No actual NVDA/VoiceOver audit. |
| Responsive layout | No document overflow at 320, 390, 768, 1024 and 1440 px in tested journeys; cloud UI at 390 px passed | Not a mobile Safari, orientation or physical-phone result. |
| Dependency audit | Online `npm audit --omit=dev`: zero known vulnerabilities | Registry result at review time, not proof that dependencies are vulnerability-free. |
| Local load smoke | 600 requests, 20 workers, zero unexpected responses; p95 32.42 ms | One local process, no providers; not production capacity. |
| Live HTTP probes | Source paths, package.json, .env and .git/config returned 404; invalid catalog kind returned 400; CSP, nosniff, referrer policy and HSTS were present | Small bounded probe set, not comprehensive penetration testing. |
| Database access | RLS enabled; anon/authenticated cannot SELECT collection tables or execute collection RPC; security advisor had only two intentional no-policy INFO notices; performance advisor returned no notices | Supabase and service-role administrators remain trusted. |

Cloud uses browser AES-GCM encryption, independent HKDF-derived identifier/access/encryption values and revision-checked writes. The complete recovery key never enters a request URL or backend. Deleting the cloud copy keeps local items; disconnecting keeps both copies. There is no email recovery. See [cloud collections](cloud-collections.md) for the exact trust boundaries and limits.

## Existing Qloo evidence and safeguards

Earlier bounded private live checks returned real Qloo results for Portal 2 → books, Portal 2 + Minecraft → games, One Piece (1999) → games, Radiohead → destinations and a Lahore place filter. An earlier public anime-to-games request also succeeded. Later public requests failed; private successes do not establish current production health or recommendation quality.

A read-only dashboard inspection found the private quota record present, correctly shaped and below daily/lifetime limits. Its visitor hashes and contents were not copied into this report. The source logs only fixed quota phase codes to locate failures after deployment; it never logs keys, bodies, addresses or quota contents. A Vercel-only fallback accepts the platform-overwritten forwarded-address header; ordinary local requests cannot use it. Invalid primary headers fail closed.

The Blob adapter reads uncached, bounds streamed records and conditionally writes the exact revision. It recognizes actual SDK conflict classes; only conditional conflicts retry. Provider quota is reserved before calls and is not refunded after partial failure. No quota record reset, budget increase, secret decryption or firewall/protection weakening was performed.

## Design and submission

The source implements the Mobbin-reviewed Apple Books list/grid interaction patterns: working collection layouts, search/sort, large serif headings and labeled mobile tabs. Original branding, icons, colors and SVG missing artwork are used. Phone thumbnails select compact TVmaze artwork; larger surfaces can request originals. [Design references](design-research.md).

The public GitHub repository contains an MIT license, source, tests and setup instructions. The Devpost story distinguishes the current frontend from the tested source/backend. The 3:2 project thumbnail is already uploaded. The 15-image gallery and video remain deferred at the owner's request. No final contest submission has been made.

## Outstanding evidence

- Authorize the CLI device session, deploy a protected Preview, locate and resolve the production quota failure using private fixed-code logs, and verify repeated live single/group Qloo requests. Release Production only after those checks pass, then repeat public smoke checks.
- Test real phones and actual assistive technology. The connected Windows device had zero authorized Android devices and no NVDA binary at the standard install paths or command lookup. VoiceOver/iOS hardware was unavailable. Those checks remain pending, not passed.
- Comprehensive penetration testing and independent accessibility/user studies are not completed. Existing tests are bounded engineering/security probes; no user impact, recommendation-quality or winning-probability claim is made.
- Complete the Devpost eligibility/rules agreement with the owner before final submission. The start-date answer should account for Devpost project creation on October 27 and the first local code commit on October 28, rather than silently treating a commit as the start of all project activity.
