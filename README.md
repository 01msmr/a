# a.msmr.co

Personal start page: links in sections, shown as tiles. Static HTML, CSS and
vanilla JS, plus two small PHP scripts for the data. No framework, no build.

Built for mouse and keyboard on the desktop, iPad and iPhone, and for the browser on a TV.

## Structure

| File | Purpose |
|---|---|
| `index.html` | Skeleton: bar with nav chips, gear and sections dropdown (one button, all in one flex row), content, overlays. The `<head>` holds the scripts for zoom and color scheme (they run before the first paint) |
| `app.js` | Rendering, navigation, settings, edit mode |
| `styles.css` | All looks; color schemes, zoom and grid hang on variables and classes |
| `links.php` | Serves `edit/links.json` (public) |
| `edit/save.php` | Writes the data (basic auth) |
| `edit/check.php` | Checks all URLs and marks dead ones (basic auth); `?write=1` writes the marks |
| `never-dead.json` | Addresses that never count as dead (read by `edit/check.php` and the page) |
| `links.default.json` | Seed, only on the very first request |
| `tools/dev-router.php` | Demo server with `no-store`, local only |
| `tools/touch-icon.js` | Switches the iOS home screen icon between embedded (`node tools/touch-icon.js inline`, the iOS 27.2 workaround, current) and linked (`… url`, the default); also copies the icon to `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` |
| `tools/smoke.js` | Smoke test without a browser (jsdom): loads the page, switches edit mode on, checks the nav structure, click lock, coupled highlight and re-sorting of sections; fails on page errors and infinite loops. `npm install --no-save jsdom && node tools/smoke.js` |
| `favicon/` | Icons and manifest |
| `docs/` | Server, write protection, deploy; design draft for icons and settings |
| `CHANGELOG.md` | What was changed when and why |

The data lives in `edit/links.json` on the server and **not in the repo**
(`.gitignore`). A push therefore never changes it. Details: [docs/htaccess-setup.md](docs/htaccess-setup.md).

## View locally

```
php -S 0.0.0.0:8080 tools/dev-router.php
```

Then `http://localhost:8080/`. The router appends a version number to CSS and JS,
so the browser never shows an old copy.

## Data

`edit/links.json` is an array of sections:

```json
[
  { "id": "sec1", "title": "srv", "icon": "fa-server", "color": "cyan",
    "links": [ { "name": "pass.msmr.co", "url": "https://pass.msmr.co", "dead": true } ] }
]
```

- `icon` is a Font Awesome class (6.7.2, CDN) or `icon-squircle`, a custom icon.
- `dead` marks a link that was not reachable at the last test (red dot; in the grid a square, on the desktop a triangle with 8 px legs, moved 1 px inward and with a white 1 px border, in the top right corner). Exceptions that never count as dead are kept centrally in `never-dead.json` (`allIpAddresses`: every IP address; `hosts`: host names, currently `orderbox` and `kitchen.toolbox-bodensee.de`); `edit/check.php` and the page (`isNeverDead` in `app.js`, also for marks that are already saved) read the same file.
- `color` is not displayed. The section color comes from the palette `SEC_COLORS`
  in `app.js` **by position**. Inserting or moving sections therefore changes
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
- Only the most recently used input counts (mouse **or** keyboard), the other one
  is ignored for the highlight.
- `+` / `-` change the zoom, `0` sets it to S. Ctrl/Cmd stay with the browser zoom.

### Settings (gear in the bar)

The gear is a nav button (`.nav-btn`) next to the sections dropdown. A click opens a
narrow vertical stack with one button per setting. A click cycles to the next value. The button shows the **state**. In text mode that is
a short English word, in icon mode an icon. The hover hint (`title`) names
"now/next value", for the theme all values with the current one in brackets.

