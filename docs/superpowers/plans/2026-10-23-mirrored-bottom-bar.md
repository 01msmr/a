# Plan: mirrored layout for the bottom bar on desktop (idea, not started)

Status: investigated 2026-10-23, nothing built. Decision pending: prototype or drop.

## Idea

On desktop with `navPos = bottom` (today `.nav-bottom .title { order: 1 }` only moves the bar under the content; sections still run first to last from top to bottom and snap with `start` at the top edge), mirror top mode:

- Sections run first to last from **bottom to top**: the first section is flush above the bar.
- The active section snaps to the **bar-side (bottom) edge** (`scroll-snap-align: end`).
- The section title sits **below** its tile group (mirror of the heading right under the bar in top mode), so it stays next to the bar even for a tall section.
- Ghost-header copies stick to the bottom edge (the stack is already specified for both edges).

## Why not a smaller variant

Natural order plus end-snap does not work: sections 1, 2, … cannot reach the bottom edge without a viewport-high spacer above the content, which shows as a void at the start of the page. Only the reversed order is a consistent mirror (the spacer moves from the end to the top, where it only shows once the last sections are active, as in top mode).

## For

- The bar, the title and the snap edge are on one side, for every section; the bottom bar becomes a real counterpart of top mode.
- Reach: landing position and controls in the same zone for people who chose the bottom bar.
- Ghost headers and hints already handle both edges; `body.docked` already removes the gap between bar and docked heading.

## Against / open

- Reading goes upward between sections and downward inside them; a page opened from the first link looks inverted compared with other start pages.
- Chips order in the bar needs a decision (in order: mismatches the page direction; reversed: differs from top mode and the phone strip).
- Arrow keys, `jumpBy`, `b`/`p`, tab order and wheel direction must be audited so none silently inverts.
- The title becomes a caption; glow window and `.covered` / `.covered-bottom` assume the heading is the first row.
- Edit mode (drag handle "Move section", rename) moves with the heading; the edit layout needs its own check.
- Not mirrored on purpose: tile rows inside a group (reversing them fights tab and arrow order).

## Implementation notes

- No `flex-direction: column-reverse` on `#container`: it gives negative `scrollTop`, while `glow.js`, `light.js`, `cursor.js`, `ghost-header.js`, `touch.js` assume positive values. Reverse the data order in `render()` and scroll to the bottom at start.
- `column-reverse` inside each `section` (title below the group) does not touch `scrollTop`.
- Mirror: `section { scroll-snap-align: end }`, the `#container::after` spacer to the top, the glow window / tail snap / hover light / `grid.js` offsets (all assume a start edge), `edit.js` ordering.
- Desktop only; the compact bar (phones, iPad) stays unchanged, so no iOS tuning is touched. `tools/smoke.js` cannot see the interplay: check by hand in the browser.
- Estimate: about six files with snap and measure logic, medium to large, high regression risk for glow and ghost headers.

## Proposed first step (if taken up)

A prototype behind a hidden `navPos` value (for example `bottom-mirrored`), desktop only, chips order unchanged, to judge the title-below layout and the reading direction on screen before touching shared glow and ghost-header code.
