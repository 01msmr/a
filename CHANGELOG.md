# Changes

Newest first. One heading per working session. Older states are in
`git log`; the record starts here with the session of 25/26 July 2026.
Names in this log are the current English ones (the code was translated to English on 2026-10-17).

## 2026-10-18 — Structure, performance and AI-readiness (nothing visible changes)

- `app.js` cut into 14 files in `js/` (prefs, render, active-section, touch, glow, ghost-header, light, cursor, grid, navigation, links, settings, boot, edit), same order and same code; proven byte for byte against the old file. Each file starts with three header lines (owns, defines, uses). `index.html` loads them in order; `tools/smoke.js` and `tools/dev-router.php` read the file list from there.
- `CLAUDE.md` added (file map, rules, commands); `docs/es-modules-plan.md` (later migration).
- The iOS icon data URIs moved out of `index.html` into `favicon/touch-icon-inline.js` (synchronous script in the head, same behavior); `tools/touch-icon.js` writes there.
- Ubuntu and Font Awesome 6.7.2 self-hosted (`fonts/`, `vendor/fontawesome-6.7.2/`): no Google Fonts or cdnjs requests any more.
- Root `.htaccess`: cache headers (HTML `no-cache`, CSS/JS 1 hour, images 1 week, fonts 1 year) and 404 for files that are not part of the site (`docs/`, `tools/`, `*.md`, …). Needs "Serve static files directly by nginx" switched off in Plesk, see `docs/htaccess-setup.md`.
- Faster first load (Lighthouse mobile, simulated slow 4G, local HTTP/2 copy: score 72 -> 99, first paint 2.1 s -> 1.2 s, 332 KB -> 194 KB): small Font Awesome solid font (3 KB, the full one only loads for other icons), `links.php` and `never-dead.json` requested from the head in parallel, scripts `defer`red in the head.
- Layout shift 0.9 -> 0: the empty `#container` no longer shows its end spacer (`#container:empty::after`), and the nav row stays hidden until `render()` has set `body.rendered`.
- Settings overlay on touch devices: the words in the entries (`S`, `aut`, `col`, `text`, `chip`, `left`, `edit`) have the same size as the word `set` on the gear (23.6 px on current iPhones, before 17.8 px and 20 px). `settingsPlace()` passes the gear's size as `--set-font`; on very narrow screens (a 35 px button, 320 px phones) the words shrink to fit.
- The custom squircle is gone: the APP section and the Navigation entry in the settings use Font Awesome's `fa-square`; its CSS mask and code are removed. **The saved data must say `"icon": "fa-square"` for the APP section** (the page no longer converts the old `icon-squircle`). The unused v4-compatibility font is removed. A meta description was added.
- The Apple logo character (U+F8FF) in two link names is drawn by our own tiny font (`fonts/ubuntu-apple-logo.woff2`), so it shows on every device and not only on Apple's.
- `tools/smoke.js` also fails when a file named in `styles.css` or `index.html` is missing.
- Brand and regular icons work again: all four Font Awesome fonts are shipped; write `fa-brands fa-apple` as the section icon.
- Removed the unused generated icon set from `favicon/`; cursor and source images moved to `assets/`.
- `tools/smoke.js` also checks: no data URIs and no third-party hosts in `index.html`, one `?v=` value, a versioned Font Awesome path.

## 2026-10-17 (later) — Touch on the smartphone, ghost headers as a stack, home icon, grid, hover in a section, unreachable links, everything in English

**Touch instead of hover (iOS)**
- `body.touch` (set on `pointerdown` with a finger or pen, removed on real mouse movement): all `:hover` rules for tiles, headings, chips and buttons only apply without this class; otherwise iOS leaves `:hover` hanging after a tap. The press state (`:active`) of the chips and the iOS tap highlight are gone too. The coupled highlight (`coupleHover`) now only reacts to `pointerType === 'mouse'`; the mouse position pushed in by iOS no longer colors the chip.
- A tap acts like a click: a tap on a chip, heading, background or tile activates the section (`lockOn` on click, not on touch). A swipe over chips or headings activates nothing and releases the lock (`touchmove`).

**Sections dropdown**
- Entries are 2.75 rem tall on touch (before: the height of the gear); a tap selects immediately (`pointerup`).
- Tap, drag, release in one go opens the list and selects the entry under the finger (`touch-action: none` on the field).

**Scrolling**
- Activation also for slow swiping: catching up every 80 ms while scrolling, at the end via `scrollend` and additionally via our own stillness detection (`whenStill`, two still frames, without waiting). A section counts as active 24 px before snapping (before: 8 px).
- While swiping the glow window shows no hover state but stays at the current section (no flicker of the background); the chips lose their hover look (`html.swiping`).
- Swiping only ends when the finger is up (`fingerDown`, `touchstart`/`touchend`): if it pauses while dragging, it carries on right away without the swipe ending in between.
- **Bug fixed:** The swipe class was on the `body`; its class change triggered the re-measure (`layout()`) and disturbed the scroll coasting. Now it is on the `html`.
- **Glow window on touch tied to the scroll position (`glowScroll`):** The screen recording (stepper step) showed that the window ran on its own time and ran ahead of the scroll curve (upper rows uncovered, the window shrank, grew again in the long coasting). Now it moves between two section top edges from the frame of one to that of the next (top edge = scroll position); at the snap point it covers exactly the section. Removed are the swipe prediction (`swipePrediction`), `glowChase` and the touch duration; a tap on a section still animates with a fixed duration.
- iPhone in portrait: no `scroll-snap-stop: always`, a swipe may skip several sections; snapping happens at the end.

