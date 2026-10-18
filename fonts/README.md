# Self-hosted fonts

- `ubuntu-300-latin.woff2`, `ubuntu-300-latin-ext.woff2`: Ubuntu Light from Google Fonts (v21), Ubuntu Font Licence 1.0. The `@font-face` rules are at the top of `styles.css`; Cyrillic and Greek fall back to the system font. The latin file is preloaded in `index.html`.
- `../vendor/fontawesome-6.7.2/`: Font Awesome Free 6.7.2 (`css/all.min.css` with its licence header, `webfonts/*.woff2`). Fonts: SIL OFL 1.1, icons CC BY 4.0, code MIT.

## Glyph audit (2026-10-18)

Only `fa-solid` is used in `js/`, `index.html` and `styles.css` (gear, chevrons, bars, circle, square, hashtag, align, floppy-disk, sun, moon, mobile-screen) and in the section icons of the data (`links.default.json` and the local `edit/links.json`: briefcase, cart-shopping, comments, landmark, lightbulb, location-dot, microchip, newspaper, palette, radio, server, toolbox, tv, user, utensils). Section icons come from the live data and can be any Font Awesome class, so `regular`, `brands` and the v4 compatibility font are kept as well; browsers fetch a font file only when a glyph from it is shown.

## Updating

Put the new release into a new folder `vendor/fontawesome-<version>/` (from cdnjs `font-awesome/<version>/css/all.min.css` and `webfonts/`, same layout), point the stylesheet link in `index.html` at it, and delete the old folder. Never replace files in place: `.htaccess` caches `.woff2` for a year as immutable, so the version must be in the path.
