# a.msmr.co: full reference

The long version of the README: every file, every behavior, the data format, editing, performance. The short overview is [README](../README.md).

Personal start page: links in sections, shown as tiles. Static HTML, CSS and
vanilla JS, plus two small PHP scripts for the data. No framework, no build.

Built for mouse and keyboard on the desktop, iPad and iPhone, and for the browser on a TV.

## Structure

For AI agents and new contributors: `CLAUDE.md` has the file map, the rules and the commands.

| File | Purpose |
|---|---|
| `index.html` | Skeleton: bar (home link, nav chips or the section strip, gear, sections dropdown), content, overlays. The `<head>` holds the scripts that must run before the first paint: zoom, color scheme, the iOS home screen icon and the `?app` switch |
| `js/*.js` | Rendering, navigation, the section strip, settings, edit mode, split by area (16 files, loaded in order from `index.html`); file map in `CLAUDE.md` |
| `styles.css` → `tokens.css`, `base.css`, `strip.css`, `edit.css`, `grid.css`, `settings.css`, `ghost-header.css`, `cursor.css` | All looks. `index.html` links only `styles.css`, which `@import`s the others in cascade order (with the `?v=` value). `tokens.css` holds the `@font-face` rules (Ubuntu, the Apple logo, the small Font Awesome font), the tuning values and the color schemes; `base.css` is the base with the device media blocks; the other files hold one area each |
| `fonts/`, `vendor/fontawesome-6.7.2/` | Self-hosted fonts: Ubuntu Regular, a tiny Apple-logo font, Font Awesome Free (details and update steps in `fonts/README.md`) |
| `.htaccess` | Cache headers and 404 for files that are not part of the site (see Performance) |
| `links.php` | Serves `edit/links.json` (public) |
| `edit/save.php` | Writes the data (basic auth) |
| `edit/check.php` | Checks all URLs and marks dead ones (basic auth); `?write=1` writes the marks |
| `never-dead.json` | Addresses that never count as dead (read by `edit/check.php` and the page) |
| `links.default.json` | Seed, only on the very first request |
| `tools/dev-router.php` | Demo server with `no-store`, local only |
| `tools/touch-icon.js` | Switches the iOS home screen icon between embedded as data: URIs in `favicon/touch-icon-inline.js` (`node tools/touch-icon.js inline`, the iOS 27.2 workaround, current) and linked (`… url`, the default); also copies the icon to `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` |
| `tools/smoke.js` | Smoke test without a browser (jsdom): loads the page, switches edit mode on, checks the nav structure, click lock, coupled highlight, re-sorting of sections, both manifests and the `?v=` values; fails on page errors and infinite loops |
| `tools/style-snapshot.mjs` | Safety net for CSS changes: saves the computed style of every element in 24 views (`node tools/style-snapshot.mjs save FILE.json.gz`, later `check FILE.json.gz` lists every difference; keep FILE outside the repo) |
| `tools/*.test.js` | Unit tests (Node's test runner) for the pure logic: `unit.test.js` (never-dead addresses, section colors, preferences, the section strip's geometry, the `?app` switch), `headers.test.js` (the "Defines globals" line of every `js/*.js` is true), `bump-version.test.js` |
| `tools/page-env.js` | The jsdom setup shared by the smoke test and the tests (loads `index.html` and its scripts, records the globals each file defines) |
| `tools/bump-version.js` | Raises the cache version `?v=` on every file of `index.html` (`npm run bump`): next letter on the same day, the date alone on a new day |
| `tools/browser-checks.mjs` | Checks that need a real browser (headless Chrome via puppeteer-core): no layout shift while loading, the words in the settings overlay as large as the word on the gear (phones, iPad, narrow phone), the Apple logo drawn by our own font, every section icon has a glyph. Starts `tools/dev-router.php` itself |
| `package.json`, `.github/workflows/tests.yml` | The tools for the tests (`jsdom`, `puppeteer-core`) and their scripts; no build step. The workflow runs `npm run check` (unit tests and smoke test) on every push |
| `favicon/` | Icons used by the page, the two manifests, `touch-icon-inline.js` (home screen icon) and `app-mode.js` (`?app`) |
| `assets/` | Cursor images (used by the stylesheets) and the source images of the icon |
| `docs/` | Server, write protection, deploy; the plan for a later ES-modules migration; design draft for icons and settings |
| `CHANGELOG.md` | What was changed when and why |

