# Find Your Next: release validation

**Reviewed:** October 30, 2026 (Pakistan). **Public website:** https://find-your-next-qloo.vercel.app/ . This is a bounded engineering review, not an accessibility or security certification.

## Release and actual API evidence

The frontend is released to Production. Functional-release deployment: `dpl_EN1uf6ezWvUiM4mskgVrEYNGjk6K`. The later initial-readiness notice fix is released as `dpl_FUAeFBdifd2ZwDZeTgssdLSZJsRk` (source commit `0620d92749e0b873f77f50b1a54e3bdb9a79f081`). The owner-approved release followed protected Preview checks; no public diagnostic endpoint or deployment-protection bypass was added.

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

The public GitHub repository and Devpost text describe the released behavior. The 3:2 thumbnail remains uploaded. All 15 captioned gallery images are uploaded in order and their public CDN URLs returned HTTP 200. The 1080p walkthrough is delivered separately for the owner to upload to YouTube. Final hackathon submission requires the owner's explicit rules/eligibility agreement. No such agreement was attested on the owner's behalf.

## October 30 media delivery and readiness follow-up

The gallery has 15 actual captures, positions 1–15, with captions under 140 characters. The public Devpost page visibly showed 15 gallery tabs; all 15 public gallery image URLs returned HTTP 200. The story now includes a short try-it guide and a recording disclosure; Devpost version 9. The project remains unsubmitted and the video URL is unset, as requested.

The delivered MP4 is H.264/yuv420p at 1920 × 1080, 30 fps, 6,375 video frames, with stereo AAC/48 kHz sound. Container duration is 212.6 seconds (about 3:33), size 26,340,222 bytes. Hyperframes 0.8.220 rendered the film frame by frame. The entire encoded file decoded without errors; no full-black interval was reported. Fourteen decoded frames, scene sheets, phone-size sheets and transition strips were inspected. Final audio measured −16.04 LUFS integrated and −1.12 dBTP; sound was measured, not independently listened to. Sentence captions use measured generated-audio timing, and an English SRT is included. No music or paid generation was used.

The film is an actual browser interaction recording of the released frontend with real Production API responses, captured locally through a TLS-validating proxy because the isolated recording browser could not trust this environment's HTTPS proxy certificate. Certificate validation was not disabled. The original app.js bytes matched the then-deployed release. Two recording requests returned 24 Qloo books for Portal 2 and 24 Qloo games for Portal 2 + Minecraft. Loading waits are edited and some actions are retimed for reading. Empty/absent artwork is not replaced with invented covers. The narrow viewport is browser emulation, not a physical phone. Hypit's directing and capture guidance was applied; its VON runtime was offline, so no Hypit application execution is claimed. Rendering used Hyperframes and free local Kokoro narration.

Review caught an independent initial-readiness message bug: Home and a fresh Together route could retain an unavailable message before the configured check completed. They now say Checking while pending and hide the notice when ready. Seventy Node tests and six isolated delayed-readiness browser journeys passed; typed inputs remained intact and the unconfigured case still showed the notice. The protected Preview reached READY and its app.js content digest matched the tested file. A direct shell Preview request had a proxy CONNECT timeout; it was not reported as a successful browser journey. No share token or protection bypass was created. Production reached READY and both aliases were assigned. The public home and group pages were then observed clearing the notice with discovery controls enabled. Existing broader accessibility and security checks above were not rerun for this copy/visibility-only patch.

The recording was made before this final notice-label correction; the functional API journeys shown are real. Final submission-form answers are prepared for the owner, but were not saved through the logged-out browser. The connector does not expose a save-draft question-answer operation. The owner will add the YouTube URL, review dates/eligibility and submit.
