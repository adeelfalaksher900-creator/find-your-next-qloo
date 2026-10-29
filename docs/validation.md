# Find Your Next: release validation

**Reviewed:** October 30, 2026 (Pakistan). **Public website:** https://find-your-next-qloo.vercel.app/ . This is a bounded engineering review, not an accessibility or security certification.

## Release and actual API evidence

The frontend is released to Production. Final deployment: `dpl_EN1uf6ezWvUiM4mskgVrEYNGjk6K`. The owner-approved release followed protected Preview checks; no public diagnostic endpoint or deployment-protection bypass was added.

- On the public website, Portal 2 → books returned **24 real Qloo entities** with per-interest explanation data. Portal 2 + Minecraft → games returned **24 real entities**. Before Production, the candidate returned **48 books** for Portal 2 and the hardened Preview returned **24 destinations** for Radiohead. These are actual UI requests using the configured server-side key, not catalog fixtures or the configuration flag alone. They do not measure recommendation quality or every supported input combination.
- The earlier 503 reproduced in Preview as the fixed log code `quota_contention`. The adapter had reused the HTTP GET ETag representation for a storage conditional write. It now obtains the write validator from `head()`, verifies its version against the uncached body, and retries only genuine revision conflicts. Transport quoting/weak prefixes are normalized only for comparison; the storage validator is passed unchanged to `put()`. Counters, limits and the private quota record were preserved. The key was never read or printed.
- The actual game source page returned 24 offers representing **13 unique games**. Earlier, seven unique cards lost their covers because the GamersGate image host was absent from the app allowlist. After the targeted fix, **all 13 Preview cards loaded optimized images**, with zero missing-artwork tiles in that tested page.
- Open Library live checks returned 24 records on each of pages 0 and 1 with source-reported total and next-page metadata. TVmaze returned two real matches for One Piece; the app does not fill this finite set with unrelated titles. Game offers are de-duplicated, so page size is not a guaranteed number of distinct games. The live CheapShark request worked from the deployed Preview; separate cloud-shell Node requests timed out. This difference is retained rather than described as a universal provider outage.
- The deployed Vercel collection proxy completed encrypted create, second-client restore and cross-client removal using two isolated client states. The synthetic cloud copy was deleted and local interests remained. The dedicated database had zero collection records after cleanup. Earlier browser tests connected two isolated browser profiles to the real Supabase backend through a local copy of the proxy. A separate headless Production-browser attempt was blocked by this test environment's proxy certificate trust; certificate checks were not disabled. No physical-device result is claimed.

## Verification

| Area | Observed result | Scope and limit |
| --- | --- | --- |
| Node tests | **70 passed**, zero failures | Includes actual raster conversion, host/path/redirect/stream limits, provider paging, selection bounds, platform parser failures, quotas, crypto/tampering, conflicts, HTTP and cloud admission. |
| Browser journeys | Search, save/reload/remove, manual transfer, grid/list/filter/sort, source retry, group matching and simulated Qloo flows passed | Controlled provider responses; separate live requests are listed above. |
| New interaction checks | Pagination keeps existing results on failure, retries and de-duplicates; valid compact covers remain; collection type filters work; carriage actually animates and reduced motion cancels it | Source fixtures and generated SVG geometry; no invented provider artwork. |
| Responsive layout | **48 route/width combinations**, no document horizontal overflow: six routes at 320, 360, 390, 430, 768, 1024, 1440 and 1920 CSS px | Browser resizing, not a real phone or mobile Safari test. |
| Accessibility automation | **34 states**, zero detected axe-core 4.14.0 WCAG-tagged violations | Three states included incomplete contrast checks (one brand-text check and two desktop dialog states). Actual VoiceOver/NVDA and a full manual audit remain unverified. |
| Dependency audit | Online production audit: zero known vulnerabilities | Includes the pinned Sharp dependency; a registry result at test time, not proof of no vulnerabilities. |
| Local load smoke | 600 requests, 20 workers, zero unexpected responses; p95 132.68 ms | One local process with no provider calls, not production capacity. |
| Production negative probes | **30 live checks passed**, including source/credential-file exposure, malformed/oversized JSON, methods, result-count limits, capability admission, image-proxy SSRF admission, cross-origin preflight and security headers | Bounded owner-authorized script; no valid Qloo request or user record is used by the security smoke script. |
| Database | RLS on, browser roles cannot read tables or execute private RPC; only two intentional no-policy INFO notices | [Supabase linter explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). No broad public policies were added. |

The initial live negative probe found malformed JSON producing a 500 through Vercel's body-parser getter. Both discovery and collection admission now catch that platform exception and return safe 400 responses; regression tests reproduce a throwing getter. Invalid inputs cannot reach the provider path. The final live smoke run passed all 30 checks, including malformed JSON returning 400.

## Artwork, caching and motion

Compact TVmaze artwork measured **28,852 bytes** versus **660,465 bytes** for the original of the same source cover, about 95.6% fewer bytes. The production artwork endpoint returned `image/webp`; a tested asset was 10,166 bytes and the second response reported a CDN `HIT`. End-to-end shell timings were dominated by this environment's network latency, so no universal millisecond speedup is claimed. Cold loads still depend on the source and network; subsequent eligible requests can use the site CDN and browser cache.

Artwork admission is shared by producer and browser. The optimizer accepts only fixed catalog hosts and image paths, revalidates redirects, limits input bytes and pixels, bounds concurrency/cache memory, and preserves aspect ratio without enlargement. Direct source fallback remains. A title tile identifies truly absent/unloadable artwork rather than inventing a cover.

The MIT Anatomy geometry now has independent pad/carriage layers and actual selection transitions, bounded pointer tilt, visibility cleanup and reduced-motion behavior. The automated browser check observed a running carriage animation and the correct nonzero static position with reduced motion.

## Mobbin and REA

The implementation uses the reviewed [Apple Books collection filter/list pattern](https://mobbin.com/screens/d1ddc1d5-8b37-47a6-b03d-c75409076be7), with original branding and working controls. [Design notes](design-research.md).

REA was executed on the connected Windows device against the actual public book page. Its partial runtime capture observed the twelve-card earlier release. That attempt failed on a non-unique wait selector and reported unconfirmed cleanup; no successful complete REA capture is claimed. No matching owned Chrome process remained in the subsequent process check; unrelated profiles were not removed and no further REA browser was launched. Diagnosis and completed verification above also use source inspection, private fixed-code logs, actual browser interactions and independent tests; those are not mislabeled as REA results.

## Remaining limits

Physical phones, actual VoiceOver/NVDA, an independent comprehensive penetration test, and real-user recommendation-quality studies were not completed. The user explicitly accepted viewport resizing as the responsive check. Functional release, security probes and automation do not establish accessibility compliance or a winning probability. The cloud recovery key grants collection access and has no email recovery; see [cloud collections](cloud-collections.md).

The public GitHub repository and Devpost text describe the released behavior. The 3:2 thumbnail already exists; the separate 15-image gallery and video remain deferred. Final hackathon submission requires the owner's explicit rules/eligibility agreement. No such agreement was attested on the owner's behalf.