The data lives in `edit/links.json` on the server and **not in the repo**
(`.gitignore`). A push therefore never changes it. Details: [docs/htaccess-setup.md](htaccess-setup.md).

## View locally

```
php -S 0.0.0.0:8080 tools/dev-router.php
```

Then `http://localhost:8080/`. The router appends a version number to CSS and JS,
so the browser never shows an old copy.

## Tests

```
npm install                    # once: jsdom and puppeteer-core
npm run check                  # unit tests + smoke test (what the CI runs)
npm test                       # node --test: the pure logic in js/, the headers of js/*.js, the version helper
npm run smoke                  # the page in jsdom: nav, click lock, edit mode, re-sorting; no missing files, no mixed ?v= values
npm run browser                # real Chrome: layout shift, settings word size, Apple logo, icon glyphs
```

The browser checks need Chrome (`CHROME_PATH` names it) and start the dev router themselves. Run them after changes to the CSS files, the settings overlay or the loading order. Touch and glide behavior is tuned on real iPhones and iPads; no automatic test sees it. Note that the layout queries use `device-width`, so a narrow desktop window never gets the phone layout; test it with device emulation.

## Data

`edit/links.json` is an array of sections:

```json
[
  { "id": "sec1", "title": "srv", "icon": "fa-server", "color": "cyan",
    "links": [ { "name": "pass.msmr.co", "url": "https://pass.msmr.co", "dead": true } ] }
]
```

- `icon` is a Font Awesome class (6.7.2, self-hosted); the APP section uses `fa-square`. A solid icon is written as `fa-briefcase`; a brand or regular icon with its style, e.g. `fa-brands fa-apple` or `fa-regular fa-star` (the page adds `fa-solid` itself, and a bare `fa-apple` shows nothing, because that glyph is not in the solid font). The 28 solid icons in use are in a 3 KB font; any other icon loads the full font on demand.
- Link names may contain the Apple logo character (U+F8FF): our own tiny font draws it, so it also shows on devices that are not from Apple.
- `dead` marks a link that was not reachable at the last test (red dot; in the grid, on every device, a triangle with 8 px legs, moved 1 px inward and with a white 1 px border, in the top right corner). Exceptions that never count as dead are kept centrally in `never-dead.json` (`allIpAddresses`: every IP address; `hosts`: host names, currently `orderbox` and `kitchen.toolbox-bodensee.de`); `edit/check.php` and the page (`isNeverDead` in `js/links.js`, also for marks that are already saved) read the same file.
- `color` is not displayed. The section color comes from the palette `SEC_COLORS`
  in `js/render.js` **by position**. Inserting or moving sections therefore changes
  the colors of the following ones.
- The section `app` (`id: "app"`) always belongs as the 3rd section in the row. If it is missing in
  the saved data, `withApp()` inserts it empty; it only appears in the file after the
  next save.

## Usage

### Mouse

- The section under the mouse, its heading and its nav chip light up together. The whole
  section fills with the section color, the tile under the cursor inverts
  (white area, text in the section color). The line cursor sits in the gliding tile light and
  moves along.
- The active nav chip follows the scroll position (the topmost visible section), never the mouse; the section under the mouse shows the soft hover area on its chip.
- **Click lock:** After a click on a heading, a nav chip or an entry of the
  sections list, the section scrolls to the top, and the resting pointer then lies over something
  else. Until the pointer moves by more than 4 px or another click comes, the
  clicked section stays the target of the glow window and the chip (`lockOn`, `body.locked`), tile light
  and tile hover stay off, other chips show no hover, and the pointer is the normal
  dot. Only after a heading click does a key press release the lock as well.

### Keyboard

- Arrow up / down: previous / next section. Arrow left / right: tile to tile,
  across section boundaries. After a section change, left goes to the last tile.
- After a mouse movement the arrows start at the section or tile under the mouse.
- Tab runs through the tiles. The arrows also work with focus on nav chips and gear,
  not in the dropdown and not in edit mode. In the open dropdown the arrows move the focus
  between the entries, Enter selects; the focus has no highlight of its own there.
