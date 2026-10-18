# CSS audit (2026-10-18) — report only, `styles.css` unchanged

Method: every class and id in a selector of `styles.css` (69 classes, 10 ids; comments stripped) was searched in `index.html`, `js/*.js` and `favicon/touch-icon-inline.js`. Class names built by string concatenation do not occur in the code (no `'prefix-' + x` pattern), so a plain search is reliable here.

## Unused

- `.with-t`: appears only in two selectors (`styles.css` ~1650–1651, the hover/focus rule of `.set-btn … .with-t::after`); nothing in HTML or JS ever sets it. Candidate for removal together with its rule. Check the rule body first and look at the settings buttons on desktop and iPhone afterwards.

## Duplicated declaration blocks (> 60 characters)

- `border-bottom-color: color-mix(…)` is the same in `body #container section .name.covered` and `.ghost-header .name`.
- The hover/focus style of `.set-btn` (`background-color: var(--front-body); color: var(--sect-col); outline…`) appears once for hover and once for `:focus-visible`.

Both are already written as shared or paired selectors where it matters; merging them would save a few lines and change nothing visible.

## Recommendation

Leave the file as it is, except for `.with-t` after a visual check. At 1,947 lines (about 14 KB sent as Brotli) there is no speed gain in splitting or trimming it; a split would only be for readability and is not needed now.
