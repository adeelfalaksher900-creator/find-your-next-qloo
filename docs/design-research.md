# Design research and review notes

The redesigned shell draws on the navigation and layout principles in [Apple's Human Interface Guidelines: Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Search Fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) and [Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), plus discovery patterns observed in [Mobbin](https://mobbin.com/) and [Dribbble's content-discovery examples](https://dribbble.com/search/content-discovery). These sources inform hierarchy, labeled navigation, reachable search and content-first layouts; their designs and assets are not copied.

The home page prioritizes a working search, the user's actual interest count, entry points to real categories, and live catalog results. The four-slot Anatomy instrument represents only the number of selected favorites and never a Qloo score. It can be regenerated with `node scripts/build-instrument.mjs`; see `docs/anatomy.md`.

Existing Qloo entrants such as [Taste Gifts](https://devpost.com/software/taste-gifts) and [MustPlay Scout](https://devpost.com/software/mustplay-scout) already provide sophisticated cross-domain recommendations. A polished interface alone does not establish originality or a winning submission. The hypothesis here is to make a shared interest profile and group decision practical across use cases; this still requires Qloo integration, evidence and user testing.

The generated instrument was inspected offline, and the revised interface was checked in desktop and mobile browser emulation. See [validation notes](validation.md) for the tested paths. Real-device, screen-reader, animation-performance and live Qloo verification remain outstanding.

## Implemented iOS collection layout, October 29

The latest source implements the collection patterns reviewed in [Apple Books list view](https://mobbin.com/screens/dc014d55-b73a-4a39-918e-718e2684326e) and [Apple Books grid view](https://mobbin.com/screens/54a8ead6-8a3e-4860-bcfb-35322a35463e): a large serif heading, quiet surface, a floating labeled tab bar, and working grid/list collection controls. Search and alphabetical sorting work on the visitor's saved data. The layout choice persists on the same device. The app uses its own name, icons, colors and artwork rather than Apple branding or third-party screenshot assets.

The hero was reviewed against [HBO Max's content-led hero](https://mobbin.com/sites/sections/305702e6-1b67-4c2d-8e14-83373e5ecb32). Find Your Next keeps its actual catalog offer and search as the focus. No subscription, partnership or recommendation score is invented. Phone-sized TVmaze thumbnails prefer the medium cover even on high-density displays; larger surfaces can use the original. A compact, original SVG provides an explicit missing-artwork state.

The 1536 × 1024 project thumbnail was generated with the built-in image tool and uploaded to Devpost. It is graphic branding, not evidence of a live product flow. The website itself does not load that bitmap. The optimized README version is about 67 KB.

This source refresh has been tested locally. Optional encrypted cloud collection controls also passed live backend tests. It has not been released to the production website: the owner approved Preview then Production after live checks, but the API Preview target mismatch requires CLI device authorization before deployment.
