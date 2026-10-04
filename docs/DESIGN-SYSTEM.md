# Design system — colour, contrast and responsiveness

Two claims are made about this site: **enriched colour contrast** and
**pro-level responsive behaviour**. Both are enforced by scripts, not by opinion —
if a change breaks either, `npm run check:contrast` or
`npm run check:responsive` fails with the exact rule and file.

## 1. Colour

`lib/design-tokens.ts` is the single source of truth.

```
lib/design-tokens.ts ──► tailwind.config.ts ──► every utility class in the app
                     ──► app/globals.css     ──► the dark-theme override layer
                     ──► scripts/check-contrast.ts ──► the audit that fails the build
```

| Token group | Used for |
| --- | --- |
| `primary` (50 → 900) | Brand green: buttons, links, the header and footer night surface |
| `ink` (700 → 900) | The deepest surfaces — hero, guarantee bands, print-quality darks |
| `gold` (50 → 900) | Precious-metal accents, kickers, call-to-action fills |
| `champagne`, `mint` | Soft supporting tints |
| `navy`, `azure` | **IMUN 2027 sub-brand**: conference navy surfaces and azure data accents, so the flagship event has its own identity without competing with the parent brand |
| `darkSurfaces` / `darkText` | The dark theme, mirrored into `html.dark` in `app/globals.css` |
| `statusColors` | Success / danger / warning / info, in both themes |

### The contrast rules

* Body copy, labels and links: **≥ 4.5:1** (WCAG 2.1 AA, normal text).
* Large text (≥ 24 px, or ≥ 19 px bold) and meaningful graphics: **≥ 3:1**.
* Decorative hairlines are allowed below 3:1, and are documented as decoration —
  every control still carries a label, a fill and a visible focus ring, so a
  border is never the only way to identify an input.
* The audit also scans the source and fails if a low-contrast class
  (`text-slate-400`, `text-gold-400`, `text-mint-400`, `text-primary-400`) is used
  where readable text is expected. Placeholders and `aria-hidden` decoration are
  exempt — they are not content.

Current state — **49/49 pairs pass**, in both themes:

```
npm run check:contrast
  light theme pairs : 28/28 pass
  dark theme pairs  : 21/21 pass
  All 49 pairs meet WCAG 2.1 AA (light ✓, dark ✓).
```

The dark theme is not an afterthought: `check:contrast` also verifies that the
values in `app/globals.css` still match the tokens, so the two files cannot drift
apart silently.

## 1.1 Typography

Two self-hosted variable fonts, served from `app/fonts/` through `next/font/local`
— no third-party font request at runtime, no visitor data sent to a font CDN:

| Face | Role | Why |
| --- | --- | --- |
| **Inter** (100–900) | Interface, body, data | Screen-designed, tall x-height so 11 px labels stay legible, unambiguous numerals; tabular figures are enabled so prices and table columns align |
| **Playfair Display** (400–900) | Ceremonial display headings via `.font-display` | Gives branding pages an institutional feel without touching readability |

`next/font/local` fingerprints the files, preloads the one used above the fold and
generates a metrically adjusted fallback, so text does not shift while the font
loads. Both are SIL Open Font License 1.1 — see `app/fonts/README.md`.

## 2. Responsiveness

### What CSS does on its own

| Technique | Where | Why |
| --- | --- | --- |
| `clamp()` typography | `.type-hero`, `.type-display`, `.type-section`, `.type-body` | Text scales continuously from a 320 px phone to a 4K display instead of jumping at two breakpoints |
| Fluid container gutter | `tailwind.config.ts` → `clamp(1rem, 4vw, 2rem)` | Page edges breathe on desktop, stay tight on phones |
| Fluid section rhythm | `.section-y` | Spacing shrinks on small screens automatically |
| `dvh` + `--vh` fallback | `body`, `--vh` published at runtime | Mobile browser toolbars never clip the layout, even on older engines |
| `overflow-x: clip` on `html`/`body` | `globals.css` | One wide child cannot create a page-wide horizontal scrollbar |
| `.table-scroll` | Every table on the site | Wide tables scroll inside their own box instead of breaking the page |
| `max-width: 100%` on media | `globals.css` | Images, video and canvas can never exceed their column |
| `overflow-wrap: break-word` | Text elements | Long emails and URLs wrap instead of pushing the layout |
| `@media (hover: hover)` | `.hover-lift`, `.hover-glow` | A tap on a touch screen never leaves a card stuck in its hover state |
| `touch-action: manipulation` | Interactive elements | Taps respond immediately — no 300 ms delay |
| `env(safe-area-inset-*)` + `viewport-fit=cover` | Fixed bar, assistant button, banners | Nothing hides under a notch or the home indicator |
| `prefers-reduced-motion` | Motion layer | Animations collapse to near-zero duration when the user asks for that |
| `@media print` | Throughout | Pages print cleanly, without navigation or animation |

### What JavaScript adds, in real time

`components/experience/viewport-sync.tsx` reacts to the device rather than
assuming it. It coalesces every resize/orientation/keyboard change into one
animation frame and then:

1. writes `--vh` (1 % of the live viewport height) for the fallback above;
2. publishes `data-viewport="xs|sm|md|lg|xl"` on `<html>`, so components can react
   to the real breakpoint and not only through media queries;
3. emits `pypc:breakpoint` — the mobile navigation closes instantly when a phone
   is rotated or the window is widened, so no overlay is ever left floating over
   the desktop layout;
4. emits `pypc:resize` — the 3D hero canvas re-measures itself, staying sharp
   when the on-screen keyboard opens (which does not fire a window resize).

The same layer drives `LiveStatus` (polls `/api/status` once a minute, only while
the tab is visible, and counts up the age of the reading to the second) and
`ConnectionStatus` (a single high-contrast bar while the network is down, with a
short confirmation when it returns). Both are accessible: `aria-live` regions,
real text, no colour-only signals.

### How it is verified

`npm run check:responsive` runs **51 checks** in two layers:

* **Source** — viewport declaration, no `100vh` layouts, every `<table>` wrapped,
  no unguarded fixed width, multi-column grids declaring a mobile breakpoint,
  `fill` images declaring `sizes`, presence of every technique in the table
  above, exactly one `<h1>` per page, skip-to-content link, and the real-time
  components mounted in the root layout.
* **Rendered** — the running site is fetched and the CSS and JavaScript the
  browser actually receives are inspected: `clamp()`, `dvh`, safe-area insets,
  pointer guards, all four breakpoints present, the fluid type utilities, the
  table wrapper, no inline style pinning the layout wider than a phone, working
  `tel:` and `mailto:` links for the official channels, and the real-time code
  present in the shipped bundle.

Breakpoints used throughout: **640 / 768 / 1024 / 1280 px** (Tailwind `sm`, `md`,
`lg`, `xl`). Tested widths: 320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920.
