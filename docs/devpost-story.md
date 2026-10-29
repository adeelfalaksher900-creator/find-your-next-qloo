## The problem

Choosing what to watch, read or play means moving between disconnected catalogs. Choosing a game with friends adds another step: finding a title that everyone has actually entered. Find Your Next gives people one place to collect favorites and start that conversation.

## What you can do

Search TV and anime through TVmaze, books through Open Library and PC game offers through CheapShark. Save titles, build a small interest profile and explore across categories. In Together, two to four people can enter games and see exact titles they have in common. When everyone supplies a playtime, the app shows the shortest duration; it does not check calendars or whether anyone owns the game.

The collection stays in the current browser. You can download interests and saved items as a JSON file and import them on another device. The file is not encrypted, does not include game-night entries, and is a manual transfer rather than automatic account sync.

## Where Qloo fits

The taste discovery workflow sends up to four selected interests to our server, resolves them to unambiguous Qloo entities and asks Qloo for related entities in another category. For example, a favorite game can be used to explore books or artists. Where Qloo returns explanation data, the interface shows which named interests contributed. The Together flow can also use one game from each participant as a combined set of signals. Suggestions are associations, not a guarantee that everyone will like them or that an item is available.

**Current limitation:** bounded private tests returned real Qloo results, and an earlier public anime-to-games request succeeded. Subsequent public requests, including a Portal 2-to-books check on October 29, returned a temporary-unavailable error from the quota protection layer. The live Qloo journey is being investigated and cannot yet be relied on end-to-end.

## How we built it

The interface uses HTML, CSS and JavaScript, with a responsive mobile layout. Node.js serverless functions on Vercel fetch catalog and Qloo data; the Qloo key stays server-side. A private shared quota record reserves provider calls before a request, and the service rejects ambiguous matches rather than silently selecting the wrong title. TVmaze release years help distinguish versions of shows with identical names.

The latest public source passes 49 automated tests covering matching, invalid input, provider errors, request ordering and quota guard behavior. It also adds collection search, sorting and grid/list controls in an iOS-inspired interface. This source refresh is tested locally and awaits deployment; the public website currently serves the earlier release. Browser-emulated mobile checks covered search, saving, manual transfer, group matching and accessibility checks. These checks do not replace testing on physical phones, real screen readers or an independent penetration test. Recommendation quality and user impact have not yet been measured.

## Challenges and what we learned

A title alone is not always enough to identify a cultural entity. For example, different versions can share the same name. We added year-aware matching for catalog shows and return an unresolved result when a match is ambiguous. We also separated catalog search from Qloo-powered associations, so a regular search is never presented as a personalized recommendation.

Next we need to resolve the production quota error, re-test repeated real Qloo journeys, validate the group discovery experience with users and test accessibility on real devices. Event pages suggest places and artists; they do not provide verified event schedules, tickets or reservations.

## Team and sources

Adeel Falak Sher and Raouf Khalid.

Catalog and artwork sources: [TVmaze](https://www.tvmaze.com/api), [Open Library](https://openlibrary.org/developers/api) and [CheapShark](https://apidocs.cheapshark.com/). Taste connections use [Qloo](https://docs.qloo.com/). The interest illustration uses the MIT-licensed Anatomy kit; attribution is in the repository.

[Open the app](https://find-your-next-qloo.vercel.app/) · [Source code and setup](https://github.com/adeelfalaksher900-creator/find-your-next-qloo) · [Testing details](https://github.com/adeelfalaksher900-creator/find-your-next-qloo/blob/main/docs/validation.md)