| Setting | Values | Text mode | Icon mode |
|---|---|---|---|
| Zoom | S, M | `S`, `M` | `S`, `M` |
| Theme | auto, light, dark | `aut`, `light`, `dark` | circle (auto), sun, moon; in auto the icon of the system value small at the bottom right |
| Color | vivid, pale | `col`, `pale` | circle in a section color |
| Navigation | text, icons | `text` | squircle |
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
| `a.align` | `left` or `center` |
| `a.view` | `chips` or `grid` |

**Zoom:** no detection, the default is S. Sizes are in `rem` and follow
the zoom (tiles, bar, shadow, red dot). The `device-width` media queries for
iPad and iPhone remain device properties and do not follow the zoom.

### Grid view

Square tiles without gloss, 1 px lines. In inactive sections they are gray, in the
colored section light. "Left" means full width here, the bar also runs
across the whole page; the tiles of the sections stay at at most 6 columns and get wider, on narrow screens (smartphone) at least two sit side by side. Empty cells of the last row carry the lines of the tiles. A dead link shows a red square in the corner (on the desktop a triangle with 8 px legs). Edit mode
keeps using the chip layout.

### Glow window and ghost headers

The glowing section (hover, nav chip, keyboard, otherwise the topmost) is a window that glides to the
next one, growing or shrinking on the way (200 ms, accelerating, ends hard; with
reduced motion 60 ms). The color changes abruptly at the section edges. `app.js`
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
`light*` in `app.js`) that glides from tile to tile (90 ms). Out of nowhere it comes in
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
  (SVG data URI, 25 px, per theme in `--curs-up` and `--curs-down`; `app.js` only sets
  `data-arrow` on `html`), so it is always above everything, also above popovers.
- In fields, dropdown list, settings and in edit mode the system pointer stays; touch stays without a pointer.
- In the heading only the chevron shows the position (no section line); in the topmost, active heading dot and line apply instead; with keyboard navigation (`body.keyboard`) line, chevron and ghost header stay off under the resting mouse pointer.

### Nav and sections dropdown

Chips (`a.secname`), gear and dropdown (`.nav-btn`) sit in one flex row
(`#section-nav-list`), the rest belongs to all equally (`flex: 1 1 auto`). If space
is short, the row overflows to the left (`justify-content: flex-end`): gear and dropdown at the end
stay reachable. The dropdown is a `<button>` (`aria-haspopup`, `aria-expanded`) with an icon and
the word "sec", the chevron turns upward when open (on the smartphone, where the list opens upward from the bottom bar, it points up when closed and down when open).

On the iPhone in portrait the chips give way; in the bottom bar dropdown, down and up buttons follow close behind the title, the gear sits at the very right edge
(`#section-nav-list` is `display: contents` there, order via `order`).

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
  and selects the entry under the finger in one go (`touch-action: none` on the field).
- **Scrolling:** the active section is updated every 80 ms while swiping and confirmed at the end via `scrollend`
  and `whenStill` (two still frames); it counts as active 24 px before snapping. While swiping
  (`html.swiping`, ends only with the finger up; not on the `body`: its class change triggers the re-measure)
  the chips have no hover look. The glow window is a function of the scroll position while scrolling
  (`glowScroll`): between two section top edges it moves from the frame of one to that of the next (top edge =
  scroll position), at the snap point it covers exactly the section. So it runs with the finger, coasting, stepper and chip jumps,
  without its own time (no running ahead, lagging or twitching). Only a tap on a section animates it (fixed duration). On the transition from the tap target into the coupling the distance to the frame of the scroll position fades out over 280 ms (smoothstep), the window does not jump. On touch the tile light is off: there is no pointer, and mouse events pushed in by iOS do not count (otherwise the light stayed stuck at the touch point on the screen while the content scrolled underneath). In portrait on the iPhone `scroll-snap-stop` is
  normal: a swipe may skip several sections.

### Pages on the smartphone

On the smartphone (`isPhone()`, `PHONE_QUERY`) not all sections snap, but **pages** (`buildPages` in `app.js`, during
measuring in `glowMeasure`):