- `+` / `=` and `-` / `0`: zoom M / S. `p` / `b`: the bar at the top / bottom (not with Ctrl, Cmd or Alt, not in a field).
- Only the most recently used input counts (mouse **or** keyboard), the other one
  is ignored for the highlight.
- `+` / `-` change the zoom, `0` sets it to S. Ctrl/Cmd stay with the browser zoom.

### Settings (gear in the bar)

The gear is a nav button (`.nav-btn`) next to the sections dropdown. A click opens a
narrow vertical stack with one button per setting. A click cycles to the next value. The button shows the **state**. In text mode that is
a short English word, in icon mode an icon. The hover hint (`title`) names
"now/next value", for the theme all values with the current one in brackets. On touch devices the words are as large as the word `set` on the gear (only on very narrow phones, 320 px, they shrink to fit).

| Setting | Values | Text mode | Icon mode |
|---|---|---|---|
| Zoom | S, M | `S`, `M` | `S`, `M` |
| Theme | auto, light, dark | `aut`, `light`, `dark` | circle (auto), sun, moon; in auto the icon of the system value small at the bottom right |
| Color | vivid, pale | `col`, `pale` | circle in a section color |
| Navigation | text, icons | `text` | square (`fa-square`) |
| Bar | bottom, top | `bot` underlined, `top` overlined | `fa-arrow-up` with a line above (bottom), `fa-arrow-down` with a line below (top); the line is outside the icon box. The button is first in the overlay while the bar is at the bottom, last while it is at the top (CSS `order`) |
| View | chips, grid | `chip`, `grid` | four round tiles or square outlines |
| Align | left, center | `left`, `cen` (in the grid `full`) | `fa-align-left`, `fa-align-center` |
| Edit | off, on | `edit`, `save` | two chevrons; floppy disk while editing |

With the mouse you can also press the gear, drag onto a button and release. That only advances
this button. Esc or a click beside it closes. With a mouse the overlay closes by itself 3 s
after leaving it, without a pointer (touch, TV) never.

**Overlays (settings and sections list):** On opening they grow in height away from the gear
or dropdown and shrink back on closing (also the automatic one) (125 ms, with
reduced motion 90 ms). Only the height animates. On opening the colors switch first, on
closing only at the end. The gear switches without a transition and only returns once the
overlay has retracted. The width follows the gear or dropdown, the button height in the grid is
the same as for chips (`navButtonHeight`).

Where the choice is kept (per device in `localStorage`, none of it is saved with the links):

| Key | Content |
|---|---|
| `msmr.zoom` | `{"v":1,"level":"s"|"m"}`; without an entry S applies |
| `msmr.theme` | `light` or `dark`; without an entry "auto" applies: the script in the `<head>` sets `data-theme` to the value of the system and follows changes |
| `a.colorMode` | `vivid` or `pale` |
| `a.navMode` | `short` or `icons` |
| `a.navPos` | `bottom` or `top`; without an entry the layout decides: bottom on the compact bar, top elsewhere (`effectiveNavPos`); the class `nav-top` / `nav-bottom` is on `<html>` only for a stored value |
| `a.align` | `left` or `center` |
| `a.view` | `chips` or `grid` |

**Zoom:** no detection, the default is S. Sizes are in `rem` and follow
the zoom (tiles, bar, shadow, red dot). The `device-width` media queries for
iPad and iPhone remain device properties and do not follow the zoom.

### Grid view

Square tiles without gloss, 1 px lines. In inactive sections they are gray, in the
colored section light. "Left" means full width here, the bar also runs
across the whole page; the tiles of the sections stay at at most 6 columns and get wider, on narrow screens (smartphone) at least two sit side by side. Empty cells of the last row carry the lines of the tiles. A dead link shows a red triangle with 8 px legs in the corner (on every device). Edit mode
keeps using the chip layout.

### Glow window and ghost headers

The glowing section (hover, nav chip, keyboard, otherwise the topmost) is a window that glides to the
next one, growing or shrinking on the way (200 ms, accelerating, ends hard; with
reduced motion 60 ms). The color changes abruptly at the section edges. `js/glow.js`
(`glowInit`) paints the part of the window as the background of each section and sets `.covered`
on headings, groups and tiles whose middle lies inside the window (`.covered-bottom` for the lower
grid line at the bottom edge); the CSS only colors via these classes. The measures live in the
content, scrolling does not change them.

