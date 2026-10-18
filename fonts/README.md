# Self-hosted fonts

- `ubuntu-300-latin.woff2`, `ubuntu-300-latin-ext.woff2`: Ubuntu Light from Google Fonts (v21), Ubuntu Font Licence 1.0. The `@font-face` rules are at the top of `styles.css`; Cyrillic and Greek fall back to the system font. The latin file is preloaded in `index.html`.
- `../vendor/fontawesome-6.7.2/`: Font Awesome Free 6.7.2 (`css/all.min.css` with its licence header, `webfonts/fa-solid-900.woff2`). Fonts: SIL OFL 1.1, icons CC BY 4.0, code MIT.

## Icons

Only `fa-solid` glyphs are used (page, settings and the section icons in the data), so only `fa-solid-900.woff2` is shipped. `css/all.min.css` is kept unmodified and still names the regular, brands and v4-compatibility fonts: a `fa-regular`, `fa-brands` or old `fa fa-…` icon would show nothing until its woff2 file from the same release is copied into `webfonts/`.

## Updating

Put the new release into a new folder `vendor/fontawesome-<version>/` (from cdnjs `font-awesome/<version>/css/all.min.css` and `webfonts/`, same layout), point the stylesheet link in `index.html` at it, and delete the old folder. Never replace files in place: `.htaccess` caches `.woff2` for a year as immutable, so the version must be in the path.
