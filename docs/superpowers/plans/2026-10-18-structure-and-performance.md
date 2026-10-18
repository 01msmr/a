# Structure, performance and AI-readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `app.js` into focused classic script files with unchanged behavior, make the repo self-explaining for AI agents, and cut load cost and clutter.

**Architecture:** Pure cut of `app.js` into `js/*.js` in the original order (shared `var`/function globals stay), loaded by ordered `<script>` tags; `tools/smoke.js` and `tools/dev-router.php` learn the new file list from `index.html`. Performance work is separate, measured, one commit each.

**Tech Stack:** Plain HTML/CSS/JS (no build), PHP 8 for `links.php`/`edit/`, Apache `.htaccess` on Netcup, jsdom (dev-only, `npm install --no-save jsdom`).

**Spec:** `docs/superpowers/specs/2026-10-18-structure-and-performance-design.md`

## Global Constraints

- Everything in English: identifiers, comments, docs, commit messages. Code comments one line.
- No build step, bundler, framework or runtime npm dependency.
- Behavior of touch, glow, ghost-header, light and cursor code must not change; moves only.
- Original top-to-bottom order of `app.js` is preserved across the files (top-level statements run at load).
- `?v=` cache version is bumped only at the end of the day's session, by the user's rule; all `js/*.js` tags carry the same value.
- No commit before the user has said commits are allowed for this work; **never push** without the user's explicit go (the server pulls the repo, a push deploys).
- Never delete a file that is not clearly dead without the user's approval; list it first.
- Reference files for iOS icons at the repo root (`apple-touch-icon*.png`) must not move.
- Server facts to verify, not assume: `.htaccess` is honored (it is for `edit/`); live headers are unknown until `curl -I`.

## Review Focus

- Load order: a top-level call (`applyPrefs()`, `readMeasures()`, `gridInit` listeners, `fetch('never-dead.json')`) running before the file defining its helpers exists. Pinned by Task 1 (concatenation equals original) and Task 2 (smoke test loads files in `index.html` order).
- A cut inside a function or a block. Pinned by `node --check` on every file in Task 1.
- Old and new JS mixed after a deploy (one file cached, another fresh). Pinned by Task 2: every script tag has the identical `?v=` value.
- Root `.htaccess` taking the whole site down (HTTP 500) or blocking something the page needs (`never-dead.json`, `favicon/manifest.json`, `links.php`). Pinned by the curl matrix in Task 6.
- `edit/` losing its basic auth or `links.php` its public access after the root `.htaccess`. Pinned by the same matrix (`/edit/` → 401, `/links.php` → 200).
- Self-hosted Font Awesome missing a glyph the live data uses (icon names come from `links.json`, e.g. `fa-brands`). Pinned by Task 7's glyph audit.

---

### Task 0: Branch and baseline

**Files:**
- Create (outside repo): `/private/tmp/claude-502/-Users-uli-github-projects-a/dface7b5-37a5-4053-8f08-aa9f76960af6/scratchpad/app.orig.js`

**Interfaces:**
- Produces: branch `refactor/split-app-js`; reference copy `app.orig.js` of `app.js` at the starting commit; a green baseline smoke run.

- [ ] **Step 1: Create the branch** — `git switch -c refactor/split-app-js` (currently on `main`, tree clean except the two new `docs/superpowers` files, which are kept).
- [ ] **Step 2: Save the reference** — `git show HEAD:app.js > <scratchpad>/app.orig.js`; record `wc -l` (expect 2355).
- [ ] **Step 3: Baseline smoke** — `npm install --no-save jsdom && node tools/smoke.js`. Expected: prints `OK`. If it does not, stop and report; nothing below is verifiable.
- [ ] **Step 4: Ask the user** whether local commits are allowed for this work; if yes, commit the two `docs/superpowers` files on the branch (`docs: design and plan for structure and performance`).

### Task 1: Cut `app.js` into `js/*.js`