If the heading of the target section (nav chip under the mouse or jump after a click, dropdown,
arrow keys) lies outside the view, a copy (`#ghost-header-layer`, `ghostHeaderRender`) sticks to the top
or bottom edge until the real heading arrives there and moves on; it stays until the window
fully covers the heading row, and then fades out over 60 ms. The copies form a stack of all sections between the view and the target, ordered by distance: the nearest
one lies at the bottom, the target on top (at the top edge the earlier sections are further away, at the bottom edge the later ones). If the target moves further
away, only its copy glides in, those in between already lie ready underneath. If it moves nearer, the copies above
just glide out and uncover those below, without gliding down first; if the target jumped over several, they glide out together.
A change takes 400 ms; the next target waits for it, and only the last one counts: slow hovering shows every step,
fast hovering skips intermediate steps. If the target is the active or a visible section, all glide out; when the edge changes, the same. Gliding in and out run with ease-out; shadow and line fade out quickly at the end of
gliding out. Copies underneath keep their color but have neither shadow nor line (there is only ever
one, otherwise it would get darker with every copy); if the real heading of such a copy is in view, it disappears. The copy casts a soft shadow of
66 % of a tile height onto the content. After a click it fades out the closer the real heading
gets to its place. In edit mode and on the smartphone there is no copy: there the headings stay with their section and scroll out of view with it.

### Tile light

The hover area of the tile (chips and grid) is a single element (`#tile-light`,
`light*` in `js/light.js`) that glides from tile to tile (90 ms). Out of nowhere it comes in
full size from outside over the entry edge through a fixed rectangle without rounding into the
tile (90 ms, linear) and leaves it the same way over the exit edge; the rounded area
itself is never scaled. The tile text inverts (`.inverted`) as soon as the light covers 95 % of it.
The cell under the light carries the section color immediately (`.tile-cell`). It is drawn in the
content, the light scrolls along and follows the tile under the pointer on movement and scrolling.

### Pointer

- **Line:** on nav chips without direction (section already at the top) and tile edges at row height, on
  section background and heading at section height with 33 % opacity (`#cursor-sec`, behind heading,
  tiles and light). On a tile the line sits in the tile light.
- **Dot:** in a section (not on a chip or tile) the small square, white in light and
  inverted in dark mode (`--curs-sec`); also in the heading that is at the very top.
- **Chevron:** on headings, nav chips and entries of the sections list a chevron pointing up or down shows
  where a click scrolls (`chipDirection`; in the heading always up). It is a real image pointer
  (SVG data URI, 25 px, per theme in `--curs-up` and `--curs-down`; `js/cursor.js` only sets
  `data-arrow` on `html`), so it is always above everything, also above popovers.
- In fields, dropdown list, settings and in edit mode the system pointer stays; touch stays without a pointer.
- In the heading only the chevron shows the position (no section line); in the topmost, active heading dot and line apply instead; with keyboard navigation (`body.keyboard`) line, chevron and ghost header stay off under the resting mouse pointer.

### Nav and sections dropdown

Chips (`a.secname`), gear and dropdown (`.nav-btn`) sit in one flex row
(`#section-nav-list`), the rest belongs to all equally (`flex: 1 1 auto`). If space
is short, the row overflows to the left (`justify-content: flex-end`): gear and dropdown at the end
stay reachable. The dropdown is a `<button>` (`aria-haspopup`, `aria-expanded`) with an icon and
the word "sec", the chevron turns upward when open.

On narrow touch devices (`device-width` 350–812 px, `hover: none`) the chips and the dropdown give way to the section strip (below); the dropdown stays in the page, hidden by one CSS rule.

Chips and entries of the sections list share the class `a.sec-btn` (built by `sectionButton`):
same base shape, same hover, active and press effects (flat, without shadow in the list, controlled
via `--sb-*` variables). Hover on an entry lights up like hover on the chip: `coupleHover`
couples chip, heading and entry of a section (`.with-hover`). The active chip only follows the scroll position, never the mouse: if the mouse is anywhere in a non-active section (heading, background, tile), its chip shows the soft hover area (`.sec-hover`, a class on the chip while the mouse is in the section), and the active chip stays unchanged. The active section is filled in the open
list and scrolled into view. Names lose a suffix (`tbx.li` → `tbx`).

