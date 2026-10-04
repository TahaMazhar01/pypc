# Self-hosted fonts

Both typefaces are downloaded once and served from this folder, so the site never
requests a font from a third-party CDN at runtime — faster first paint, no
external dependency, and no visitor data leaving the site.

| File | Family | Weights | Licence |
| --- | --- | --- | --- |
| `inter-variable-latin.woff2` | Inter (variable) | 100–900 | SIL Open Font License 1.1 |
| `playfair-display-variable-latin.woff2` | Playfair Display (variable) | 400–900 | SIL Open Font License 1.1 |

* **Inter** is the interface and body typeface. It is designed for screens, has a
  tall x-height (so small labels stay legible) and an unambiguous numeral set —
  the reason it is used by a large share of government, banking and MUN sites.
* **Playfair Display** is used only for ceremonial display headings, which is what
  gives the branding pages their institutional feel.

Latin subset only: these two files (≈ 85 kB together) cover every page. Add more
subsets here if the site is later translated.

`app/layout.tsx` loads them with `next/font/local`, which fingerprints the files,
serves them with long-lived cache headers, preloads the ones used above the fold
and generates a size-adjusted fallback so text does not shift while the font
loads. Tailwind exposes them as `font-sans` and `font-display`, and
`app/globals.css` uses the same variables as the document default.
