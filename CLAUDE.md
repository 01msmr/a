# a.msmr.co

Personal start page: links in sections, shown as tiles. Static HTML, CSS and vanilla JS, two small PHP scripts for the data. No framework, no build step. Details: `README.md`; server and write protection: `docs/htaccess-setup.md`.

## File map

- `index.html`: skeleton, inline theme/zoom scripts (run before first paint), `favicon/touch-icon-inline.js` (sets the iOS icon as a data: URI) and `favicon/app-mode.js` (`?app`, the standalone web app variant), both synchronous in the head, ordered `<script src="js/…">` tags
- `tokens.css` (fonts, tuning values in the first `:root`, color schemes, linked first), `styles.css` (base looks, device media blocks); one area each in `strip.css`, `edit.css`, `grid.css`, `settings.css`, `ghost-header.css`, `cursor.css` (linked after it, in that order). After a CSS change run `node tools/style-snapshot.mjs check FILE.json.gz` against a snapshot taken before (see the tool's header)
- `js/*.js`: classic scripts sharing globals, **loaded in this order** (the order in `index.html` is the single source of truth, `tools/smoke.js` reads it)
  - `state` the variables several files share (`lock`, `glow`, `light`, `cursor`, `measures`, …); every initial value is a plain literal, so it loads first. New cross-file state goes here
  - `prefs` view preferences
  - `render` section colors, icons, sections list, `render(data)`
  - `active-section` which section is current (`whenStill`, `trackActiveSection`)
  - `touch` CSS measures, pointer kind, click lock, swipe, tail snap after the glide
  - `glow` highlight glow, phone pages, scroll sync
  - `ghost-header` copies of the section heading at the edges
  - `light` hover light gliding from tile to tile
  - `cursor` line pointer
  - `grid` grid layout, focus on content
  - `navigation` jumping between sections and links (keys, mouse tile)
  - `strip` section strip in the bottom bar of narrow touch devices (aiming like msmr.dev: numbers beside a window that shows the title)
  - `links` never-dead check, link items
  - `settings` settings overlay
  - `boot` loads data, starts the page
  - `edit` edit mode, drag and sort, change detection, saving
- `links.php` serves `edit/links.json` (public); `edit/` (basic auth): `save.php`, `check.php`, data
- `never-dead.json`, `links.default.json` (seed), `favicon/` (icons used by the page, the manifests, the two head scripts), `fonts/` (Ubuntu Regular, the one weight: no bold anywhere), `vendor/fontawesome-6.7.2/` (self-hosted), `assets/` (cursor images used by styles.css, plus source images), `tools/`, `package.json` (test tools and scripts), `.github/workflows/tests.yml`, `docs/`, `CHANGELOG.md`

Each `js/*.js` starts with three header lines: what it owns, which globals it defines, which files it uses. Keep them true when you move code.

## Rules

- Everything in English: code, identifiers, comments, UI texts, docs, commit messages.
- Code comments: one line. Put reasons in your reply or the CHANGELOG.
- Top-level statements run at load, so the file order matters. A call at the top of one file must only use things defined in earlier files or in the same file.
- Touch, swipe, glide and glow behavior is tuned on real iOS devices. Do not change it without checking on an iPhone/iPad; `tools/smoke.js` cannot see it.
- Cache version: the `?v=` value is increased once at the end of the day's session with `npm run bump`, on **every** `?v=` in `index.html` (styles, all `js/*.js`, the head scripts, favicon links, Font Awesome CSS) with one value; `tools/smoke.js` fails on mixed values.
- The server pulls this repo, so a push deploys. Never push without the user saying so.
- `edit/links.json` is server data and not in git. Never commit it.
- Logic changes: write a test first when it can be tested (see global TDD rule); CSS, layout and texts are checked by hand.

## Commands

- Local demo (no cache): `php -S 0.0.0.0:8080 tools/dev-router.php`
- Once: `npm install` (jsdom, puppeteer-core)
- Checks: `npm run check` = unit tests + smoke test (prints `OK`); separately `npm test` (`node --test`: `tools/*.test.js`, add a test when you change logic in `js/`; the jsdom setup is `tools/page-env.js`; `headers.test.js` fails if a "Defines globals" line is not true) and `npm run smoke`
- Browser checks (layout shift, settings word size, Apple logo, icon glyphs): `npm run browser` (`node tools/browser-checks.mjs [url]`); needs Chrome (`CHROME_PATH` if it is not found). Run it after changes to `styles.css`, the settings overlay or the loading order
- Raise the cache version: `npm run bump`
- Syntax check one file: `node --check js/FILE.js`