### Touch (smartphone)

- **No hover:** the pointer kind (`pointerKind`, `isTouch()`) is set on `pointerdown`, real mouse movement resets it; `body.touch` mirrors it into the CSS and switches off all
  `:hover` and `:active` effects that iOS otherwise leaves hanging after a tap; `coupleHover` and the
  glow window ignore touch hover. A tap (pointerdown + pointerup close together, no scroll in between; no `click` event, iOS does not reliably fire it on non-interactive elements) acts like a click: it activates the section
  (chip, heading, background, tile; `lockOn` on click), a swipe activates nothing and releases the lock.
- **Sections dropdown and settings overlay:** entries and buttons are 2.75 rem tall, a tap selects immediately; tap, drag and release opens the list
  and selects the entry under the finger in one go (`touch-action: none` on the field). Both overlays have no shadows on touch devices (no drop shadow, no bevel edges on the entries).
- **Scrolling:** the active section is updated every 80 ms while swiping and confirmed at the end via `scrollend`
  and `whenStill` (two still frames); it counts as active 24 px before snapping. While swiping
  (`html.swiping`, ends only with the finger up; not on the `body`: its class change triggers the re-measure)
  the chips have no hover look. The glow window is a function of the scroll position while scrolling
  (`glowScroll`): between two section top edges it moves from the frame of one to that of the next (top edge =
  scroll position), at the snap point it covers exactly the section. So it runs with the finger, coasting and chip jumps,
  without its own time (no running ahead, lagging or twitching). Only a tap on a section animates it (fixed duration). On the transition from the tap target into the coupling the distance to the frame of the scroll position fades out over 280 ms (smoothstep), the window does not jump. On touch the tile light is off: there is no pointer, and mouse events pushed in by iOS do not count (otherwise the light stayed stuck at the touch point on the screen while the content scrolled underneath). In portrait on the iPhone `scroll-snap-stop` is
  normal: a swipe may skip several sections.

**Highlight transition:** every change of the highlighted section glides the same way (200 ms); only the very first placement on page load
and a layout change are instant (`glow.instant`). In the scroll-driven mode the window follows the scroll position, so there is no transition.

**Taps while the page glides:** iOS passes no touch event to the page while it glides after a swipe (a touch only halts the scroll), so
taps during the glide were lost. The page therefore finishes the glide itself (`cutTail` in `js/touch.js`): once the finger is up, the page
moves at most 3 px per scroll event and is within 60 px of a snap point, the native scrolling and the snapping are switched off for a
moment and the last stretch is animated onto the snap point in 60 to 180 ms (ease-out); a touch ends that animation at once. A tap into
a section is read from `pointerup` and `touchend`, and a touch during a scroll activates its section right at the touch; a touch that iOS
cancels is remembered and activated when the scroll ends.
### Pages on the smartphone

On the smartphone (`isPhone()`, `PHONE_QUERY`) not all sections snap, but **pages** (`buildPages` in `js/glow.js`, during
measuring in `glowMeasure`):

- Two consecutive **half-height** sections (height at most half the content height) form one page: one snap point, both on the screen at once.
- A remaining half-height section stays alone. It gets an empty half-height section behind it (`margin-bottom`, also as the last one), so the page is full
  and a following larger section starts on its own page (three half-height, then a large one: page 1 = two, page 2 = the third with an empty lower half, page 3 = the large one).
- A larger section always starts its own page; if it is taller than the screen, it scrolls freely inside it (the snap point is at its start).
- The snap point is the first section of each page (`.page-start`, `scroll-snap-align: start`). The glow window always covers exactly one section, never the whole page: the first one on screen while scrolling, or the tapped one; arrows, dropdown and strip jump from page to page or to the start of the page of the target (`pageStart`, `jumpBy`).
- There are no pages in edit mode.

### Section strip (narrow touch devices)

The compact bar (fixed, with the strip) applies on touch devices (`hover: none`) that are phones by screen size (device width 350–812 px), or at least 350 px wide in portrait or up to 812 px wide (iPad portrait, Split View). `COMPACT_QUERY` in `js/touch.js` and the media query in `base.css` / `strip.css` are the same; page layout and gestures (`isPhone`) stay on the device-width query. The bar position is the `navPos` setting: at the top the container reserves the room above (`js/grid.js` in grid view), on desktop `order: 1` puts the bar under the container.

