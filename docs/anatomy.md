# Interest selection instrument

The Anatomy Figure is a small tabletop counter: a sliding carriage and four raised indicator pads show how many favorites are selected for a Qloo search. Its readout comes from the actual checkbox count, capped visually at four; the text reports an invalid count if the user selects more. It represents the number of selected items, not a taste score or the identities of the favorites.

Parts: base slab; inset outline; four two-part feet; four corner screws; raised control panel; four panel screws; four switch housings; four keycaps; four recessed outlines; eight keycap fasteners; lower rail platform; rail; five scale ticks; two end stops; four end-stop screws; sliding carriage; carriage outline; two carriage fasteners. The selected keycaps and carriage are the visual focus.

`scripts/build-instrument.mjs` generates five SVG states with identifiable pad/carriage groups using the vendored Anatomy isometric kit. Its license is in `scripts/vendor/ANATOMY-LICENSE`. The browser interface supplies accessible checkboxes and a text readout; no fabricated Qloo values are shown.

`public/instrument.js` mounts the shared SVG geometry and animates real layers, while `public/instrument.css` owns paint and motion preferences. The controller is disposed on route teardown. Reduced motion retains the correct selected position without animation.