**Home icon (iOS)**
- New icons `favicon/ico-light-{180,192,512}.png` and `ico-dark-{180,192,512}.png`: the "a." in Ubuntu (the page's font, medium), rendered opaque (light #eee/black, dark #333/white), instead of the old grayscale PNGs with alpha that iOS showed only small or not at all. `index.html` links the light one as `apple-touch-icon` and both as `icon` with `prefers-color-scheme`; the manifest lists 180, 192 and 512 px (light). New file names, because iOS caches icons per URL. The web app mode (standalone) stays off.

**Renaming to English**
- Pointer kind: `pointerKind`, `isTouch()`, `setPointerKind()` (before `zeigerArt`, `istTouch`, `zeigerArtSetzen`); phone query `isPhone()`; swiping: `swiping`, `swipeEnd`, `fingerDown`, `whenStill` (stillness detection), `html.swiping`; pages: `buildPages`, `pageStart`, `pageIdx`, class `.page-start`; transition into the scroll window: `inScroll`, `offset`.
- Later the same day everything else followed (see "Everything in English" below).

**Smartphone: pages made of sections**
- Two consecutive half-height sections form one page (one snap point), a remaining one stays alone and gets an empty half-height section behind it (also as the last one), a larger one always starts its own page and, if taller than the screen, scrolls freely inside it. `buildPages` (in `glowMeasure`) sets `.page-start` and the filler (`margin-bottom`); the glow window still covers only one section (see below); steppers, arrows and dropdown jump from page to page (`pageStart`, `jumpBy`, `jumpTo`). No pages in edit mode.

**Smartphone: one active section**
- The glow window (the "active" highlight) always covers exactly one section: the first one on screen while scrolling, or the tapped one. On a page of two half-height sections only the upper one is active (before, the window covered the whole page; `glow.pages` is gone, `glowScroll` and `glowFrame` work on single sections again).

**Touch: transition after tapping**
- If you tap into a section and then scroll, the window jumped from the tap target to the frame of the scroll position and the bottom edge stuttered. Now the distance fades out during the transition over 280 ms (smoothstep, `f.offset` in `glowScroll`; first as an exponential decay with 110 ms, which jerked at the start).
- On touch the tile light is off (`setPointerKind` resets `lightMouse` and `mousePoint` and calls `lightReset()`; the light's `mouseover`/`mousemove` handlers ignore mouse events pushed in by iOS). Before, it stayed stuck at the touch point on the screen while the content scrolled underneath.

**Desktop: hover in a section**
- The active chip now only follows the scroll position, never the mouse (before, the chip of the section under the mouse became active, i.e. filled). If the mouse is anywhere in a non-active section (heading, background, tile), its chip shows the soft hover area as with direct hover in the nav (`.sec-hover`); the active chip stays as without hover. Removed: the `mousemove`/`mouseleave` tracking (`mousePos`). The headings themselves are unchanged.

**Smartphone and unreachable links**
- Smartphone: no ghost headers any more; the headings stay with their section and scroll out of view with it (no sticking to the edge of the view).
- Touch: the hover color of the tiles appears immediately, without a transition.
- Grid on the desktop: The "not reachable" mark is a triangle in the top right corner with 6 px legs, moved 1 px inward, with a white 1 px border (a second, 9.42 px white triangle underneath) for contrast on colored sections.
- All devices: IP addresses, `http://orderbox` and `kitchen.toolbox-bodensee.de` never count as unreachable. The exceptions are kept centrally in `never-dead.json`; `internal()` in `edit/check.php` and `isNeverDead()` in `app.js` read the same file.

**Grid on the smartphone**
- In grid mode at least two tiles sit side by side (column width at most `50 % - 1px`), more when there is room, at most 6; before, a narrow phone gave one column when two tiles of 11.875 rem did not quite fit.

**Bar on the smartphone**
- iPhone in portrait: dropdown and steppers follow close behind the title, the gear sits at the very right edge (`#section-nav-list` is `display: contents` there, order via `order`).

**Cleanup (HTML and logic, looks unchanged)**
- **Bug fixed:** A line comment had swallowed the line `f.t0 = performance.now();` in `glowTo` (since the slowdown on touch). The glow window got no start time and jumped instead of gliding, also on the desktop.
- The bar is a `<header class="title">` instead of an `<h3>`; `font-size: 1.17em` and `font-weight: bold` now live in `.title` so all em measures stay the same. The empty `touchstart` listener in the `<head>` (iOS trick for `:active`) is gone.
- Pointer kind centralized: `pointerKind`, `isTouch()` and `setPointerKind()` replace `lastPointer` and six direct queries of `body.touch`; one shared `pointerdown` handler sets pointer kind, swipe origin and click lock. The swipe states are in one block ("Touch swiping"); the dead timer `swipeTimer` is gone.
- `tools/smoke.js` uses pointer events with `pointerType` (jsdom has none); the two checks for coupled hover and click lock used to fail.

**Pointer, keyboard and ghost headers**
- In the heading only the chevron, no faint section line; the line stays in the section. In the topmost (active) heading dot and line apply, no chevron.
- Ghost headers: the shadow starts with a 1 px thin dark line, which also stays on the copy gliding out; the previous copy no longer turns gray.
- **Ghost headers renamed** (before "Geist-Titel", German for ghost titles): `ghostHeader*` instead of `geist*` in `app.js` (state `ghostHeader` with `stack`, `leaving`, `layer`, …; `ghostHeaderRender`, `ghostHeaderRemove`, …), `.ghost-header`, `#ghost-header-layer` and `--ghost-header-shadow/-fade/-hold` in the CSS; edge classes `top`/`bottom`, class `under` instead of `old`.
- Ghost headers change one at a time: while a change runs (400 ms), the next target waits for it to end and only the last one counts (`ghostHeader.free`); when hovering quickly over several chips, several copies never glide at once like a fan.
- Ghost headers (`ghostHeader.stack`) again form a stack of all sections between view and target (ordered by distance, target on top, those in between lying ready underneath): further away only the copy of the target glides in, nearer the ones above just glide out and uncover the ones below (before they first glided down). If the target jumped over several, they glide out together. Every change takes 400 ms, the next target waits, only the last one counts (fast hovering skips intermediate steps). Gliding in and out with ease-out; shadow and line fade out quickly at the end of gliding out during the last 25 %.
- With keyboard navigation a resting mouse pointer over nav chips or headings triggers neither line/chevron nor a ghost header.

**Event log removed**
- The `?debug` overlay (touch, pointer and scroll events, `tail` lines) is gone again, together with its log calls in `cutTail`; it did its job.

**Result on the phone**
- With the animated end of the glide (`cutTail`) a tap now activates the section sooner (confirmed on the phone). The `?debug` overlay stays available (it only shows with `?debug`).

**Event log: tail lines**
- With `?debug` the overlay also logs `tail? step=… dist=…` (every 8th scroll event while the page is slow and within 120 px of a snap point: the speed per scroll event and the distance) and `tail cut …` / `tail done` when the finishing animation of the glide runs. It shows whether the takeover triggers at all.

**Touch: the end of a glide is finished by an animation**
- The event log showed that iOS passes no touch event at all to the page while it glides after a swipe (a touch only halts the scroll), so the several taps before a section activated were swallowed, not late; the slow end of the glide onto the snap point took about 0.7 s. An instant jump (first attempt) did nothing because iOS ignores programmatic scrolls during its own deceleration. `cutTail` now takes over earlier: finger up, phone, not in edit mode, at most 3 px per scroll event and within 60 px of a snap point (first section of a page) → the native scrolling (`overflow-y: hidden`) and the snapping are switched off for a moment and the last stretch is animated by script in 60 to 180 ms (ease-out) onto the snap point; then both are given back. A touch during that animation ends it at once (`tailRestore`). Not testable here; to be checked on the phone.

**Touch: remembered tap during a scroll**
- If iOS cancels or swallows a touch while the page glides after a swipe (the `touchcancel`/`pointercancel` lines in the event log), the touch is remembered (`pendingTap`: target and time, only a touch while `swiping`). It is dropped when the finger really moves (swipe, 10 px) or when `touchend` handled it as a tap; otherwise the section is activated when the scroll ends (`swipeEnd`, within 2.5 s). The activation at `touchstart` while scrolling stays.

**Diagnostics: event log**
- Opening the page with `?debug` (e.g. `https://a.msmr.co/?debug`) shows a small overlay at the top with the last touch, pointer and scroll events, the time, the swipe state (`sw`) and the lock (`lock`). It shows which events reach the page while it is still scrolling after a swipe, to find out why a tap shortly before the scroll ends activates the section late. Remove it again once that is solved.

**Highlight transition always the same**
- The first tap on a section after scrolling switched the highlight at once, while later taps (e.g. on the upper section and on that section again) glided. Cause: the scroll-driven mode left `f.dest` empty, and an empty `f.dest` was read as "first placement, no animation". The first placement (and a layout change) is now marked explicitly (`f.instant`, also consumed by the scroll-driven placement, otherwise the first tap would still have been the "first placement"), so every change of the highlighted section glides the same way.

**Smartphone: heading link scrolled one section too far**
- Tapping the heading of a section (e.g. TBX.LI) scrolled the page one section too far, so the section left the view. The plain anchor jump puts the heading at the top; for the second section of a pair (no snap point) the snapping then pulled the page on to the next snap point. On the smartphone a click on a heading link now jumps to the snap point of its page (`pageStart`, the first section of the pair, so both are visible) and sets the address with `history.replaceState`. The tapped section is still the active one (the tap lock).

**Touch: tap while the scroll after a swipe ends**
- Taps got lost while the scroll after a swipe was ending (coasting, then settling on the snap point): several taps before the section activated. A touch while the page is scrolling (`swiping`) now activates the touched section at `touchstart` already: such a touch can only halt the scroll, be a tap, or start a new swipe, and a swipe releases the activation again. The release by `touchmove` ignores finger jitter under 10 px, so a tap no longer cancels itself. Not testable here; to be checked on the phone.

**Touch: tap during a long scroll**
- A tap into a section is now also detected from `touchstart`/`touchend` (little movement, under 0.6 s), not only from the pointer events: while the page scrolls, also while it glides on its own, iOS may cancel the pointer events (`pointercancel`), but `touchend` still arrives. The tap activates the section at once and the scrolling is left alone. In a simulated page the pointer path already moved the highlight at once during a running scroll, so the delay on the phone must come from the cancelled pointer events; to be checked on the phone.

**Smartphone: dropdown and gear without a box**
- The filled box for the dropdown and the gear (previous change) showed up as an empty rectangle: a later rule `.nav-btn { background: transparent }` overrode the fill while the text color (`--front-body`, the page color) stayed. Reverted: the dropdown and the gear are plain icons with transparent edges again, with the same width as the steppers.

**Smartphone: equal widths for real**
- A screenshot from the phone showed the dropdown and the gear far narrower than the steppers. The cause: an older rule in the same phone block, `#section-nav-list .nav-btn { flex: 0 0 auto }` (specificity 1,1,0), outranked `#section-jumper, #settings-btn { flex: 1 1 0 }` (1,0,0), so the two never grew. The old rule (and the equally pointless `#section-nav-list { flex: 0 0 auto }`, the list is `display: contents` there) is removed. Why the offline checks missed it: jsdom does not expand the `flex` shorthand, and the layout engines available here could not be driven, so the flex values were never really measured.

**Smartphone: the four buttons look the same**
- Checked the computed styles: the four bottom bar buttons already had equal widths in the CSS (padding 0, equal borders, `flex: 1 1 0`). They only looked unequal because the steppers are filled boxes with a visible edge, while the dropdown and gear were plain text. All four are now the same filled box (`--text-col` background, `--front-body` text, 1 px edge, 6 px radius) with a 4 px distance in front of each. Not measured in a browser (the layout engines available here could not be driven).

**Smartphone: hamburger on the sections dropdown**
- On the smartphone the sections dropdown shows a hamburger (Font Awesome `fa-bars`) instead of the chevron, and it no longer rotates when open (the earlier up/down chevron rule for the phone is gone). The text mode still shows the word "sec".

**Smartphone: really equal widths, gap between down and up**
- The four buttons were still unequal because their padding differed (0.8 em on dropdown and gear, 0.5 em on the steppers): with `flex-basis: 0` the base size is raised to padding plus border, so the equal share came on top of different bases. All four have `padding: 0` now, so they share the free width exactly equally. A 4 px gap separates the down and the up button (the width stays equal; the gap comes off the shared width).

**Smartphone: down before up**
- In the bottom bar the down button now comes before the up button (order: sections dropdown, down, up, settings), swapped via `order` in the CSS.

**Smartphone: equal button widths**
- The four buttons of the bottom bar (sections dropdown, up, down, settings) have the same width: they share the width the domain leaves free equally (`flex: 1 1 0`).

**Touch: tap during coasting, bar spacing**
- A tap into a section activates it at once, also while the page is still coasting after a swipe: the glow window no longer insists on following the scroll when the lock comes from a tap (kind `title`); a jump via chip or list (kind `nav`) still follows the scroll.
- Bottom bar on the smartphone: no padding to the right of the domain at all (`.home-link` and `.titledomain` padding-right 0, `column-gap: 0`, no left margin on the steppers). The dropdown and the steppers use the free width.

**Smartphone: no divider lines in the bar**
- The light and dark side edges of the nav buttons (dropdown and gear), which showed as thin divider lines between some elements of the bottom bar, are transparent now (`border-left/right-color: transparent`).

**Smartphone: bar spacing**
- In the bottom bar the padding to the right of the domain is smaller (0.2 em instead of 0.8 em), and the free width goes to the elements: the sections dropdown and the two steppers grow evenly (`flex: 1 1 auto`), the gear keeps its size at the right edge. Not measured on a device.

**Touch: tapping a section after a swipe**
- A tap into a section (background, heading, tile) is now detected from `pointerdown` + `pointerup` (little movement, under 0.6 s, no scroll in between; a scroll ends the pointer with `pointercancel`) instead of from the `click` event: iOS does not reliably fire `click` for non-interactive elements such as a section background, which made taps after a swipe appear to do nothing. In the jsdom test the lock was set after a swipe with the old code too, so the click event is the likely cause on the device; to be checked on the phone.

**Smartphone: full address and chevron direction**
- The bar shows the full address "a.msmr.co" again instead of "a." (the hiding rule for the phone is gone). Estimated width at the bar's font size: 90 px for the address; with title padding, dropdown, two steppers, gear and gaps about 353 px, so it fits on iPhones from 375 pt width; on narrower screens the bar scrolls sideways (it already had `overflow-x: auto`). Not measured on a device.
- The chevron of the sections dropdown points up when closed and down when open (before: down closed, up open), because the list opens upward from the bottom bar.

**Touch: no shadows in the dropdowns**
- On touch devices the settings overlay and the sections list have no drop shadow, and the entries of the sections list lose the light/dark bevel edges on their left and right (`border-color: transparent`). The inner shadows of the active entry and the hover shadows were already off in the list.

**Touch: settings overlay as tall as the sections list**
- On touch devices the buttons of the settings overlay are 2.75 rem tall, like the entries of the sections dropdown (before: the width of the gear).

**Home screen icon: transparent, 60 % grey letter (experiment)**
- All icons (`ico-light-*`, `ico-dark-*`, the embedded home screen icons) are now the same transparent PNG with a 60 % grey (#666) "a." and the dot, no background: iOS fills the background itself, and #666 reads on white (5.7:1), light grey (4.9:1) and black (3.7:1). Reports on what iOS fills in are conflicting (black or white), so this is to be checked on the phone. The script that sets the icon by color scheme stays and now gets the same icon in both modes. Revert with `git revert` of this commit to get the light/dark pair back (black on #eee, soft grey on #3a3a3e).

**Home screen icon: light and dark by script**
- iOS 27.2 ignores `media` on `apple-touch-icon` and also leaves a single dark icon unchanged, so there was no light/dark difference. Research: a developer on the Apple Developer Forums reports that setting the `apple-touch-icon` link from script by `matchMedia('(prefers-color-scheme: dark)')` installs the matching icon (unconfirmed by others; the icon stays as it was when the shortcut was added). `index.html` now has that script (it creates a fresh link tag for the current color scheme and follows changes of the scheme); the static link stays as fallback. `tools/touch-icon.js inline|url` rewrites the link and the `ICONS` line together.
- Icons: light = black "a." on #eee (no outline, no lines); dark = soft light grey "a." (#cdcdd2) on dark grey #3a3a3e, i.e. less contrast than white on near-black. Same "a" close to the dot.
- If the phone still shows the same icon in both modes, a transparent icon with a colored letter (iOS fills the background itself) is the next experiment.

**Home screen icon: white "a." on dark grey**
- The lines behind the letter changed nothing on the phone (light and dark mode looked the same). Black on a light background is the hard case for iOS's automatic dark mode; an icon that already has a light letter on a dark background is what iOS itself produces, so it has little to convert. All icons (`ico-light-*` and `ico-dark-*`, which are now identical, and the embedded home screen icon) are a white "a." in Ubuntu Medium on dark grey #2a2a2e, the "a" close to the dot. The light/dark file pair is kept so the tab icons and `tools/touch-icon.js` work unchanged.

**Home screen icon: structure behind the "a."**
- iOS re-colors home screen icons in dark mode (it splits foreground and background and darkens the background), which made the thin outline disappear. The light icons (`ico-light-*`, also the embedded home screen icon) now have a structure behind the black "a.": white horizontal lines (every 1/18 of the icon height, 1.2 % thick) on mid grey (#c8c8c8); the outline is gone. The lines stay lighter than the background after darkening, so the edge of the "a." keeps contrast. Dots instead of lines were the alternative (also previewed). Embedded copy updated.

**Home screen icon: softer outline**
- The outline of the light icons is light grey (#d7d7d7 instead of white) and 1.1 % of the icon width (about 2 px at 180 px). History on the phone: 3.2 px white looked too heavy, 1.6 px white too faint, 2.4 px white too harsh. Embedded copy updated.

**Home screen icon: "a" closer to the dot**
- In all icons (`ico-light-*`, `ico-dark-*`, embedded copy) the "a" sits closer to the dot: half of the gap between the two letters is closed (the gap was about 12 % of the icon width), the dot keeps its shape and the pair stays centered. Regenerated from the Ubuntu font, then `node tools/touch-icon.js inline`.

**Home screen icon: light only**
- The dark-mode tag is removed again (iOS 27.2 ignores `media` and showed the dark icon in both modes). The home screen icon is the light one with the thin white outline in both modes.

**Home screen icon: thinner**
- The white outline of the light icons is half as wide (about 1.5 px at 180 px instead of 3 px), and the dark icons (`ico-dark-*`, white on #333) use Ubuntu Regular instead of Medium, because white text on dark looks bolder. Embedded copies updated.

**Home screen icon: dark variant (experiment)**
- A second `<link rel="apple-touch-icon" media="(prefers-color-scheme: dark)">` embeds the dark icon (`ico-dark-180.png`, white "a." on #333) for dark mode, placed before the regular tag: if iOS ignores `media` and uses the last tag, nothing changes. Undocumented for web shortcuts. Result on the device (iOS 27.2): iOS then shows the dark icon in both modes, so it ignores `media`. `tools/touch-icon.js` switches it along.

**Home screen icon: white outline**
- The light icons (`favicon/ico-light-{180,192,512}.png`, also the embedded home screen icon) now have a white outline around the black "a." (about 3 px at 180 px). In dark mode iOS puts the icon on black itself; a web shortcut cannot supply its own dark variant, so the outline keeps the "a." visible there. Regenerated with the Ubuntu font, then `node tools/touch-icon.js inline`.

**Home screen icon on iOS 27.2**
- Analysis: the icon file is a valid 180×180 RGB PNG, served with 200 over HTTP/1.1 and HTTP/2 without redirects, and opens in a Safari tab; the certificate chain verifies. The Add to Home Screen sheet still showed a letter tile. Several developers report the same on iOS 27.2: the sheet loads the touch icon with its own loader that fails on network URLs (and ignores manifest icons); embedding the icon as a `data:` URI fixed it for them.
- `index.html` now embeds `favicon/ico-light-180.png` as a `data:` URI in `<link rel="apple-touch-icon">` (about 7 KB). `tools/touch-icon.js` switches between `inline` and `url` (the default variant) and copies the icon to `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` (before: 404).

**Dead-link triangle**
- Grid on the desktop: the triangle now has 8 px legs (before 6 px), still moved 1 px inward; the white 1 px border triangle underneath grew to 11.42 px (8 + 1.42 + 2).

**URL check (`edit/check.php`)**
- The check runs in batches of 40 in parallel, the GET retry for servers that reject HEAD is parallel too (it aborts after the first bytes), and the page prints its progress ("n / total") after every batch instead of staying blank until the end. 163 entries take about 85 s from the command line; the progress output also keeps a reverse proxy from timing out. The page no longer reads the old `tot` flag, so the dead marks only appear after one run with `?write=1`.

**Everything in English (identifiers, texts, documents)**
- Identifiers in `app.js`, `styles.css`, `index.html` and `tools/smoke.js`: `fenster*` → `glow*` (the glow window), `licht*` → `light*` and `.licht`/`#kachel-licht` → `.tile-light`/`#tile-light`, `strich*` → `cursor*` (`#cursor`, `#cursor-sec`, `.cursor-on/-dot/-std`), `sperre*` → `lock*` (`body.locked`), `kachel` → `tile`, `koppleHover` → `coupleHover`, `springeZu` → `jumpTo`, `maszLesen` → `readMeasures`, and the classes `.gedeckt` → `.covered`, `.aktuell` → `.current`, `.heiss` → `.hot`, `.tastatur` → `.keyboard`, `.mit-hover` → `.with-hover`, `.mit-druck` → `.with-press`, `.da` → `.inverted`, `.seite` → `.app-frame`; CSS variables such as `--kachel` → `--tile`, `--raster` → `--grid`, `--schatten` → `--shadow`, `--fenster-dauer` → `--glow-duration`, `--curs-auf/-ab` → `--curs-up/--curs-down`; `data-pfeil` → `data-arrow`.
- **Data and saved choices:** the link flag `tot` is now `dead` (in `edit/links.json`, `links.default.json` and the PHP scripts; `edit/check.php` rewrites all flags on `?write=1`, so run it once if the live data still carries `"tot"`). The setting stored as `a.farbe` (`bunt`/`blass`) is now `a.colorMode` (`vivid`/`pale`): a device that had saved "pale" starts with "vivid" once and has to choose again.
- **Scripts:** `edit/pruefen.php` is now `edit/check.php` and `?schreiben=1` is `?write=1`; all messages and the report page are English.
- **Visible texts:** dialogs (`Save changes?`, `Discard changes?`, `Save new entries?`, `Changed (n)`, `Deleted (n)`, `Order changed (n)`), button hints (`Delete`, `Restore`, `Add link`, `Move`, `Move section`), the sign-in hint and the load error are English, as are the `aria-label`s and the test messages; `index.html` carries `lang="en"`.
- All comments in `app.js`, `styles.css`, `index.html`, the PHP scripts and `tools/smoke.js`, plus `README.md`, this log (history included) and the documents under `docs/`, were translated. Names in older entries are the current ones.

---

## 2026-10-17 — Nav and sections dropdown unified, pointer as an image pointer, click lock, re-sorting sections

**Nav and sections dropdown**
- **One row, one shape:** Chips, gear and dropdown sit in `#section-nav-list`; gear and dropdown share the class `.nav-btn` (before `.settings-btn`, plus special rules for `#section-jumper` and a JS measurement of the width). If space is short, the row overflows to the left so that gear and dropdown stay reachable.
- **Button instead of select:** The dropdown is a `<button>` (`aria-expanded`), text mode "sec", icon mode a chevron that turns upward when open. The `<option>` hacks (glyphs as text, `sel.value`) are gone; `jumperValue` and `jumpTo()` replace them.
- **List like the chips:** Chips and entries share `a.sec-btn` (`sectionButton` builds both): same base shape, hover, active and press effects; flat in the list (`--sb-*` variables). `coupleHover` couples chip, heading and entry of a section. The active section is filled in the open list. Entry height like the settings (`navButtonHeight`). The arrow keys do not apply globally on the dropdown button.
- **Overlays:** Settings and sections list grow in height and shrink back (125 ms), also on auto-closing; only the height animates, colors switch before growing or after retracting. The gear switches without a transition (also the glyph, a `::before`) and only returns after retracting.

**Settings**
- Color scheme with "auto" in one button (auto, light, dark); the separate auto button of the bar is gone. Hover hint "now/next value" or all values for the theme.
- Text mode: all settings as short English words (`aut`, `light`, `dark`, `col`, `pale`, `text`, `chip`, `grid`, `left`, `cen`, `edit`, `save`), larger text. Alignment in icon mode with `fa-align-left` and `fa-align-center`; navigation: "text" instead of "t" in the squircle.
- Pale color a bit stronger (`--color-pale` .4).

**Pointer**
- Chevron up or down on headings, nav chips and list entries, showing where a click scrolls. Real image pointer (SVG, 25 px, per theme `--curs-up` and `--curs-down`), `data-arrow` on `html`; a DOM element lay behind the list (top layer).
- The square in the section is white in light mode, inverted in dark mode; in the topmost heading it applies instead of the chevron.
- The tile line sits in the gliding light (`.tile-light-line`) and moves along. All pointers without a transition (the global `*` rule cross-faded glyphs and colors).
- The heading no longer shows a 28 % veil on hover.

**Click lock**
- After a click on a heading, chip or list entry the section stays the target until the mouse moves by more than 4 px or another click comes (`lockOn`, `body.locked`): glow window, active chip, no tile light and no tile hover, no chip hover, pointer the normal dot. After a heading click a key press releases it as well.

**Editing**
- Sections can be re-sorted vertically by the handle on the heading (`sectionsSortable`); the save dialog names the changed order. A double click on the bar no longer starts editing.
- **Bug fixed:** Switching on edit mode froze the page. `lightReset()` called `classList.remove` even without the class set, which counts as a change and triggered the observer on `<body>` again and again. Now only when the class is set; in addition `safeObserve` disconnects the observers after 500 calls without a break.

**Miscellaneous**
- Theme values central: one dark block instead of two, `data-theme` is always set (auto = system). Without JavaScript the light theme applies.
- Grid: the line under the hovered tile stays as before; section fill 1 px further, so no stripe remains at fractional heights.
- Smartphone/small view: the gear (with dropdown) stays in portrait too, the chips give way.
- `tools/smoke.js`: smoke test without a browser (jsdom).

---

## 2026-10-15 to 16 — Glow window, ghost headers, tile light, line pointer, color

**Glow window and ghost headers**
- **Glow window:** Instead of coloring the section immediately on a change, a window glides to the new section (hover, nav, keyboard, otherwise the topmost) and grows or shrinks on the way (200 ms, accelerating, ends hard). The color changes abruptly at the section edges: each section paints its part as a gradient with hard stops (`app.js`, `glowInit`). Rows switch via `.covered` as soon as their middle lies inside the window; the bottom grid line via `.covered-bottom` at the bottom edge of the row. `.covered` rules replace the `:hover`/`:has`/`.current` selectors in `styles.css`. Hover area of the heading (28 %) in chips and grid; the chip of the active section also counts as hover.
- **Ghost headers (then "Geist-Titel"):** If the heading of the target section lies outside the view, a copy sticks to the edge until the real heading arrives there (also after a click while the page scrolls). It is only removed once the window fully covers the heading row, and fades out over 60 ms. A new target glides over the previous copy, which turns gray and no longer casts a shadow. Soft shadow of 66 % of a tile height, fading out after a click, without underline.
- **Tile text:** In the glowing section it stays `--on-c` (light: white, dark: dark). The press state of the heading (`.with-press`) now only changes the shadow, no longer the color (no light-dark-light on a click on a nav chip).
- **State cache:** When re-measuring, the state per row and per class (`.covered`, `.covered-bottom`) is kept; before, one overwrote the other and the tile text got stuck in the wrong color.

**Tile light (chips and grid)**
- The hover area of the tile is a single element (`#tile-light`) that glides from tile to tile (90 ms, curve `--light-power`). Out of nowhere it comes in full size from outside over the entry edge through a fixed rectangle without rounding (tile size) into the tile and leaves it the same way (90 ms, linear); nothing is scaled. The tile text only inverts (`.inverted`) when the light covers 95 % of it; checked per frame, so none stays stuck. The cell under the light carries the section color immediately (`.tile-cell`, behind the light), the window of the section runs independently of it. For safety the light follows the tile under the pointer on movement and scrolling.

**Line pointer**
- Vertical line instead of the dot: on nav chips and tile edges at row height, on section background and heading at section height with 33 % opacity (`#cursor-sec` in the content, behind heading, tiles and light; not when hovering a tile, there the tile draws its own line). The system pointer stays in fields, dropdown, settings and in edit mode. Color switches immediately.

**Settings**
- **Color:** New setting vivid/pale: the saturation of all section colors drops at the same lightness (`--color-pale`, 0.4); icon a circle in a section color. Saved as `a.colorMode` (before `a.farbe` with `bunt`/`blass`).
- **Overlay:** Glides down under the gear when opening and up when closing (the other way round on the phone), the colors change on the way (200 ms, with reduced motion 90 ms). Width flush with the gear; in the grid the buttons keep the height as for chips.

**Grid**
- Tiles of a section stay at at most 6 columns and fill the width. Empty cells of the last row carry the lines of the tiles (`--empty`, `.group::after`).

**Central**
- Times, curves, shares and opacity are variables in the first `:root` of `styles.css`, `app.js` reads them once (`readMeasures`).

---

## 2026-10-11 — Only two values per setting

Each setting has two values, the button switches to the other one, no preview on hover. Zoom only S/M without detection (a saved `l` counts as `m`). Color scheme only light/dark; the automatic mode is a separate circle at the end of the bar (empty/filled).

- **Text mode:** The gear is called "set", the automatic button "auto" (active = inverted); in icon mode gear and circle.
- **Sections list:** Instead of the native menu the select field opens its own list in both modes (`#jumper-pop`): names in text mode, icons in icon mode; stack in field width like the settings overlay, not inverted, without transitions. Press, drag, release selects an entry. Reason: the native macOS menu does not show web fonts (Font Awesome icons appeared as "?").
- **Select field:** Stays a `<select>`; in icon mode it shows the icon character in the color of the bar icons. When jumping via the dropdown it shows the selected section until arrival (`selJump`), not the ones scrolled past.
- **APP icon:** Font Awesome's `fa-square` everywhere instead of the squircle mask (which only stays in the navigation button of the settings). An attempt to turn the field into a button was discarded.
- **Heading row:** The whole row of a section is the link (`a::after` across the row), not in edit mode.
- **Desktop:** The dropdown has 0.375 rem distance to the right edge of the page.
- **Cache:** `styles.css` and `app.js` append `?v=…` (in `index.html`); the server sends no cache headers, an old `app.js` with a new `index.html` left the page empty. Increase the version on changes.

---

## 2026-10-09 to 11 — Section colors, zoom, color scheme, settings overlay, grid

A polish of the nav and the tiles turned into a comprehensive overhaul of the
interface. It was checked in a headless browser (Vivaldi via CDP) with measured values and
screenshots, not by eye; phone, iPad, dark mode in the grid and the
remote control on the TV remained unchecked.

### Section colors and highlighting

Every section has a color (`--c`, 15 tones from `SEC_COLORS`, by position). From it
are derived: `--c-hov` (28 % opacity), `--on-c` (text on the color) and
`--c-text` (the section color with lightness limited to a range, so it stays readable on
white or dark).

The **active or hovered section fills completely** in its color, text white (in
dark mode `#111`). The tile under the cursor inverts: light area, text in the
section color, the drawn line cursor too. The heading highlight of the active
section was dropped; in mouse mode the nav chip follows the section under the mouse.

Only **the most recently used input counts**. `body.keyboard` (set on Tab and arrows,
removed on mouse movement) switches between hover rules and focus rules. In
mouse mode the "current" section steps back as long as another one is hovered —
before, two were colored at the same time.

Fixed: On a keyboard jump the target section got the focus first and `.current` only
later. In the gap only the general rule applied, which sets heading, bottom edge and text to
`--title-col`, in dark mode a white flash. The coloring now also applies
for `section:focus-visible`.

### app as the third section

`withApp()` in `app.js` puts the section `app` at position 3 if it is missing in the data;
a previously saved "APP" and the phone icon are switched to `app` and the
squircle on load. The title is written in lowercase, the capitals come from
`text-transform` as with the others. The icon `icon-squircle` is a superellipse with
exponent 5 (Apple's app icons; a mathematical squircle would have 4), drawn as a CSS mask from an
SVG — Font Awesome has no such shape.

### Zoom S / M / L

`html` gets `font-size: calc(100% * var(--zoom))` with 1, 1.25 and 1.6. Tile width,
row and bar height, spacing, shadows and the red dot are in `rem`; hairlines
stay `1px`. The choice is kept per device in `localStorage["msmr.zoom"]`, without an entry an
automatic default applies (TV, wide without a mouse, tablet). An inline script in the `<head>` sets
it before the first paint. API: `msmrZoom.get/set/step/cycle/reset`. Keys `+`, `-`, `0`.

The nav chips got `flex: 1 1 0` so they do not wrap to a second row at large zoom.
The `device-width` media queries stay in `px`.

### Color scheme auto / light / dark

The variables exist for light (default), for the dark system default and for the
explicit choice `data-theme="dark"`. Dark is therefore in `styles.css` twice — a media
query does not know an attribute. The choice is kept in `localStorage["msmr.theme"]`, without an entry
the page follows the system. In dark mode the hover tile has the page color as its area and
the gloss is lowered to 60 % (`--gloss`).

### Settings in the overlay

The gear as the last nav entry, the chips before it, the dropdown after it. A click opens
a vertical stack of icon buttons (a native `popover="manual"`), each cycles through
the values. At rest the icon shows the state and under the pointer the result of the click; after
a click the new state, until the pointer has left the button. The stack is as
wide as the gear, which shares the same width rules as the nav chips, and inverts
itself as long as it is open. Pressing, dragging onto a button and releasing only switches this
button. With a mouse it closes 3 s after leaving, without a pointer never.

The former settings block in edit mode and the two button strips at the bottom right
are gone. The settings navigation (text/icons) and alignment (left/center) moved
from edit mode into the overlay.

### Grid view

New setting "View": square tiles without gloss, 1 px lines on the grid lines
(gray in inactive sections, light in the colored one), no line under the heading and no
padding under the group. On hover the heading stands out with 28 % in the text color from the
area. "Left" means full width here, also for the bar. The dead link is a red
square flush in the corner. Edit mode stays with the chip layout.

### Editing

Entry via the overlay (two chevrons; a floppy disk while editing) or
double click on the bar. Save/cancel and the entry "edit" in the dropdown
are gone. Finishing asks: save? otherwise discard? otherwise keep editing; without a
change the page simply reloads. Links can be dragged into other sections (mouse
only); the save dialog then reports the target section as changed.

### Keyboard

- The arrows also work with focus on nav chips or gear.
- After a mouse movement they start at the section or tile under the mouse instead of the
  scroll position. Before, "down" jumped to the first section.
- Arrow left after a section change goes to the last tile of the section.

### More

- The favicon is now `apple-icon-180x180.png`; `favicon-32x32.png` did not exist. Paths in the
  manifest are relative to the manifest.
- `tools/dev-router.php`: demo server with `no-store` and a version number on CSS/JS. A
  temporary cache `.htaccess` has been removed again, the real site loads correctly.
- The page no longer has a rounded frame (`div.app-frame` fills the window); the
  corner rounding of the Vivaldi webview is a browser setting.

### Pitfalls that remain

- **Specificity of the hover rules.** The coloring is in several selector lists
  (mouse, focus, current). Whoever changes a property has to catch all three.
- **`:where(:not(:has(...)))`** keeps the specificity of the "current" rules low; a
  normal `:not()` would lift them above the hover rules.
- **`custom property` with a color in `:root`.** `--divider` or the like with `var(--c)` in `:root`
  is not evaluated per section; such mixes belong directly in the rule.
- **`sed -i` on macOS** needs `-i ''`; Python replacements with `assert` are safer.
- **Screenshots in a headless browser** show the page twice at the right edge and
  sometimes omit the overlay; measured values (`getComputedStyle`, `elementFromPoint`) are
  more reliable than the picture.

## 2026-07-26 — Height grid, shortened names, focus, dead links

The day began with two wishes for the iPad and grew into an overhaul
of the mobile presentation. Everything was checked with a local
test server and measurements in the browser instead of by eye — several findings
refuted assumptions that looked plausible beforehand.

### Height grid

Sections now occupy a **whole multiple of a quarter of the
content height**: on the iPad one slot, overlong ones two; on the iPhone two or four.
So a cut-off section never stands at the bottom edge.

`gridInit()` in `app.js` rounds the heights up, the grid unit comes from the
CSS property `--grid` of the respective media query. Where it is missing — on the
desktop — the sections keep their own heights. CSS alone could not do this:
rounding up to a multiple depends on the content.

The threshold is 20 links per slot and adapts by itself: if
a two-slot section falls below it, it gets one slot again.

`max-height: 46vh` is gone, `height: 100%` became `min-height`. Both
were ceilings without `overflow` — content ran past them into the next
section.

### Tiles

Long names no longer wrap but are shortened with `…`. As a result
all tiles on a device are exactly the same size. Before, the second
line ran into the next row, everywhere the tile width is fixed.

The number of columns follows the available width instead of a fixed number
(`repeat(auto-fill, minmax(190px, 1fr))`): on the iPad four in portrait, six in
landscape, without a rule of its own per orientation. At a minimum width of 190 px
**not a single one of the 162 names is shortened**.

The vertical gap is gone — `margin` and `gap` lay on top of each other and
cost 8 px per row. Section headers shrank on mobile from 54 to 35 px;
that does not bring an additional tile row, just a more compact page.

### Bar and overlaps

The bottom bar on the iPhone covered 14–23 px of content: it was 64–73 px tall,
but `.container` only kept 50 px free. The cause was a `padding` of 0.5em
top and bottom. Now the chip determines the height, and `gridInit()` sets
the free space to the measured bar height — so it is always right.

In landscape the same bar wrapped to 113 px and covered 63 px. The reason
was a double rule: `.title` was defined twice, and the later one
overrode the `flex-wrap: nowrap` of the smartphone query merely by its position. Merged.

`#container` now gets its height via flexbox instead of an estimated 94 %.
Together with the 50 px bar the estimate gave a surplus below 833 px
page height — which is why the page could be moved by a few pixels on the iPad **only in
landscape**.

Rubber band on one level only: `overscroll-behavior: contain` on the content,
`none` on page and document.

### Jump keys on the iPhone

Two filled chevron keys behind the dropdown jump one section forward
or back, wrapping from the last to the first. They use the same
`jumpBy()` as the arrow keys; those still stop at the ends.

### Focus and contrast

The high-contrast state depended solely on `section:hover` — not reachable on a
touch device. It now applies equally to `:focus`,
`:focus-within` and `.current`, the latter assigned by `syncActive()` to the topmost
visible section. So it also works when scrolling by hand and
when the page loads.

After a jump the section is focused. Three points in time are needed,
because each is unreliable on its own: immediately in the click, in the next frame and
on `hashchange`. The target is **determined anew every time** from the hash
— on a click on a nav chip the hash still has the old value.

### Dead links

All 162 URLs were checked. 13 are demonstrably dead (404 or domain
gone) and now carry `"dead": true` (then `"tot": true`); they appear red, in the
active state with a red area. Not marked were 5 home network addresses,
2 timeouts and 10 bot blocks (401/403/500/503).

`collectData()` writes the mark along — without that the first
save click would have deleted it. A changed URL clears it.

**Important for operation:** `edit/links.json` is not versioned. The
marks only reach the server by uploading this file once;
a deploy alone is not enough.

### Small things

`a.msmr.co` shortens to `a.` on the iPhone and on the iPad in portrait, in landscape
the full address is shown. Section header links fill the remaining width next to the
icon. The icons sit on the baseline and do not exceed the cap height.

---

## 2026-07-25 / 26 — Icons, settings, write protection, CSS cascade

Eleven commits from `f36eea8` to `ce4fdcf`, in one go from 22:02 to 00:43.
The session has three strands: a new interface, a new place for
write access and, at the end, two cleanups.

### Interface

- **Section icons.** Every section carries a field `icon` in `links.json`
  (Font Awesome 6 Free, Solid). The section header always shows icon and title,
  the navigation bar either icons or the 3-letter abbreviations.
  The assignment of all 15 sections is in
  [docs/superpowers/specs/2026-07-25-section-icons-settings-design.md](docs/superpowers/specs/2026-07-25-section-icons-settings-design.md).
- **Settings panel** at the top of the page, only visible in edit mode: two
  iOS switches (icons on/off, left-aligned/centered) as well as cancel and
  save. The bottom edit bar is dropped for it. The two view
  settings live in `localStorage`, not in `links.json` — phone and
  desktop may be set differently.
- **Active display.** The topmost visible section is highlighted inverted,
  in chip, section header and dropdown selection at once. Hover puts the
  passive color underneath as an area and gives way to the active state.
- **Deleting is undoable** until saving: the entry is struck through
  instead of removed, the × becomes a ↺.
- **Arrow keys.** After a chip click or dropdown selection the focus moves to
  `#container` (`tabindex -1`, `preventScroll`). Before, it stayed on the anchor
  in the title bar, and the arrow keys scrolled into nothing from there.
  On load the content is already focused, several key presses add
  up.
- **Chip measures.** In icon mode square, icon horizontally centered; bar and
  chip height the same in both modes, fixed to round values; icons 25 px.

### Write access and data storage

- `save.php` and `config.php` now live under `edit/`, together with the
  database `links.json` and its backup. The directory protection thus applies
  to one folder instead of single files and can be set up via the
  host panel.
- The token is dropped without replacement — in a public JavaScript file it was
  ineffective anyway. The basic auth in front of `/edit/` replaces it completely.
- `links.php` serves the list publicly and creates it on the very first
  request from `links.default.json`. `links.json` and `links.bak.json` are
  no longer versioned; the real data lives on the server.
- `app.js` reports on HTTP 401 in plain words that the one-time sign-in at
  `/edit/` is missing — `fetch()` does not trigger a sign-in dialog for it.
- **Seed raised to the live state.** `links.default.json` was older than the
  server; the content of `links.php` was taken over including icons, with the
  key order name-before-url, as `collectData()` produces it.
- Structure, test steps and limits are in
  [docs/htaccess-setup.md](docs/htaccess-setup.md).

### Saving with confirmation

- Before saving a confirmation appears with two lists — changed and
  deleted, each with the old and new version. Newly created entries are in
  neither: they cannot overwrite anything.
- The basis is a comparison against the loaded state. `render()` stamps
  `data-name0` and `data-url0` on every entry, `changes()` compares
  against it.
- A save without any deviation aborts with a note. It would have
  only rewritten the file and overwritten the backup with an identical version.
  New entries and operated settings switches count as a
  change and let it through.

### CSS cascade

- **44 `!important` down to 1**, without changing a computed value.
  Verified over 46 states × 18 properties, twice, without deviation.
  Hover could be measured by replacing `:hover` in the stylesheet with a class:
  same specificity, same cascade.
- The core was the color cascade: `section .group` set `text-col` and forced `.group`
  into an `!important`. Without this selector `.group` applies by itself, and the
  specificity alone is enough: `section a` < `section:hover a` < `li a:hover`,
  `.name.active a` beats both through the number of classes.
- Rules defined several times merged: `li a` (3×), `a.secname` (2×),
  `.group` (2×). Their effect before depended solely on the order in the file.
- The media query `!important`s were checked one by one by setting the condition to
  `all` and measuring with and without — `max-device-width` depends on
  the physical screen size and cannot be triggered via the window size.
  Six carried nothing and are removed. One remains: `.group` has to override
  `margin-inline: auto` in the iPhone portrait rule.
- `li { margin }` is dropped. Its only purpose was to override the iPad rule;
  there `margin: 2px` now applies as written — tiles with
  spacing, section 20 px taller. The only intended behavior change of the
  cleanup, all other profiles stay identical.
- **GitHub Pages workflow removed.** `CNAME` is gone, `a.msmr.co` points to
  netcup, Plesk pulls `main` itself. Pages freezes at the last state and
  can be switched off in the repo settings.

### Pitfalls that remain from this session

- `collectData()` reads the DOM back into JSON. Every field that is not read out
  is gone after the first save click. That is why the
  `<h3>` carries both `data-icon` and `data-color`.
- `autocomplete="off"` on the section dropdown is necessary: otherwise Chrome restores
  the old selection on reload and thereby triggers edit mode again.
- New files in the repo root end up publicly in `httpdocs` on deploy
  if they are not in the deployment action.