The bottom bar is strip | gear; `a.` is the first item of the strip (the home link is hidden there). The gear is `--btn-w` wide (3.35 rem: what the settings overlay needs for its words), so the overlay is exactly as wide as the gear. Choosing `a.` takes the page to the top and activates the first section (`stripTarget`); `a.` itself is never the active item, so the window shows it only while aiming. In the window it is neutral (`--title-col` fill, `--front-body` text), also in icon mode; the sections keep their numbers and colors (`stripColor`). The strip (`js/strip.js`, the strip block of `styles.css`) works like the narrow nav of msmr.dev: a window in the section color shows the full title of the active section (its icon in icon mode), the other sections are numbers (icons) beside it, up to two per side at rest.

- **Aiming:** pressing the strip aims from the active item and the numbers follow the finger one to one. A number holds at the window's edge and steps into the window when it is half a "0" under the edge (in icon mode a quarter of the icon, measured from the visible glyph); the old title is pushed out on the other side in the same 0.15 s (ease-in). The window resizes to the title, never narrower than it; its fill fades over 0.66 s.
- **Choosing:** on release (or a tap on a neighbour) the page scrolls to the page of the chosen section (`jumpTo`), also for the second section of a pair. The section highlight in the page is placed on it at once and then only travels with the page (lock kind `strip`, `js/glow.js`). When the user scrolls the content, the strip follows (`stripSync`).
- **Glides add up:** a second change while the strip moves adds a glide for the difference (`composite: add`) instead of restarting the first. Numbers beyond two items from the window are cut off by a clip that closes with the movement, never faded.
- No long-press menu on the strip items and `a.`. Text and icon size are those of `set` on the gear (`.strip` is 0.9 em of the bar); the text color is `--title-col`.

### Central variables

The first `:root` of `tokens.css` holds the tuning values; `js/touch.js` reads them once
(`readMeasures`): `--glow-duration` (200), `--glow-duration-short` (60), `--glide-power` (2),
`--light-duration` (90), `--light-power` (1.4), `--light-edge-duration` (90), `--light-coverage` (.95),
`--ghost-header-shadow` (.66), `--ghost-header-fade` (2), `--ghost-header-hold` (2500), `--cursor-line-faint` (.33),
`--cursor-line-width`, `--color-pale` (.4), `--pop-duration` (125). Times in ms.
The "Color" setting scales the saturation of all section colors (`oklch`) via `--color-intensity`.

The color values of the themes stand once in the light block (`:root`) and once in the dark one
(`:root[data-theme="dark"]`); the script in the `<head>` always sets `data-theme`, also for "auto".
The pointers belong there too (`--curs-img`, `--curs-sec`, `--curs-hov`, `--curs-up`, `--curs-down`).

## Web app variant (?app)

`https://a.msmr.co/` stays an ordinary page: added to the iOS home screen it is a bookmark that opens in Safari. `https://a.msmr.co/?app` is the same page as a standalone web app: `favicon/app-mode.js` (a script in the head, right after the manifest link) sees the query key `app`, points the manifest link at `favicon/manifest-app.json` (`display: standalone`, `start_url: /?app`, scope `/`) and adds `apple-mobile-web-app-capable` and `apple-mobile-web-app-title` ("a."). iOS reads the manifest and the tags at the moment of "Add to Home Screen", so open `/?app` in Safari and add it from there; both entries can exist side by side. Without `?app` nothing is touched.

