# Structure, performance and AI-readiness — design

Date: 2026-10-18 · Status: awaiting approval

## Intent

a.msmr.co should be easy to read, change and grow, for people and for AI agents, and fast to serve.
Today `app.js` is one 2,355-line classic script with ~150 functions sharing 33 top-level `var` globals.
Reading any part means loading all of it; changing one effect risks the others.

## Goals

1. Split `app.js` into focused files along its existing seams, **behavior unchanged**.
2. Make the repo self-explaining: a `CLAUDE.md` with the file map, the rules that bite, and the test/verify commands.
3. Faster first paint and cheaper repeat visits (third-party blocking loads, cache headers, compression, inline weight).
4. Tidy the repo root and `favicon/`.
5. Write a plan for a later, optional migration to ES modules.

## Non-goals

- No build step, bundler, framework or npm runtime dependency (jsdom stays a dev-only `--no-save` install).
- No rewrite of touch, glow, ghost-header or light/cursor logic. Moves only.
- No change to the data flow (`links.php`, `edit/`, basic auth).
- ES modules are planned here, not done.

## Anti-goals (failure even if it "works")

- Any visible or felt change in scrolling, swipe, tail snap, highlight or hover on iOS or desktop.
- A split that needs an exact tool or load order nobody can discover from the files.
- Cache busting that silently serves old JS next to new HTML.

## Constraints

- Everything in English (identifiers, comments, docs). Comments one line; reasons go in the reply.
- Classic `<script>` tags, shared globals stay; top-level statements run at load, so **original order is preserved**.
- Cache bump `?v=` stays manual, once at the end of the day's session.
- TDD (light): there is no unit-test setup; verification is `node --check` per file, `node tools/smoke.js`, and a manual look in the browser. No test framework is added without asking.
- Deployment: the Netcup server pulls the repo itself, so new files (`js/`) go live once committed and pushed; ignored files never do. The pull also puts `docs/`, `tools/`, `CLAUDE.md` and `*.md` into the web root, so they are publicly fetchable unless blocked.
- Server is Apache on Netcup; headers can only be set via `.htaccess` (not in the repo today, see `docs/htaccess-setup.md`).

## Part 1 — Split `app.js`

Files in `js/`, loaded in this order (line ranges are today's `app.js`, so the split is a pure cut):

| File | Lines | Owns |
|---|---|---|
| `prefs.js` | 1–35 | view preferences, `applyPrefs()` |
| `render.js` | 36–295 | section colors, icons, buttons, jumper list, `render(data)` |
| `active-section.js` | 296–365 | `whenStill`, `trackActiveSection` |
| `touch.js` | 366–555 | measures, pointer kind, click lock, swipe, tail snap |
| `glow.js` | 556–860 | highlight glow, pages, scroll sync |
| `ghost-header.js` | 861–1104 | ghost header layers |
| `light.js` | 1105–1335 | light/inversion effect |
| `cursor.js` | 1336–1436 | cursor target |
| `grid.js` | 1437–1545 | grid layout, focus on content |
| `navigation.js` | 1546–1654 | jump/link navigation, keyboard |
| `links.js` | 1655–1683 | never-dead, link items, mouse tile |
| `settings.js` | 1684–1973 | settings panel and its icons |
| `boot.js` | 1974–2006 | `withApp`, `never-dead.json` fetch, start |
| `edit.js` | 2007–2355 | edit mode, drag/sort, change detection, save |

Each file starts with a short header: what it owns, which globals it defines, which other files' globals it uses.
`index.html` loads them as `<script src="js/x.js?v=…">` in the table order.

**Verification that nothing changed:** concatenating the files in order, minus the headers, must equal the old `app.js` byte for byte. Then `node --check` on each file, `node tools/smoke.js` (updated to load all files), and a manual check in desktop and iOS Safari. `app.js` is deleted only after these pass.

**Open point for the builder:** the table's boundaries are approximate; move a boundary to the nearest section comment or function edge if a cut falls inside a function. The byte-for-byte check is the guard.

## Part 2 — AI-readiness

- `CLAUDE.md` (English, short): what the project is, the file map above, the rules (English only, one-line comments, `?v=` once per day, original load order, never touch tuned touch/glow behavior without checking on iOS), the commands (`php -S … tools/dev-router.php`, `node tools/smoke.js`, `node --check`).
- README and CHANGELOG stay. README gets a pointer to `CLAUDE.md`; the file map lives in `CLAUDE.md` only, not duplicated.
- Optional `llms.txt`: **not built** (YAGNI; nothing in the app is meant to be read by external crawlers).

## Part 3 — Performance (after the split)

Measured first, changed second; each item is its own commit.

1. **Fonts and Font Awesome:** check which Font Awesome icons are really used; if few, replace the whole cdnjs stylesheet with inline SVG or a subset, else add `preconnect` and `font-display: swap`. Self-host Ubuntu 300 (one woff2) to drop the Google Fonts round trip.
2. **Inline weight in `index.html`:** the base64 touch icon (deliberate iOS workaround) stays; the theme/zoom scripts stay inline (needed before first paint). Verify nothing else is large.
3. **Cache headers and compression:** add a root `.htaccess` (deflate/brotli, long `Cache-Control` for `favicon/` and images, `no-cache` + revalidation for HTML and `links.php`). **Unverified today:** check the live headers with `curl -I` first and only add what is missing. The `?v=` bump keeps CSS/JS busting working.
4. **Block non-site files:** the root `.htaccess` denies `docs/`, `tools/`, `*.md`, `LICENSE` (except what the site needs) so the pull does not publish them. Check with `curl -I` after deploy.
5. **Repo root and `favicon/`:** list which icon files `index.html`, `manifest.json` and `browserconfig.xml` actually reference; move or delete unreferenced ones; move the loose root PNGs (`a ORIG.png`, `c-line*.png`, `jp.png`, …) into `assets/` if unreferenced by the site, delete only with approval. iOS icon URLs referenced anywhere (`apple-touch-icon*.png` at the root) must not move.
6. **CSS:** `styles.css` is 58 KB. Look for dead rules and duplicated blocks; split only if it clearly helps (not planned).

## Part 4 — ES-module plan (later, optional)

Written to `docs/es-modules-plan.md` as part of this work; not executed.

- Why later: the 33 shared globals and load-time listeners make a direct conversion a design task.
- Order: leaf files first (`prefs`, `links`, `edit`), then `render`, `settings`, `grid`, `navigation`, and last the coupled `touch`/`glow`/`ghost-header`/`light`/`cursor` cluster.
- Per file: wrap in a module, `export` what others use, import what it uses, replace the global state with a per-file or shared `state` object, update `smoke.js` to load modules.
- Cache busting under modules: either an import map with versioned URLs, or a content-hash step; decided then.
- Done when each step ships alone and passes the same checks as Part 1.

## Left to the builder

Exact cut points within ±20 lines, header wording, `.htaccess` directives that match the live server, and which favicon files are safe to drop.

## My calls (not yet confirmed by you)

- Directory name `js/` and file names above.
- Updating `tools/smoke.js` to load the split files.
- Self-hosting the Ubuntu font.
- No `llms.txt`.
- Moving the root PNGs to `assets/` (only after checking references).
- Not committing this document until you say so.
