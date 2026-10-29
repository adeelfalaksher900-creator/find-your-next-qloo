# Devpost draft — work in progress; do not submit

- **Project:** Find Your Next
- **Tagline:** Find your next favorite and common ground with friends.
- **Public application:** https://find-your-next-qloo.vercel.app/
- **Public repository:** https://github.com/adeelfalaksher900-creator/find-your-next-qloo
- **Project start:** October 28, 2026, based on the first local commit.
- **Team:** Adeel Falak Sher and Raouf Khalid. Individual roles require confirmation before they are described.
- **Submission status:** Not submitted. The Devpost project page was unintentionally made public while saving details; page visibility and contest-submission status are separate.

## Inspiration

Finding something to watch, read, or play often means searching separate catalogs. Choosing a game with friends adds another problem: people need to know what they all want to play. Find Your Next brings those starting points together and lets people build a list of interests they choose to share.

## What it does today

Visitors can search anime and television titles from TVmaze, books from Open Library, and PC game offers from CheapShark. They can save results, add interests manually, and keep their collection on their current device. They can download an unencrypted collection file and import it on another device; the import keeps existing items. It does not sync automatically or include game-night entries. Friends can enter games for two to four people and see titles in common. When everyone enters a playtime, the app shows the shortest duration; people still need to choose a time and verify ownership, platform and game duration themselves.

These are catalog results and simple title matches, not Qloo recommendations. PC game prices are in USD and can change. Anime coverage is limited to the shows TVmaze labels as anime.

## How Qloo is used

The server-side discovery workflow resolves up to four selected interests to unambiguous Qloo entities, requests related results across categories, and shows which named interests contributed when Qloo returns explainability data. For example, a game can lead to books or artists rather than only the same genre. TVmaze premiere years help distinguish shows with the same title. The Together workflow can combine one game per person as input; it does not predict whether every person will like a result. Results are associations, not promises about availability or suitability.

**Production reliability is unresolved.** Real Qloo responses were verified in bounded private checks, and one public anime-to-games browser request succeeded. Subsequent public group and single-interest requests returned 503 from the quota guard. Do not describe this as a reliably working end-to-end integration until the production failure is fixed and retested. Recommendation quality and broad catalog coverage have not been measured.

## How it was built

The interface uses browser-native JavaScript and responsive CSS. Interests, saved items and group inputs use browser local storage. A portable JSON file can move interests and saved items manually; there is no account or automatic sync. Serverless Node.js endpoints on Vercel fetch the public catalogs; the Qloo adapter keeps the key on the server and has bounded input and upstream timeouts. A private, conditional-write Blob record reserves a shared application quota before Qloo calls. The interface identifies each source. The four-slot Anatomy illustration reflects the number of selected interests, not a predicted taste score.

## Challenges and lessons

Identical names can refer to different things, so the Qloo adapter is designed to reject ambiguous exact matches rather than guess. External catalog records and prices may be incomplete or change. Game titles matched by case- and punctuation-insensitive comparison are only a starting point: the same title might exist on different platforms or editions. Browser storage keeps onboarding simple; a manually exported file can provide a copy, but there are no shared accounts or automatic backup.

## Accomplishments and next steps

The site supports real catalog searches and a local group-comparison flow. Automated tests cover input validation, provider failure handling, matching, selection limits, request ordering and simulated Qloo responses. Desktop checks covered real searches; mobile-browser emulation covered touch interactions with controlled catalog responses. User impact and recommendation quality have not been measured.

Before judging, diagnose and fix the production quota-guard failures, test Qloo calls end-to-end on the public site, test on real mobile devices and with screen readers, and publish the complete source with its MIT license in a public repository. Validate at least one concrete use case with real users and ensure suggestions offer useful next actions. Event schedules, tickets, gift inventory and creator availability need separate authorized sources and are not currently verified.

## Reproducible checks for reviewers

1. On the live site, search TV shows for “Breaking Bad,” books for “Dune,” or PC games for “Portal 2.” Results come from the named catalog, not from Qloo.
2. Add a result to interests, save it, reload the page, and open Saved. The data is stored in that browser. Download the collection there and import it in another browser to transfer it manually.
3. Under Together, enter “Minecraft, Portal 2” for one person and “Portal 2, Stardew Valley” for the other. The app identifies Portal 2 as common; optional durations are not a calendar.
4. For You requests Qloo suggestions, but the production quota guard has recently returned 503 and requires repair before this step can be relied on.

## Required custom answers

- When did you begin your project? **October 28, 2026** (first local commit date).
- Public URL to project: **https://find-your-next-qloo.vercel.app/**
- Public repository URL: **pending**; do not invent one.
- Existing-project upgrade question: not applicable if the project was started during this hackathon; verify against team history before answering.

No final submission is authorized. The demo video is optional under the current rules; the separate 15-image gallery and video remain outside this phase.