What changes in the web app: its own storage (the settings start with their defaults; the edit mode's login is separate from Safari's), no address bar, back button or reload gesture, and after sleeping in the background it shows the old version until it is closed fully. Links to other sites open in a sheet over the app (Apple's WWDC23 talk); `base target="_blank"` and the edit mode there are not verified. Tested in headless Chrome only, not yet on an iPhone or iPad (iOS/iPadOS 27.2 RC).

## Home screen icon (iOS)

`favicon/ico-light-*`: a black "a." (Ubuntu Regular 400) on light grey #e6e6e9 with a thin crisp white outline (1.25 % of the width). `favicon/ico-dark-*`: the same letter in white on dark grey #2a2a2e. The outline is there because iOS darkens the tile of a home screen icon in dark mode but leaves the black letter alone (found on the phone: white outlines survive from 1.25 %, lighter-grey ones from 2 %, thinner ones vanish). The tab favicon links use `media`; iOS ignores `media` on `apple-touch-icon`, so `favicon/touch-icon-inline.js` sets it from script by color scheme when the page loads (iOS takes the icon at the moment of "Add to Home Screen"). The Add to Home Screen sheet of iOS 27.2 fails to load an icon from a network URL and shows a letter tile, so `index.html` embeds both icons as `data:` URIs. The switch is reversible:

```
node tools/touch-icon.js inline   # embed both icons as data: URIs in favicon/touch-icon-inline.js (current; run again after changing an icon file)
node tools/touch-icon.js url      # link ./favicon/ico-light-180.png instead
```

Both variants also copy the light icon to `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png`; `manifest.json` carries it too. iOS keeps the icon from the moment a shortcut is added: to see a change, delete the shortcut, clear the website data for a.msmr.co in Safari and add it again. To make the icons again: render "a." in Ubuntu Regular 400 into the ink box of the old icon (left edge, bottom, width), grow its alpha mask by 1.25 % at 4x, average down and threshold for the crisp outline, then run the `inline` command.

## Editing

Requires a sign-in: open `https://a.msmr.co/edit/` once per browser
(see [docs/htaccess-setup.md](htaccess-setup.md)).

- Entry: gear → bottom button.
- Name and URL of the tiles are directly editable, `×` deletes (undoable until saving),
  `+` adds.
- The handle `⠿` drags a tile, also **into another section** (mouse only).
- Every section heading also has a handle `⠿`: it drags the whole **section** vertically,
  as they stand one below the other in the view (mouse only). The order in the
  DOM is saved; the save dialog mentions "Order of sections". The section colors follow the position.
- Finish: the same button (now a floppy disk). Without a change the page is simply
  reloaded. With a change it asks whether to save; on "No", whether to discard;
  on another "No" editing stays open.
- A section without links is not written when saving.

## Devices

Phone and iPad have their own layouts via `device-width` media queries (height grid in quarter steps; on narrow touch devices the bottom bar is the section strip). Details in the [CHANGELOG](../CHANGELOG.md).

## Performance

Measured with Lighthouse (mobile, simulated slow 4G) on 2026-10-18: score 100, first paint 1.1 s, 110 KB, layout shift 0.000; a returning visitor loads only `index.html` and `links.php` (about 4 KB). What gets it there:

- Everything comes from this server: Ubuntu and Font Awesome are self-hosted, nothing is requested from Google or a CDN.
- The 28 solid icons in use sit in a 3 KB font (`fa-solid-900-subset.woff2`); the full font loads only for another icon.
- `links.php` and `never-dead.json` are requested from the `<head>`, in parallel with the scripts; the scripts are `defer`red.
- No layout shift: the empty container shows no end spacer and the nav row stays hidden until `render()` has finished (`body.rendered`).
- Cache headers (root `.htaccess`): HTML and `links.php` revalidate, CSS/JS/`never-dead.json` one hour (the `?v=` bump busts them), icons one week, fonts one year (immutable, so the Font Awesome folder carries its version).

## Deploy

Plesk pulls `main` automatically; a push therefore deploys. The real data and the password file are not in the repo.
For `.htaccess` to reach CSS, JS and fonts, **Serve static files directly by nginx** (in some Plesk versions: Smart static files processing) must be off for the domain.
Which files do not belong in the web directory is described in
[docs/htaccess-setup.md](htaccess-setup.md). The list itself is public by design: `links.php` serves it to every visitor; only writing (`edit/`) needs the sign-in.

## License

GNU GPL v3, see [LICENSE](../LICENSE).

## Note on the version

In `index.html` a version (`?v=…`) hangs on `styles.css` (and on each `@import` line inside it), every `js/*.js` file, the head scripts in `favicon/`, the tab favicon links and the Font Awesome stylesheet (the same value on all; the smoke test checks it). Raise it once per working session with `npm run bump` (the next letter on the same day, e.g. `2026-10-21l` → `m`; a new day starts as the date alone), otherwise browsers mix old and new files.
