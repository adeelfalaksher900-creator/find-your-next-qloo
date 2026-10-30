# Devpost draft — not submitted

- Project: Find Your Next
- Tagline: Find your next favorite and common ground with friends.
- App: https://find-your-next-qloo.vercel.app/
- Repository: https://github.com/adeelfalaksher900-creator/find-your-next-qloo
- Team: Adeel Falak Sher and Raouf Khalid; individual roles are not asserted.
- Earliest documented project activity: October 27, 2026 (Devpost creation). The first local code commit is October 28; that is not necessarily the beginning of all project activity.
- Status: public project page, Qloo entry unsubmitted. All 15 captioned gallery images are uploaded and the 1080p walkthrough is delivered for YouTube upload. The 3:2 thumbnail remains uploaded. The owner will add the YouTube URL and submit.

## The problem

Choosing what to watch, read or play means moving between disconnected catalogs. Choosing a game with friends adds another step: finding common ground. Find Your Next brings chosen interests, catalog search and Qloo-powered discovery into one workspace.

## What you can do

Search TV and anime through TVmaze, books through Open Library and PC game offers through CheapShark. Save titles and build an interest profile. In Together, two to four people can compare entered games and see exact titles in common. Optional playtimes show the shortest duration; the app does not check calendars or ownership.

The released interface includes collection search, type filters, alphabetical sorting and remembered grid/list layouts. Optional private cloud collections synchronize interests and saved titles with browser encryption and a private recovery key. Manual JSON download/import is also available; those files are unencrypted and exclude game-night entries. No email account is needed, and anyone holding the sync key can access or delete that cloud collection.

Catalogs and Qloo remain separate sources. Books and game offers have 24-record source pages and a Load more action. Game offers are combined by game, so one page can contain fewer unique cards. TVmaze returns its own finite search set. For You offers up to 12, 24 or 48 Qloo results rather than silently truncating everything to twelve.

## Where Qloo fits

The discovery workflow sends up to four selected interests to our server, resolves them to unambiguous Qloo entities and requests related entities in another category. A favorite game can lead to books or artists. Where Qloo returns explanation data, the interface shows which named interests contributed. Together can combine one game from each person as input. Suggestions are associations, not a guarantee that everyone will like them or that an item is available.

**Live verification:** the public app returned 24 book suggestions for Portal 2 and 24 game suggestions for Portal 2 + Minecraft, with Qloo explanation data. Protected Preview checks also returned 48 books for Portal 2 and 24 destinations for Radiohead. These were real requests using the server-side key, not catalog fixtures. They demonstrate the tested journeys, not universal coverage or measured recommendation quality.

## How we built it

HTML, CSS and JavaScript provide the interface. Node.js serverless functions on Vercel fetch catalogs and Qloo data; the Qloo key stays on the server. A private shared quota record reserves calls before a workflow. Exact name matching and TVmaze release years help distinguish entities; ambiguous matches remain unresolved instead of being guessed.

For optional cloud collections, Web Crypto generates a high-entropy sync key and derives separate identifiers, access credentials and an AES-GCM encryption key. Supabase stores the encrypted envelope, revision and counters. Browser roles cannot read the tables or call the private RPC. Anyone holding the complete sync key can access or delete the collection; there is no email recovery. Local browser data and manual downloads remain plaintext. Game-night entries stay on the device.

The source passes 70 automated tests. Browser emulation covered search, saving, manual transfer, group matching, cloud sync and failure/retry behavior. Thirty-four automated accessibility states reported no detected violations; three states included incomplete contrast checks. Browser resizing passed 48 route/width combinations from 320 to 1920 pixels. These checks do not replace physical-phone, VoiceOver/NVDA or independent penetration testing. Recommendation quality and user impact have not been measured.

## Challenges and what we learned

Identical titles can refer to different works. Year-aware matching helps, and the app reports unresolved inputs when it cannot disambiguate them. Catalog search is kept distinct from Qloo associations so ordinary search results are never described as personalized recommendations.

Artwork now uses the actual source record, a shared host policy and bounded WebP optimization with CDN caching. Missing game covers were traced to an omitted legitimate source host; all thirteen unique games in the tested Preview page subsequently loaded their covers. The Anatomy instrument now animates separate pad/carriage layers and respects reduced motion.

Cloud synchronization also needs clear conflict behavior: offline additions combine, removals of previously synchronized items win over concurrent retention, and a stale revision is retried without silently overwriting another device. Tests cover incorrect keys, authenticated-encryption tampering, access denial and stale edits. These are bounded engineering checks, not proof against every attack.

The production quota error was traced to conditional-write validator handling and repaired without resetting the budget or exposing the key. A live security probe also found a malformed-JSON 500; the platform parser error now becomes a safe client error with a regression test. Next we need real-user and assistive-technology studies. Event pages suggest places and artists; they do not provide verified schedules, tickets or reservations.

## Team and sources

Adeel Falak Sher and Raouf Khalid.

Catalog and artwork sources: [TVmaze](https://www.tvmaze.com/api), [Open Library](https://openlibrary.org/developers/api) and [CheapShark](https://apidocs.cheapshark.com/). Taste connections use [Qloo](https://docs.qloo.com/). The interest illustration uses the MIT-licensed Anatomy kit; attribution is in the repository. The implemented collection layout follows list/grid patterns reviewed on Mobbin, using original app branding and assets.

[Open the app](https://find-your-next-qloo.vercel.app/) · [Source code and setup](https://github.com/adeelfalaksher900-creator/find-your-next-qloo) · [Testing details](https://github.com/adeelfalaksher900-creator/find-your-next-qloo/blob/main/docs/validation.md)

## Prepared submission fields

| Field | Prepared answer |
| --- | --- |
| 28597 — project start | October 27, 2026, the earliest documented project activity; confirm against team history before submission. |
| 28598 — public app | https://find-your-next-qloo.vercel.app/ |
| 28599 — public repository | https://github.com/adeelfalaksher900-creator/find-your-next-qloo |
| 28701 — existing-project upgrades | Do not assert an answer without team history; optional field. |

The host requires a functional externally hosted Qloo application, public source with an identifiable open-source license and accurate text. Video is optional. The public core journeys now pass bounded live checks; review the recorded limits before final submission. The official starter kit and documentation are linked in judging-checklist.md. No final entry may be submitted until the owner confirms the rules/eligibility agreement.

## Media and final handoff — October 30

The 15-image gallery and captions are uploaded and publicly verified. Devpost story version 9 includes a short try-it guide. The MP4 is 1920 × 1080 / 30 fps, about 3:33, with English synthetic narration and captions; an SRT, gallery ZIP and editable Hyperframes project are provided. It contains actual interface actions and live Production API responses, not fixture results. Waiting is edited for length. The recording predates the final initial-readiness-label patch; the live app now clears that message correctly.

The chosen story follows a book search, Portal 2 → books through Qloo, a saved shortlist, and game-night comparison. Hypit's direction guidance informed the workflow; VON was offline, so the final renderer is Hyperframes. No video URL or final submission was sent. Final form answers are prepared above for the owner to review; eligibility/rules acceptance remains the owner's action. The logged-out browser and connector's lack of a save-draft answer operation prevented saving those private form answers.
