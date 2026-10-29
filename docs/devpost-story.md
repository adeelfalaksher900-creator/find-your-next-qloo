## The problem

Choosing what to watch, read or play means moving between disconnected catalogs. Choosing a game with friends adds another step: finding common ground. Find Your Next brings chosen interests, catalog search and Qloo-powered discovery into one workspace.

## What you can do

Search TV and anime through TVmaze, books through Open Library and PC game offers through CheapShark. Save titles and build an interest profile. In Together, two to four people can compare entered games and see exact titles in common. Optional playtimes show the shortest duration; the app does not check calendars or ownership.

The latest source adds collection search, alphabetical sorting and remembered grid/list layouts in an iOS-inspired interface. Optional private cloud collections synchronize interests and saved titles using a recovery key, with browser encryption and revision-checked merges. The dedicated Supabase backend is active and passed live tests through a local copy of the app in two isolated browser profiles. This frontend refresh has not yet been released on the public Vercel URL. The existing public frontend supports manual JSON download/import; those files are unencrypted and exclude game-night entries.

## Where Qloo fits

The discovery workflow sends up to four selected interests to our server, resolves them to unambiguous Qloo entities and requests related entities in another category. A favorite game can lead to books or artists. Where Qloo returns explanation data, the interface shows which named interests contributed. Together can combine one game from each person as input. Suggestions are associations, not a guarantee that everyone will like them or that an item is available.

**Current production limitation:** bounded private tests returned real Qloo results and an earlier public anime-to-games request succeeded. Subsequent public requests, including the latest October 29 check, returned HTTP 503 from the quota protection layer. The public Qloo journey is not yet reliable. The owner authorized a protected Preview, followed by Production after successful live checks; deployment access is being completed before diagnosis and release. We do not present the project as submission-ready while this core failure remains.

## How we built it

HTML, CSS and JavaScript provide the interface. Node.js serverless functions on Vercel fetch catalogs and Qloo data; the Qloo key stays on the server. A private shared quota record reserves calls before a workflow. Exact name matching and TVmaze release years help distinguish entities; ambiguous matches remain unresolved instead of being guessed.

For optional cloud collections, Web Crypto generates a high-entropy sync key and derives separate identifiers, access credentials and an AES-GCM encryption key. Supabase stores the encrypted envelope, revision and counters. Browser roles cannot read the tables or call the private RPC. Anyone holding the complete sync key can access or delete the collection; there is no email recovery. Local browser data and manual downloads remain plaintext. Game-night entries stay on the device.

The source passes 57 automated tests. Browser emulation covered search, saving, manual transfer, group matching, cloud sync and failure/retry behavior. Thirty-four automated accessibility states reported no detected violations; some dialog contrast checks remain incomplete. These checks do not replace physical-phone, VoiceOver/NVDA or independent penetration testing. Recommendation quality and user impact have not been measured.

## Challenges and what we learned

Identical titles can refer to different works. Year-aware matching helps, and the app reports unresolved inputs when it cannot disambiguate them. Catalog search is kept distinct from Qloo associations so ordinary search results are never described as personalized recommendations.

Cloud synchronization also needs clear conflict behavior: offline additions combine, removals of previously synchronized items win over concurrent retention, and a stale revision is retried without silently overwriting another device. Tests cover incorrect keys, authenticated-encryption tampering, access denial and stale edits. These are bounded engineering checks, not proof against every attack.

Next we need to resolve the public quota error, re-test repeated live Qloo journeys, release the tested frontend and validate the group experience with real users and assistive technology. Event pages suggest places and artists; they do not provide verified schedules, tickets or reservations.

## Team and sources

Adeel Falak Sher and Raouf Khalid.

Catalog and artwork sources: [TVmaze](https://www.tvmaze.com/api), [Open Library](https://openlibrary.org/developers/api) and [CheapShark](https://apidocs.cheapshark.com/). Taste connections use [Qloo](https://docs.qloo.com/). The interest illustration uses the MIT-licensed Anatomy kit; attribution is in the repository. The implemented collection layout follows list/grid patterns reviewed on Mobbin, using original app branding and assets.

[Open the app](https://find-your-next-qloo.vercel.app/) · [Source code and setup](https://github.com/adeelfalaksher900-creator/find-your-next-qloo) · [Testing details](https://github.com/adeelfalaksher900-creator/find-your-next-qloo/blob/main/docs/validation.md)
