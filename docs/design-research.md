# Design research and review notes

The redesigned shell draws on the navigation and layout principles in [Apple's Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Search Fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) and [Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), plus discovery patterns observed in [Mobbin](https://mobbin.com/) and [Dribbble's content-discovery examples](https://dribbble.com/search/content-discovery). These sources inform hierarchy, labeled navigation, reachable search and content-first layouts; their designs and assets are not copied.

The home page prioritizes a working search, the user's actual interest count, entry points to real categories, and live catalog results. The four-slot Anatomy instrument represents only the number of selected favorites and never a Qloo score. It can be regenerated with `node scripts/build-instrument.mjs`; see `docs/anatomy.md`.

Existing Qloo entrants such as [Taste Gifts](https://devpost.com/software/taste-gifts) and [MustPlay Scout](https://devpost.com/software/mustplay-scout) already provide sophisticated cross-domain recommendations. A polished interface alone does not establish originality or a winning submission. The hypothesis here is to make a shared interest profile and group decision practical across use cases; this still requires Qloo integration, evidence and user testing.

The generated instrument was inspected offline, and the revised interface was checked in desktop and mobile browser emulation. See [validation notes](validation.md) for the tested paths. Real-device, screen-reader, animation-performance and live Qloo verification remain outstanding.