**Files:**
- Create: `js/prefs.js`, `js/render.js`, `js/active-section.js`, `js/touch.js`, `js/glow.js`, `js/ghost-header.js`, `js/light.js`, `js/cursor.js`, `js/grid.js`, `js/navigation.js`, `js/links.js`, `js/settings.js`, `js/boot.js`, `js/edit.js`
- Modify: none yet (`app.js` stays until Task 2)

**Interfaces:**
- Consumes: `app.orig.js` from Task 0.
- Produces: the 14 files above, in this load order; each begins with a 3-line header comment `// Owns: …` / `// Defines globals: …` / `// Uses: …` (file names, one line each). Concatenating the files with the headers removed equals `app.orig.js` byte for byte.

Start line ranges of `app.orig.js` (from the spec; move a start to the preceding contiguous comment or `var` line when that line belongs to the file, never reorder code):

| File | Start | End |
|---|---|---|
| prefs | 1 | 35 |
| render | 36 | 294 |
| active-section | 295 | 364 |
| touch | 365 | 555 |
| glow | 556 | 860 |
| ghost-header | 861 | 1104 |
| light | 1105 | 1335 |
| cursor | 1336 | 1436 |
| grid | 1437 | 1545 |
| navigation | 1546 | 1654 |
| links | 1655 | 1683 |
| settings | 1684 | 1973 |
| boot | 1974 | 2006 |
| edit | 2007 | 2355 |

- [ ] **Step 1: Write the check first** — a throwaway script `<scratchpad>/check-split.sh` that strips lines starting with `// Owns:`, `// Defines globals:`, `// Uses:` from `js/*.js` concatenated in the table order and `diff`s the result against `app.orig.js`; prints `IDENTICAL` or the diff.
- [ ] **Step 2: Run it** — expect failure (`js/` empty).
- [ ] **Step 3: Cut the files** with `sed -n 'START,ENDp' <scratchpad>/app.orig.js` per row, then prepend each header. Read each cut edge: it must fall between top-level statements; adjust per the rule above if a function or its leading comment is split.
- [ ] **Step 4: Run the check** — expected `IDENTICAL`.
- [ ] **Step 5: Syntax-check each file** — `for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done`. Expected: no output.
- [ ] **Step 6: Commit** (if allowed) — `refactor: cut app.js into js/ files (not yet loaded)`.

### Task 2: Load the split files; update tooling and docs

**Files:**
- Modify: `index.html` (the `<script src="app.js?v=…">` line), `tools/smoke.js` (lines 1, 26, 43), `tools/dev-router.php` (line 17), `README.md` (file table line 13 and prose mentions of `app.js`), `docs/htaccess-setup.md` (tree, line 5 and 27)
- Delete: `app.js`

**Interfaces:**
- Consumes: `js/*.js` from Task 1.
- Produces: 14 `<script src="js/NAME.js?v=2026-10-17bo"></script>` tags in table order; `tools/smoke.js` evaluating every file listed in `index.html`'s `js/` script tags in that order.

