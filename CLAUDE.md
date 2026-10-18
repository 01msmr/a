# a.msmr.co

Personal start page: links in sections, shown as tiles. Static HTML, CSS and vanilla JS, two small PHP scripts for the data. No framework, no build step. Details: `README.md`; server and write protection: `docs/htaccess-setup.md`.

## File map

- `index.html`: skeleton, inline theme/zoom scripts (run before first paint), `favicon/touch-icon-inline.js` (sets the iOS icon as a data: URI, synchronous in the head, no assets inline), ordered `<script src="js/…">` tags
- `styles.css`: all looks; tuning values in the first `:root`
- `js/*.js`: classic scripts sharing globals, **loaded in this order** (the order in `index.html` is the single source of truth, `tools/smoke.js` reads it)
  - `prefs` view preferences and shared state (`lock`, `jumperValue`, `selJump`)
  - `render` section colors, icons, sections list, `render(data)`
  - `active-section` which section is current (`whenStill`, `trackActiveSection`)
  - `touch` CSS measures, pointer kind, click lock, swipe, tail snap after the glide
  - `glow` highlight glow, phone pages, scroll sync
  - `ghost-header` copies of the section heading at the edges
  - `light` hover light gliding from tile to tile
  - `cursor` line pointer
  - `grid` grid layout, focus on content
  - `navigation` jumping between sections and links (keys, mouse tile)
  - `links` never-dead check, link items
  - `settings` settings overlay
  - `boot` loads data, starts the page
  - `edit` edit mode, drag and sort, change detection, saving
- `links.php` serves `edit/links.json` (public); `edit/` (basic auth): `save.php`, `check.php`, data
- `never-dead.json`, `links.default.json` (seed), `favicon/`, `tools/`, `docs/`, `CHANGELOG.md`

Each `js/*.js` starts with three header lines: what it owns, which globals it defines, which files it uses. Keep them true when you move code.

## Rules

- Everything in English: code, identifiers, comments, UI texts, docs, commit messages.
- Code comments: one line. Put reasons in your reply or the CHANGELOG.
- Top-level statements run at load, so the file order matters. A call at the top of one file must only use things defined in earlier files or in the same file.
- Touch, swipe, glide and glow behavior is tuned on real iOS devices. Do not change it without checking on an iPhone/iPad; `tools/smoke.js` cannot see it.
- Cache version: the `?v=` value is increased once at the end of the day's session, on `styles.css` and on **all** `js/*.js` tags together (otherwise old and new files mix).
- The server pulls this repo, so a push deploys. Never push without the user saying so.
- `edit/links.json` is server data and not in git. Never commit it.
- Logic changes: write a test first when it can be tested (see global TDD rule); CSS, layout and texts are checked by hand.

## Commands

- Local demo (no cache): `php -S 0.0.0.0:8080 tools/dev-router.php`
- Smoke test: `npm install --no-save jsdom && node tools/smoke.js` (prints `OK`)
- Syntax check one file: `node --check js/FILE.js`
