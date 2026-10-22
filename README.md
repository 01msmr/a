# a.msmr.co

My personal start page: all my links, sorted into colored sections and shown as tiles. It opens fast, works with mouse, keyboard and touch (desktop, iPad, iPhone, a TV browser) and edits itself in the browser, so there is no admin tool.

## How it is made

- **Plain web, no build.** Static HTML, CSS and vanilla JavaScript, plus two small PHP scripts that read and write the data. No framework, nothing to compile: what is in the repo is what the server serves.
- **The data is not in the repo.** The links live in `edit/links.json` on the server; a push never touches them. Editing is done in the page itself (gear → edit) behind a basic-auth sign-in.
- **Scripts are split by area** (`js/*.js`, 17 classic scripts that share globals, loaded in a fixed order); each file starts with three header lines saying what it owns, defines and uses, and a test keeps them true.
- **Styles are split by area too:** `styles.css` is the one stylesheet and only lists the others in order: `tokens.css` (fonts, tuning values, color schemes), `base.css` has the base looks and the device media blocks, and one small file each for the strip, edit mode, grid view, settings, hints, ghost headers and the cursor.
- **Phone, iPad and desktop have their own layouts.** On narrow touch devices (phones, iPads in portrait or in a narrow window) the bar is `a.` (fixed at the left), the section strip (the sections as numbers, aimed with the finger) and the gear (like the narrow nav of msmr.dev). The bar sits at the bottom or the top, a setting (`Bar`; keys `b` and `p`); the default is bottom on the strip, top elsewhere.
- **Own hints instead of native tooltips:** one hint element (`js/hint.js`) for every hover hint, placed beside or below the item, mouse only.
- **One font weight** (Ubuntu Regular), self-hosted, like Font Awesome: nothing is loaded from a third party.
- **Cache version:** every file carries `?v=…` in `index.html`; `npm run bump` raises it once per working day.

## What it is for

One address to open any of my things from any device: pick a section, tap a tile. The page remembers the view (tiles or grid, zoom, light/dark, icons or words in the nav, bar at the top or bottom) and has a web app variant (`/?app`) for the iOS home screen.

## Run and test

```
php -S 0.0.0.0:8080 tools/dev-router.php   # local demo, no cache, http://localhost:8080/
npm install                                 # once
npm run check                               # unit tests + smoke test (what the CI runs)
npm run browser                             # checks in real Chrome (layout shift, fonts, icons)
node tools/style-snapshot.mjs save|check FILE.json.gz   # before/after safety net for CSS changes
npm run bump                                # raise the cache version before a push
```

Touch, swipe and glide behavior is tuned on real iPhones and iPads; no automatic test sees it.

## Deploy

Plesk pulls `main`, so **a push deploys**. The data and the password file stay on the server.

## More

- [docs/reference.md](docs/reference.md): every file, every behavior (mouse, keyboard, touch, glow window, strip), data format, editing, performance
- [CLAUDE.md](CLAUDE.md): file map, rules and commands for contributors and AI agents
- [CHANGELOG.md](CHANGELOG.md): what changed when and why
- [docs/htaccess-setup.md](docs/htaccess-setup.md): server and write protection · [docs/es-modules-plan.md](docs/es-modules-plan.md): a possible later migration · [fonts/README.md](fonts/README.md)

GNU GPL v3, see [LICENSE](LICENSE).