- [ ] **Step 1: Make the smoke test the failing test** — in `tools/smoke.js` replace the single `w.eval(readFileSync('app.js'))` with a loop over `[...html.matchAll(/<script src="(js\/[^"?]+)[^>]*><\/script>/g)]` (from the unmodified `index.html` text, taken before the `.replace` that strips the tag; change that `.replace` to strip all `js/` tags), evaluating each file's source in order. Also fail with message `no js/ scripts found in index.html` when the match list is empty.
- [ ] **Step 2: Run it** — `node tools/smoke.js`. Expected: FAIL (`no js/ scripts found`), because `index.html` still has `app.js`.
- [ ] **Step 3: Switch `index.html`** — replace the `app.js` tag by the 14 tags, same `?v=` value on all.
- [ ] **Step 4: Update `tools/dev-router.php`** — its asset list `['styles.css', 'app.js']` becomes `styles.css` plus every `js/*.js` (glob), still appending the version and `no-store`.
- [ ] **Step 5: Run the smoke test** — expected `OK`. Then confirm all tags share one version: `grep -o 'js/[a-z-]*\.js?v=[^"]*' index.html | sed 's/.*?v=//' | sort -u | wc -l` → `1`.
- [ ] **Step 6: Delete `app.js`** (`git rm app.js`) and rerun the smoke test → `OK`.
- [ ] **Step 7: Update docs** — README table row `app.js` → `js/*.js` with a pointer to `CLAUDE.md`; replace remaining `app.js` mentions with the owning file (`cutTail` → `js/touch.js`, `buildPages` → `js/glow.js`, `light*` → `js/light.js`, etc., found via `grep -n "app.js" README.md docs/*.md`); update the `htaccess-setup.md` tree. `grep -rn "app\.js" . --include='*.md' --include='*.js' --include='*.php' --include='*.html'` must list no stale references (CHANGELOG history entries excepted).
- [ ] **Step 8: Manual check (user)** — ask the user to run `php -S 0.0.0.0:8080 tools/dev-router.php` and look at it on desktop and iPhone (scroll, swipe snap, highlight, hover, edit mode). Wait for their OK. Announce before opening any browser, per their standing preference.
- [ ] **Step 9: Commit** (if allowed) — `refactor: load js/ files instead of app.js; update smoke test, dev router and docs`.

### Task 3: `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`
- Modify: `README.md` (one line pointing to it)

**Interfaces:**
- Consumes: final file list from Task 2.

