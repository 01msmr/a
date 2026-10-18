# Cleanup candidates (2026-10-18) — nothing deleted yet

Found by searching `index.html`, `styles.css`, `js/`, `favicon/manifest.json`, `favicon/browserconfig.xml`, docs, tools and PHP for each file name. Waiting for your decision per group.

## Keep (referenced or requested by convention)

- Root: `apple-touch-icon.png`, `apple-touch-icon-precomposed.png` (iOS and other browsers ask for them at the root; written by `tools/touch-icon.js`), `c-line.png`, `c-line-light.png`, `c-point.png`, `c-point-light.png` (used by `styles.css`).
- `favicon/`: `ico-light-180.png`, `ico-dark-180.png`, `ico-light-192.png`, `ico-light-512.png`, `manifest.json`, `touch-icon-inline.js`.

## Group A: loose source images in the root (6 files, last changed 2025 except `jp.png` 2026-10-11)

`a ORIG.png`, `a.png`, `a-light.png`, `c-line grad.png`, `c-line-light grad.png`, `jp.png`: no reference anywhere. Options: move to `assets/` (kept in git, still public) or delete (history keeps them).

## Group B: old icon sets in `favicon/` (nothing references them)

- `android-icon-*` (6), `apple-icon-*` (11, incl. `apple-icon.png`, `apple-icon-precomposed.png`), `favicon-16x16.png`, `favicon-96x96.png`, `favicon-dark-32x32.png`, `favicon-light-32x32.png`, `favicon.ico`: generated icon-set files from 2025; the page now uses `ico-*` and the root `apple-touch-icon*.png`. `favicon.ico` sits in `favicon/`, not at `/favicon.ico`, so browsers never ask for it there.
- `ms-icon-*` (4) and `browserconfig.xml`: Windows tiles (IE11/old Edge); `index.html` has no `msapplication-config`, and the XML points at `/ms-icon-*.png` at the root, where they do not exist. Dead.
- `ico-dark-192.png`, `ico-dark-512.png`: generated with the set, not used by the manifest (it lists only the light icons).

Total: about 0.2 MB in `favicon/` and 0.1 MB in the root; the effect is tidiness, not speed.

## Recommendation

Delete Group B (a dead generated set), move Group A to `assets/`. Everything stays recoverable from git history.
