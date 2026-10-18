# Performance baseline (2026-10-18, live a.msmr.co before the js/ split was deployed)

Measured with `curl -sI` / `curl -w '%{size_download}'`, `Accept-Encoding: gzip, br`.

## Server

- `server: nginx`, HTTP/2. `edit/.htaccess` basic auth works, so Apache runs behind nginx (typical Plesk setup). Static files are answered by nginx itself (nginx-style ETags like `"5912-…-gzip"`); PHP goes through Apache.
- Text files are already compressed: `br` for CSS/JS/JSON, `gzip` for HTML. Images and `.md` files are not (fine for PNG).

## Findings

| Item | State | Consequence |
|---|---|---|
| `Cache-Control` / `Expires` on own static files (HTML, CSS, JS, PNG, manifest) | none | browsers revalidate heuristically; `?v=` only helps CSS/JS |
| `links.php` | `Cache-Control: no-cache` | fine |
| `/README.md`, `/docs/htaccess-setup.md`, `/tools/smoke.js`, `/links.default.json` | HTTP 200, public | files that are not part of the site are published by the server pull |
| `/CLAUDE.md` | 404 now (not pulled yet) | will become public after the next pull unless blocked |
| `/edit/`, `/edit/links.json` | 401 | protection works |
| Fonts | Google Fonts CSS 538 B + font file; Font Awesome CSS 18,183 B + `fa-solid-900.woff2` 158,220 B (cdnjs, `immutable`, 1 year) | two extra origins to connect to before first paint; CSS is render-blocking |
| Own transfer sizes | `/` 6,854 B (gzip), `app.js` 29,182 B (br), `styles.css` 14,177 B (br) | small already |
| Inline in `index.html` | two scripts: 1,141 B and 828 B (theme, zoom: needed before first paint); the 11 KB icon data URIs were moved to `favicon/touch-icon-inline.js` on 2026-10-18 | nothing else inline over 2 KB |

## What this changes in the plan

- No compression work needed (already on).
- Cache headers and blocking non-site files cannot be assumed to work through `.htaccess`: nginx answers static files itself. The root `.htaccess` is tried first and verified after deploy with `curl -I`; if static files ignore it, the same rules go into the Plesk panel (Apache & nginx settings → additional nginx directives), because they cannot live in this repo.
- Self-hosting the fonts removes two origins and one render-blocking stylesheet; the 158 KB Font Awesome font is the largest asset on the page.