- Two consecutive **half-height** sections (height at most half the content height) form one page: one snap point, both on the screen at once.
- A remaining half-height section stays alone. It gets an empty half-height section behind it (`margin-bottom`, also as the last one), so the page is full
  and a following larger section starts on its own page (three half-height, then a large one: page 1 = two, page 2 = the third with an empty lower half, page 3 = the large one).
- A larger section always starts its own page; if it is taller than the screen, it scrolls freely inside it (the snap point is at its start).
- The snap point is the first section of each page (`.page-start`, `scroll-snap-align: start`). The glow window always covers exactly one section, never the whole page: the first one on screen while scrolling, or the tapped one; steppers, arrows and dropdown jump from page to page or to the start of the page of the target (`pageStart`, `jumpBy`).
- There are no pages in edit mode.

### Central variables

The first `:root` of `styles.css` holds the tuning values; `app.js` reads them once
(`readMeasures`): `--glow-duration` (200), `--glow-duration-short` (60), `--glide-power` (2),
`--light-duration` (90), `--light-power` (1.4), `--light-edge-duration` (90), `--light-coverage` (.95),
`--ghost-header-shadow` (.66), `--ghost-header-fade` (2), `--ghost-header-hold` (2500), `--cursor-line-faint` (.33),
`--cursor-line-width`, `--color-pale` (.4), `--pop-duration` (125). Times in ms.
The "Color" setting scales the saturation of all section colors (`oklch`) via `--color-intensity`.

The color values of the themes stand once in the light block (`:root`) and once in the dark one
(`:root[data-theme="dark"]`); the script in the `<head>` always sets `data-theme`, also for "auto".
The pointers belong there too (`--curs-img`, `--curs-sec`, `--curs-hov`, `--curs-up`, `--curs-down`).

## Home screen icon (iOS)

Currently both files are the same transparent PNG with a 60 % grey (#666) "a." and no background (experiment: iOS fills the background itself, and #666 reads on white and black); `git revert` of the commit "Home-Icon: transparent …" brings the light/dark pair back. The home screen icon comes in two versions (the pair before that experiment): `favicon/ico-light-180.png` (black "a." on #eee) and `favicon/ico-dark-180.png` (soft light grey "a." on dark grey, less contrast than white on near-black), both 180×180, opaque, rendered from the page's Ubuntu font with the "a" close to the dot. iOS ignores `media` on `apple-touch-icon`, so a script in `index.html` sets the link from the current color scheme (`matchMedia`); the icon stays as it was when the shortcut was added, so switch the appearance and add the shortcut again to change it. The static link is the fallback without JavaScript. A web shortcut cannot follow the system appearance by itself. On iOS 27.2 the
Add to Home Screen sheet loads the icon with its own loader that fails on any network URL and then shows a letter tile,
although the file is fine and opens in a Safari tab. That is why `index.html` currently embeds both icons as `data:` URIs.
The switch is reversible:

```
node tools/touch-icon.js inline   # embed the icon (current; run again after changing the icon file)
node tools/touch-icon.js url      # default variant: link ./favicon/ico-light-180.png
```

Both versions are switched together by the script (the `ICONS` line) and the fallback link.
Both variants also copy the icon to `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png`. iOS keeps the icon from
the moment a shortcut is added: to see a change, delete the shortcut, clear the website data for a.msmr.co in Safari and add it again.

## Editing

Requires a sign-in: open `https://a.msmr.co/edit/` once per browser
(see [docs/htaccess-setup.md](docs/htaccess-setup.md)).

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

Phone and iPad have their own layouts via `device-width` media queries (height grid in
quarter steps, bottom bar with jump keys). Details in the [CHANGELOG](CHANGELOG.md).

## Deploy

Plesk pulls `main` automatically. The real data and the password file are not in the repo.
Which files do not belong in the web directory is described in
[docs/htaccess-setup.md](docs/htaccess-setup.md).

## License

GNU GPL v3, see [LICENSE](LICENSE).

## Note on the version

In `index.html` a version (`?v=…`) hangs on `styles.css` and `app.js`: increase it on changes,
otherwise browsers mix old and new files.
