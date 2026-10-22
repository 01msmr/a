# Plan: bar position setting and compact bar on narrow tablets

Status: implemented, merged into `main` and pushed (2026-10-22); the bar hint, the `p`/`b` keys and `js/hint.js` were added on top (see `CHANGELOG.md`); the ghost header and strip shadow check (Part 1, item 7) was done by hand (fine at all positions); the iPad device checks are open. Rulings: the class sits on `<html>` (the head script runs before `<body>` exists); `COMPACT_QUERY` is the old device-width phone query OR the new branch, so large phones in landscape keep the strip; the strip re-measures through its existing `ResizeObserver`, no extra listener; bounds decided: 350 px, every touch tablet in portrait.

## Goal

1. New setting `navPos`: the bar sits at the bottom or at the top, available on all devices. The default depends on the device: bottom for the compact bar (phones, portrait and narrow tablets), top on desktop and full-width tablets (as today).
2. The phone bar (strip) is also used on tablets in portrait and in narrow tablet windows (iPad Split View, Slide Over).

## What the code does today

- `.title` is the bar. Desktop/iPad: sticky first child of `div.app-frame` (flex column), so it is at the top. Phone (device width 350–812 px): `position: fixed; bottom: 0` with `padding-bottom: env(safe-area-inset-bottom)` (`base.css`, "Smartphone combined"), and `.container` has 50px bottom padding.
- `strip.css` replaces the chips by the strip on phones; the gate is device width 350–812 px plus `(hover: none)`. `js/strip.js` does not use `isPhone()`.
- `isPhone()` (`js/touch.js`, `PHONE_QUERY`) gates glow pages, tail snap, ghost header and swipe navigation. That is page layout, not the bar.
- `js/grid.js` measures the bar when it is `position: fixed` and sets `container.style.paddingBottom` to its height.
- `settingsPlace()` (`js/settings.js`) opens the overlay upward or downward by the gear position, so it follows the bar without changes.
- Device-width media queries are repeated in `base.css` (4 blocks), `strip.css` and `touch.js`.

## Part 1: `navPos`

1. Test first (`tools/*.test.js`, `tools/page-env.js`): without a stored value no class is set (the default comes from CSS per layout); `setPref('navPos', 'top')` sets `body.nav-top` and `'bottom'` sets `body.nav-bottom`; the value survives a reload; `effectiveNavPos()` returns the stored value, otherwise `bottom` while the compact query matches and `top` otherwise.
2. `js/prefs.js`: `PREF_DEFAULTS.navPos = 'auto'` (nothing stored); `applyPrefs()` sets `nav-top` or `nav-bottom` only for a stored value, so the defaults stay pure CSS. Add `effectiveNavPos()`: the stored value, else `bottom` while the compact query matches and `top` otherwise. Add a one-liner to the inline head scripts in `index.html` that sets the class before first paint (no flash). Update the "Defines globals" header line if it changes.
3. `js/settings.js`: new `SETTINGS` entry after Navigation, label `Bar`, values `bottom`/`top`; `get` returns `effectiveNavPos()`, `set` stores the explicit value, so the first click flips whatever the device shows now. Call `settingsDisplay()` again when the compact query flips (rotation, Split View), because an unstored default changes then.
   - Text mode: `text: { bottom: 'bot', top: 'top' }`.
   - Icon mode: `icons: { bottom: ['fa-arrow-down', 'fa-minus'], top: ['fa-minus', 'fa-arrow-up'] }`, drawn by the existing `set-stack` branch of `drawIcon`: an arrow against a horizontal line. `fa-arrow-down-to-line` and `fa-arrow-up-to-line` are not in the self-hosted Font Awesome (checked), hence the two-glyph stack.
   - The icon shows the current value, like the other settings; check the `.set-stack` sizes in `settings.css`.
4. Desktop and full-width tablets (no compact bar), `base.css`: without a class nothing changes, the bar stays at the top. `body.nav-bottom .title { order: 1 }` puts it below the container in the flex column of `div.app-frame`; `nav-top` is the default there.
5. Phone CSS (later the compact-bar block of Part 2): `body.nav-top .title { top: 0; bottom: auto; padding: env(safe-area-inset-top, 0px) 0 0 }`, and swap the `.container` padding (50px moves from bottom to top).
6. `js/grid.js`: when the bar is fixed and `body.nav-top` is set, use `paddingTop` instead of `paddingBottom` and clear the other one (the desktop bar is a flex child and needs no padding).
7. Check that the ghost header and `.ghost-header.bottom` do not collide with a bar at the top (compact) or at the bottom (desktop), and the same for the strip edge shadows.

## Part 2: compact bar on portrait and narrow tablets

Cause: every phone rule keys on `device-width` (the screen), so a narrowed iPad window never gets the strip. A portrait iPad is split by screen size: the narrow ones (iPad mini, 744 px) already match the phone block, the wider ones (810–1024 px) get the full chip row of the iPad block.

1. Add a second branch to the bar queries: `only screen and (min-width: 350px) and (hover: none) and ((orientation: portrait) or (max-width: 812px))`. Touch only, so a narrowed desktop window keeps the chips. A tablet in portrait gets the strip at any width; in landscape at full width it keeps the chip row, and in landscape Split View at 812 px or less it gets the strip through the width branch. Leave `PHONE_QUERY` and `isPhone()` device-based: the page layout and gestures stay tuned for iOS phones, so a portrait tablet keeps the tablet page layout with the phone bar.
2. Move the bar-only rules out of the device-width phone blocks into one "compact bar" block with the combined query: fixed `.title`, safe-area padding, scrollbar hiding, item padding and height, hidden chips, transparent `.nav-btn` borders, `column-gap`. The container's reserve for the fixed bar (50px bottom padding, top with `nav-top`) moves along, because it follows the bar and not the device. Other page-layout rules (sections, tiles, snap) stay where they are.
3. The iPad block (813–1024 px: `.title` padding, chip font size, `.titledomain`) stays for tablets with a pointer (`hover: hover`). The compact block comes after it and sets `.title` padding, item sizes and `.titledomain` itself, so nothing from the iPad block leaks in.
4. `strip.css`: same combined query.
5. `js/strip.js`: make sure it lays out again when the compact condition flips (width crossing 812 px, rotation); add a `matchMedia` change listener on the compact query if it only measures at load.
6. Compact mode on a tablet combines with Part 1: both bar positions need the safe-area handling from Part 1.

## Checks

- `npm run check`, `npm run browser`; CSS and layout by hand.
- Real devices (touch behavior cannot be seen by `tools/smoke.js`): iPhone portrait/landscape unchanged; iPad portrait (mini 744, 820, 11" 834, 12.9" 1024) and landscape, Split View at 1/3 and 1/2, Slide Over, rotating while the page is open; with and without keyboard/trackpad (`hover` value); both bar positions on every layout, the desktop included.
- Docs: `docs/reference.md` (settings list), `CHANGELOG.md`; `npm run bump` once at the end of the session.

## Order

Part 1 on the phone → Part 1 on the desktop (`order`) → Part 2 (bar rules into the compact block, so `navPos` also works on tablets) → checks and docs.

## Open decisions

- Decided: the setting is available on all devices; the default is top on desktop and full-width tablets, bottom on the compact bar.
- One stored value per device applies to the compact and the wide layout alike (an iPad that is rotated keeps it), or one stored value per layout class. Plan: one value, simpler.
- Lower bound of compact mode: 350 px like the phone, so Slide Over (about 320 px) keeps the wide layout, or lower it.
- Upper bound for portrait: every touch iPad, or only up to about 834 px; on the 12.9" the strip may look sparse across 1024 px.