- [ ] **Step 1: Write `CLAUDE.md`** (English, ≤ 80 lines) with these sections: what the project is (2 lines); file map (one line per `js/` file from Task 1's table plus `styles.css`, `index.html`, `links.php`, `edit/`, `tools/`, `docs/`); rules (English only incl. UI/docs, one-line comments, `?v=` once per day on all tags, original load order and header comments in `js/*.js`, tuned touch/glow code verified on iOS before changing, deploy = server pull so never push without asking, `edit/` is auth-protected and `links.json` is server data not in git); commands (`php -S 0.0.0.0:8080 tools/dev-router.php`, `node tools/smoke.js`, `node --check js/FILE.js`).
- [ ] **Step 2: Verify the map** — every path in the file map exists (`for p in …; do test -e "$p" || echo MISSING $p; done` → no output).
- [ ] **Step 3: Commit** (if allowed) — `docs: add CLAUDE.md with file map, rules and commands`.

### Task 4: ES-modules plan document

**Files:**
- Create: `docs/es-modules-plan.md`

- [ ] **Step 1: Write the document** from spec Part 4: why later; migration order (leaf `prefs`, `links`, `edit`; then `render`, `settings`, `grid`, `navigation`; last the `touch`/`glow`/`ghost-header`/`light`/`cursor` cluster); per-file steps (wrap, `export`/`import`, replace shared globals by a per-file or shared `state` object, update `smoke.js`); the cache-busting decision (import map with versioned URLs vs. hash step) marked as open; done-when (each step ships alone, passes `smoke.js` and the iOS check). Include a table of the 33 shared globals from `grep -nE "^(let|var|const) " js/*.js` with owning file and files that read them (`grep -l`).
- [ ] **Step 2: Check the table** — every global in the table appears in `grep -c`-style output above; row count equals the grep count.
- [ ] **Step 3: Commit** (if allowed) — `docs: plan for a later ES-modules migration`.

### Task 5: Performance baseline

**Files:**
- Create: `docs/performance-baseline.md`

- [ ] **Step 1: Tell the user** you are about to send read-only requests to `https://a.msmr.co/` (and the CDNs it names), then run `curl -sI` for `/`, `/styles.css`, `/js/prefs.js` (after deploy only; before deploy use `/app.js`), `/links.php`, `/favicon/manifest.json`, `/favicon/ico-light-180.png`, `/README.md`, `/docs/htaccess-setup.md`, `/edit/`, `/never-dead.json`.
- [ ] **Step 2: Record** per URL: status, `Content-Encoding`, `Cache-Control`/`Expires`, `Content-Length`, whether `docs/`, `README.md` are publicly readable. Also record transferred sizes of the Google Fonts and cdnjs requests (`curl -sI` plus `-w '%{size_download}'` on a GET).
- [ ] **Step 2b: Inline weight** — list the byte size of each inline `<script>` and `data:` URI in `index.html` (`awk`/`wc -c` per block); record them. The base64 touch icon and the theme/zoom scripts stay by design; flag anything else over 2 KB.
- [ ] **Step 3: Write `docs/performance-baseline.md`** with the table and one line per finding (missing compression, missing long cache, publicly readable docs). Later tasks cite it.
- [ ] **Step 4: Commit** (if allowed) — `docs: performance baseline of the live site`.

### Task 6: Root `.htaccess` (compression, cache, block non-site files)

**Files:**
- Create: `.htaccess`
- Modify: `docs/htaccess-setup.md` (new section "Root .htaccess"), `docs/performance-baseline.md` (after-column)

**Interfaces:**
- Consumes: findings from Task 5; only directives for gaps it recorded are added.
- Produces: `.htaccess` with (a) `mod_deflate` for html/css/js/json/svg (and brotli if the server reported support), (b) `Cache-Control: public, max-age=31536000, immutable` for `favicon/` and image files, `public, max-age=604800` for `styles.css`/`js/*.js` (the `?v=` busts them), `no-cache` for HTML, `links.php` and `never-dead.json`, (c) `Require all denied` for `docs/`, `tools/`, `*.md`, `LICENSE`, `links.default.json`, `.git*`, `.claude/`.

- [ ] **Step 1: Write the expectation** as a script `<scratchpad>/headers-check.sh` taking a base URL and printing PASS/FAIL per row: `/` 200 + gzip/br; `/js/prefs.js` 200 + max-age ≥ 604800; `/favicon/ico-light-180.png` immutable; `/links.php` 200 + `no-cache`; `/never-dead.json` 200; `/favicon/manifest.json` 200; `/README.md`, `/docs/htaccess-setup.md`, `/tools/smoke.js`, `/CLAUDE.md`, `/links.default.json`, `/.claude/settings.local.json` → 403 or 404; `/edit/` → 401; `/edit/links.json` → 401.
- [ ] **Step 2: Run against the live site** — expected FAIL on the rows Task 5 found missing.
- [ ] **Step 3: Write `.htaccess`** wrapping every block in `<IfModule …>` so a missing module cannot cause a 500. Use `FilesMatch`/`RedirectMatch 403` only for the paths listed; do not touch `edit/` (own `.htaccess`).
- [ ] **Step 4: Local sanity** — `php -l` is not applicable; run `apachectl configtest` only if Apache is installed, otherwise re-read each directive against the Apache 2.4 docs.
- [ ] **Step 5: Ask the user for the push** (deploy = server pull). On their go, push the branch per their instructions, wait for the server to update, run `headers-check.sh https://a.msmr.co`. Expected: all PASS, especially `/edit/` → 401 and `/links.php` → 200. On any 500 or wrong row, tell the user at once and propose `git revert` of this commit.
- [ ] **Step 6: Commit** (if allowed) — `perf: add root .htaccess for compression, caching and blocking non-site files`.

### Task 7: Self-host fonts

**Files:**
- Create: `fonts/ubuntu-300.woff2`, `vendor/fontawesome/css/all.min.css`, `vendor/fontawesome/webfonts/fa-solid-900.woff2` (plus other families only if the audit finds them), `fonts/README.md` (source, version, license)
- Modify: `index.html` lines 54–55 (the two `<link>` tags), `styles.css` (`@font-face` for Ubuntu with `font-display: swap`)

**Interfaces:**
- Consumes: the Font Awesome 6.7.2 release currently linked from cdnjs; Ubuntu 300 latin from Google Fonts.

- [ ] **Step 1: Glyph audit (the failing check)** — list every `fa-*` class and family in use: `grep -ohE "fa-(solid|regular|brands)|fa-[a-z0-9-]+" js/*.js index.html styles.css links.default.json | sort -u`, plus the icon fields of the live `edit/links.json` (ask the user to paste its `icon` values or run the check on the server copy; without it, keep every family). Write the result to `fonts/README.md`.
- [ ] **Step 2: Download into a fresh empty directory** under the scratchpad (untrusted files): Font Awesome Free 6.7.2 `all.min.css` and the needed `webfonts/*.woff2` from cdnjs; the Ubuntu 300 latin woff2 via the Google Fonts CSS. Verify with `file` that each is woff2/CSS, then copy into the repo paths above. Keep the Font Awesome license header in the CSS.
- [ ] **Step 3: Switch `index.html`** — remove the googleapis and cdnjs links; add `<link rel="stylesheet" href="vendor/fontawesome/css/all.min.css?v=2026-10-17bo">` and `<link rel="preload" href="fonts/ubuntu-300.woff2" as="font" type="font/woff2" crossorigin>`; keep a `font-family` fallback in `styles.css`.
- [ ] **Step 4: Run** — `node tools/smoke.js` → `OK`; `grep -n "googleapis\|cdnjs" index.html styles.css js/*.js` → no output (smoke.js's own strip regex may stay).
- [ ] **Step 5: Manual check (user)** — dev router on desktop and iPhone: all icons and the Ubuntu text render, in light and dark; no layout jump at load. Wait for OK.
- [ ] **Step 6: Commit** (if allowed) — `perf: self-host Ubuntu and Font Awesome`.

### Task 8: Repo root and `favicon/` tidy (report first)

**Files:**
- Create: `docs/cleanup-candidates.md` (temporary; removed at the end of this task)
- Modify/Delete/Move: only after the user approves the list

- [ ] **Step 1: Find references** — for every file in the repo root and `favicon/`, `grep -rn "<basename>" index.html styles.css js/ favicon/manifest.json favicon/browserconfig.xml README.md docs/ links.default.json`; also check `git log --oneline -- <file>` for the last touch.
- [ ] **Step 2: Write `docs/cleanup-candidates.md`** — three lists: referenced (keep), unreferenced but possibly requested by browsers/iOS by convention (`favicon.ico`, `apple-touch-icon*.png` at root: keep), unreferenced and not conventional (candidates). Mark the loose root PNGs (`a ORIG.png`, `a.png`, `a-light.png`, `c-*.png`, `jp.png`) individually.
- [ ] **Step 3: Present the candidates to the user** and wait. They answer per file or group: delete, move to `assets/`, keep.
- [ ] **Step 4: Apply only what was approved** with `git rm`/`git mv`; rerun `node tools/smoke.js` and `grep` that no reference broke; user checks the page and the iOS home-screen icon still load.
- [ ] **Step 5: Remove the temporary report; commit** (if allowed) — `chore: remove unused icons and move source images to assets/`.

### Task 9: CSS audit (report only)

**Files:**
- Create: `docs/css-audit.md`

- [ ] **Step 1: List selector candidates for removal** — extract class names from `styles.css`, check each against `index.html`, `js/*.js` (string and `classList` use, including class names built by concatenation such as `'sec-' + n`), and list those with zero hits.
- [ ] **Step 2: Write `docs/css-audit.md`** with the candidate list, each marked "safe" or "dynamic, check by hand", and a recommendation (remove / leave). Do not edit `styles.css` in this task.
- [ ] **Step 3: Hand the report to the user**; any removal becomes its own follow-up with a smoke run and a manual look.

### Task 10: Close out

- [ ] **Step 1: Final verification** — `node tools/smoke.js` → `OK`; `for f in js/*.js; do node --check "$f"; done` → silent; `git status --short` clean; `grep -rn "app\.js" index.html tools js` → no output.
- [ ] **Step 2: Remind the user** of the day-end `?v=` bump (all `js/*.js` tags, `styles.css`, and the font CSS link move together), and that merging/pushing `refactor/split-app-js` to `main` deploys it. Offer `superpowers:finishing-a-development-branch`.
