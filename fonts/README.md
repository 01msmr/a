# Self-hosted fonts

- `ubuntu-300-latin.woff2`, `ubuntu-300-latin-ext.woff2`: Ubuntu Light from Google Fonts (v21), Ubuntu Font Licence 1.0. The `@font-face` rules are at the top of `styles.css`; Cyrillic and Greek fall back to the system font. The latin file is preloaded in `index.html`.
- `ubuntu-apple-logo.woff2` (0.6 KB): Font Awesome's Apple glyph moved to the character U+F8FF (the Apple logo, used in two link names). Without it only Apple's system fonts can draw that character. Declared as a third `Ubuntu` face in `styles.css`. Made with `pyftsubset fa-brands-400.woff2 --unicodes=U+f179`, then the cmap entry 0xF179 renamed to 0xF8FF with fontTools.
- `../vendor/fontawesome-6.7.2/`: Font Awesome Free 6.7.2 (`css/all.min.css` with its licence header, `webfonts/fa-solid-900.woff2`). Fonts: SIL OFL 1.1, icons CC BY 4.0, code MIT.

## Icons

All four Font Awesome Free fonts are shipped (`fa-solid-900`, `fa-regular-400`, `fa-brands-400`, `fa-v4compatibility`), so any free icon can be used for a section. The browser only downloads a font file when a glyph from it is shown.

- Solid icons: write the class as before (`fa-briefcase`). The page adds `fa-solid` itself.
- Brand and regular icons: write the style too, e.g. `fa-brands fa-apple` or `fa-regular fa-star` (the page adds `fa-solid` in front; the style you write wins). A bare `fa-apple` shows nothing, because the Apple logo is not in the solid font.

### Small solid font

`fa-solid-900-subset.woff2` (3 KB) holds the 28 solid glyphs the page and today's section icons use, instead of the 158 KB full file. `styles.css` declares it with a `unicode-range` after the full font, so those glyphs come from the small file and any other solid icon makes the browser load the full one.

When the set of icons in use changes, rebuild it and give it a **new file name** (the `.woff2` cache is one year, immutable), then update the `src` and `unicode-range` in `styles.css` and the preload in `index.html`:

```
# codepoints of the used icons: look up each class in vendor/fontawesome-6.7.2/css/all.min.css (.fa-gear{--fa:"\f013"} -> U+f013)
pyftsubset vendor/fontawesome-6.7.2/webfonts/fa-solid-900.woff2 --unicodes="U+f013,U+f007,..." --flavor=woff2 --layout-features='*' --output-file=vendor/fontawesome-6.7.2/webfonts/fa-solid-900-subset-2.woff2
```

(`pip install fonttools brotli` provides `pyftsubset`.) Glyphs missing from the subset are not a problem; they only cost the extra download.

## Updating

Put the new release into a new folder `vendor/fontawesome-<version>/` (from cdnjs `font-awesome/<version>/css/all.min.css` and `webfonts/`, same layout), point the stylesheet link in `index.html` at it, and delete the old folder. Never replace files in place: `.htaccess` caches `.woff2` for a year as immutable, so the version must be in the path.
