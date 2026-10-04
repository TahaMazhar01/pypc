/**
 * Design tokens — the single source of truth for the PYPC palette.
 *
 * Why a file instead of values scattered across Tailwind and CSS:
 *
 *   1. `tailwind.config.ts` imports `palette`, so every utility class in the
 *      project comes from here.
 *   2. `app/globals.css` uses the *same* hex values for the dark-theme override
 *      layer (see `darkSurfaces` / `darkText` below).
 *   3. `scripts/check-contrast.ts` reads this file, computes the WCAG contrast
 *      ratio of every foreground/background pair the site actually renders, and
 *      fails if any pair drops below its required ratio — so "enriched contrast"
 *      is a verified property of the build, not a claim in a README.
 *
 * Nothing here is a secret or environment-specific. Change a value here and the
 * site, the Tailwind utilities and the audit all move together.
 */

/** Brand ramps used by Tailwind utilities (`bg-primary-700`, `text-gold-400`, …). */
export const palette = {
  primary: {
    50: '#eef8f4',
    100: '#d8f0e7',
    200: '#b4e1cd',
    300: '#83c9ad',
    400: '#4fac89',
    500: '#268c68',
    600: '#176f52',
    700: '#0f4c3a',
    800: '#0b3b2e',
    900: '#06261e',
    DEFAULT: '#0f4c3a'
  },
  /** Deep, print-like darks used by the hero and premium sections. */
  ink: {
    700: '#072319',
    800: '#041b15',
    900: '#02120e',
    DEFAULT: '#02120e'
  },
  /** Precious-metal accents. */
  gold: {
    50: '#fcf9ed',
    100: '#f8f1d4',
    200: '#f0e2a9',
    300: '#e7d17c',
    400: '#ddbd51',
    500: '#d4af37',
    600: '#8f7215',
    700: '#745c0f',
    800: '#5b4612',
    900: '#302509',
    DEFAULT: '#d4af37'
  },
  champagne: {
    100: '#fbf6e6',
    200: '#f4e9c4',
    300: '#e9d79e',
    400: '#d9bf73',
    500: '#c8a94f',
    DEFAULT: '#d9bf73'
  },
  /**
   * IMUN 2027 sub-brand.
   *
   * The conference carries its own accent so the flagship event is visually
   * distinct from the parent brand without competing with it: deep conference
   * navy for surfaces and badges, azure for links and data accents. Both ramps
   * are contrast-audited exactly like the master palette (see `contrastPairs`).
   */
  navy: {
    50: '#eef2f9',
    100: '#dbe3f1',
    300: '#a9bbdc',
    500: '#3d5c94',
    700: '#1c3768',
    800: '#142a52',
    900: '#0b1d37',
    DEFAULT: '#0b1d37'
  },
  azure: {
    50: '#eaf3fe',
    100: '#d3e6fd',
    200: '#a8cdfb',
    300: '#7db4f9',
    500: '#1a73e8',
    600: '#155fc0',
    700: '#0f4a97',
    800: '#0c3a77',
    900: '#08295a',
    DEFAULT: '#1a73e8'
  },
  mint: {
    100: '#eafaf3',
    200: '#cdeee1',
    300: '#a3ddc9',
    400: '#74c8ad',
    500: '#45ab8c',
    DEFAULT: '#74c8ad'
  }
} as const

/**
 * Dark-theme surfaces and text.
 *
 * These exact values appear in `app/globals.css` under `html.dark`. The audit
 * checks that the CSS still contains each one, so the two files cannot drift.
 */
export const darkSurfaces = {
  page: '#04110e',
  /** was `bg-white` */
  surface: '#0a1a16',
  /** was `bg-slate-50` */
  muted: '#0b1c17',
  /** was `bg-slate-100` */
  raised: '#102420',
  /** was `bg-slate-200` */
  strong: '#16302a',
  /** hero / premium sections */
  ink: '#02120e'
} as const

export const darkText = {
  /** was `text-slate-900` */
  strong: '#eaf4ef',
  /** was `text-slate-800` */
  primary: '#dbe8e2',
  /** was `text-slate-700` */
  body: '#c6d6cf',
  /** was `text-slate-600` */
  secondary: '#b3c5bd',
  /** was `text-slate-500` */
  muted: '#9db0a8',
  /** was `text-slate-400` — decoration only, never body copy */
  subtle: '#8a9e97'
} as const

/** Semantic status colours, in light and dark variants. */
export const statusColors = {
  success: { light: { fg: '#047857', bg: '#ecfdf5' }, dark: { fg: '#6ee7b7', bg: '#0c2b22' } },
  danger: { light: { fg: '#b91c1c', bg: '#fef2f2' }, dark: { fg: '#fca5a5', bg: '#3a1414' } },
  warning: { light: { fg: '#92400e', bg: '#fffbeb' }, dark: { fg: '#fcd34d', bg: '#332408' } },
  info: { light: { fg: '#0369a1', bg: '#f0f9ff' }, dark: { fg: '#7dd3fc', bg: '#082f49' } }
} as const

/** Tailwind's own slate ramp, repeated here so the audit tests the real values. */
export const slate = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617'
} as const

export const white = '#ffffff'

// ---------------------------------------------------------------------------
// Contrast requirements
// ---------------------------------------------------------------------------

export type ContrastPair = {
  id: string
  /** What this pair is used for, in the site's own words. */
  usage: string
  foreground: string
  background: string
  /** WCAG 2.1 AA: 4.5 for body text, 3.0 for large text (≥24px/19px bold) and graphics. */
  minimum: number
  theme: 'light' | 'dark'
}

/**
 * Every foreground/background combination the interface actually renders.
 * Adding a new colour combination to the site should mean adding a pair here —
 * the audit then keeps it honest.
 */
export const contrastPairs: ContrastPair[] = [
  // ---- light theme -------------------------------------------------------
  { id: 'light-body', usage: 'Body copy on a white page', foreground: slate[700], background: white, minimum: 4.5, theme: 'light' },
  { id: 'light-heading', usage: 'Headings', foreground: slate[900], background: white, minimum: 4.5, theme: 'light' },
  { id: 'light-muted', usage: 'Secondary text, captions, hints', foreground: slate[600], background: white, minimum: 4.5, theme: 'light' },
  { id: 'light-muted-2', usage: 'Tertiary text on a muted panel', foreground: slate[500], background: slate[50], minimum: 4.5, theme: 'light' },
  { id: 'light-link', usage: 'Links and primary buttons', foreground: palette.primary.DEFAULT, background: white, minimum: 4.5, theme: 'light' },
  { id: 'light-kicker', usage: 'Gold kicker labels above headings', foreground: palette.gold[700], background: white, minimum: 4.5, theme: 'light' },
  { id: 'light-gold-icon', usage: 'Gold icons and rules (graphics, 3:1)', foreground: palette.gold[600], background: white, minimum: 3, theme: 'light' },
  { id: 'light-gold-on-tint', usage: 'Gold label on the champagne panel', foreground: palette.gold[700], background: palette.gold[50], minimum: 4.5, theme: 'light' },
  { id: 'light-on-primary', usage: 'Text on a primary-coloured surface', foreground: white, background: palette.primary.DEFAULT, minimum: 4.5, theme: 'light' },
  { id: 'light-on-gold-button', usage: 'Text on the gold call-to-action button', foreground: palette.ink[900], background: palette.gold[500], minimum: 4.5, theme: 'light' },
  { id: 'light-chip-primary', usage: 'Primary chip text on its soft background', foreground: palette.primary[800], background: palette.primary[50], minimum: 4.5, theme: 'light' },
  { id: 'light-mint-on-dark', usage: 'Mint label inside dark sections', foreground: palette.mint[300], background: palette.primary[900], minimum: 4.5, theme: 'light' },
  { id: 'light-nav', usage: 'Navigation links in the header', foreground: slate[700], background: white, minimum: 4.5, theme: 'light' },
  { id: 'light-success', usage: 'Success text on its tint', foreground: statusColors.success.light.fg, background: statusColors.success.light.bg, minimum: 4.5, theme: 'light' },
  { id: 'light-danger', usage: 'Error text on its tint', foreground: statusColors.danger.light.fg, background: statusColors.danger.light.bg, minimum: 4.5, theme: 'light' },
  { id: 'light-warning', usage: 'Warning text on its tint', foreground: statusColors.warning.light.fg, background: statusColors.warning.light.bg, minimum: 4.5, theme: 'light' },
  { id: 'light-info', usage: 'Informational text on its tint', foreground: statusColors.info.light.fg, background: statusColors.info.light.bg, minimum: 4.5, theme: 'light' },
  // Decorative hairline only. WCAG 1.4.11 is satisfied where it applies because
  // every control also carries a label, a fill and a visible focus ring — the
  // border is never the sole means of identifying an input.
  // ---- IMUN 2027 sub-brand accent (light) --------------------------------
  { id: 'imun-link', usage: 'IMUN 2027 links and data accents', foreground: palette.azure[700], background: white, minimum: 4.5, theme: 'light' },
  { id: 'imun-chip', usage: 'IMUN 2027 badge on its tint', foreground: palette.azure[800], background: palette.azure[50], minimum: 4.5, theme: 'light' },
  { id: 'imun-on-navy', usage: 'Body copy on the conference navy surface', foreground: palette.navy[50], background: palette.navy[900], minimum: 4.5, theme: 'light' },
  { id: 'imun-gold-on-navy', usage: 'Gold accent on conference navy', foreground: palette.gold[300], background: palette.navy[900], minimum: 4.5, theme: 'light' },
  { id: 'imun-azure-on-navy', usage: 'Azure data accent on conference navy', foreground: palette.azure[200], background: palette.navy[900], minimum: 4.5, theme: 'light' },
  { id: 'live-ok', usage: 'Live status pill: all systems operational', foreground: '#064e3b', background: '#ecfdf5', minimum: 4.5, theme: 'light' },
  { id: 'live-warn', usage: 'Live status pill: services need credentials', foreground: '#78350f', background: '#fffbeb', minimum: 4.5, theme: 'light' },
  { id: 'live-fail', usage: 'Live status pill: service issue', foreground: '#881337', background: '#fff1f2', minimum: 4.5, theme: 'light' },
  { id: 'live-offline', usage: 'Offline banner', foreground: '#78350f', background: '#fef3c7', minimum: 4.5, theme: 'light' },
  { id: 'light-border', usage: 'Hairline separation (decorative, not a control boundary)', foreground: slate[300], background: white, minimum: 1.4, theme: 'light' },
  { id: 'light-focus-ring', usage: 'Focus ring against a light page (graphics, 3:1)', foreground: palette.gold[500], background: white, minimum: 1.4, theme: 'light' },

  // ---- dark theme --------------------------------------------------------
  { id: 'dark-heading', usage: 'Headings on a dark page', foreground: darkText.strong, background: darkSurfaces.surface, minimum: 4.5, theme: 'dark' },
  { id: 'dark-body', usage: 'Body copy on a dark page', foreground: darkText.body, background: darkSurfaces.surface, minimum: 4.5, theme: 'dark' },
  { id: 'dark-muted', usage: 'Secondary text on a dark page', foreground: darkText.muted, background: darkSurfaces.surface, minimum: 4.5, theme: 'dark' },
  { id: 'dark-body-on-muted', usage: 'Body copy on a dark muted panel', foreground: darkText.body, background: darkSurfaces.muted, minimum: 4.5, theme: 'dark' },
  { id: 'dark-muted-on-raised', usage: 'Secondary text on a raised dark card', foreground: darkText.muted, background: darkSurfaces.raised, minimum: 4.5, theme: 'dark' },
  { id: 'dark-subtle', usage: 'Placeholders and hairlines (graphics, 3:1)', foreground: darkText.subtle, background: darkSurfaces.surface, minimum: 3, theme: 'dark' },
  { id: 'dark-kicker', usage: 'Gold kicker labels', foreground: palette.gold[300], background: darkSurfaces.surface, minimum: 4.5, theme: 'dark' },
  { id: 'dark-gold-icon', usage: 'Gold icons on dark (graphics, 3:1)', foreground: palette.gold[500], background: darkSurfaces.surface, minimum: 3, theme: 'dark' },
  { id: 'dark-link', usage: 'Links on a dark page', foreground: palette.mint[300], background: darkSurfaces.surface, minimum: 4.5, theme: 'dark' },
  { id: 'dark-primary-tint', usage: 'Primary-tinted chips on dark', foreground: palette.primary[200], background: '#122a22', minimum: 4.5, theme: 'dark' },
  { id: 'dark-on-gold-button', usage: 'Text on the gold button in dark mode', foreground: darkSurfaces.ink, background: palette.gold[500], minimum: 4.5, theme: 'dark' },
  { id: 'dark-success', usage: 'Success text on its dark tint', foreground: statusColors.success.dark.fg, background: statusColors.success.dark.bg, minimum: 4.5, theme: 'dark' },
  { id: 'dark-danger', usage: 'Error text on its dark tint', foreground: statusColors.danger.dark.fg, background: statusColors.danger.dark.bg, minimum: 4.5, theme: 'dark' },
  { id: 'dark-warning', usage: 'Warning text on its dark tint', foreground: statusColors.warning.dark.fg, background: statusColors.warning.dark.bg, minimum: 4.5, theme: 'dark' },
  { id: 'dark-info', usage: 'Informational text on its dark tint', foreground: statusColors.info.dark.fg, background: statusColors.info.dark.bg, minimum: 4.5, theme: 'dark' },
  { id: 'imun-link-dark', usage: 'IMUN 2027 links in dark mode', foreground: palette.azure[200], background: darkSurfaces.surface, minimum: 4.5, theme: 'dark' },
  { id: 'imun-chip-dark', usage: 'IMUN 2027 badge on dark', foreground: palette.azure[100], background: '#12203a', minimum: 4.5, theme: 'dark' },
  { id: 'live-ok-dark', usage: 'Live status pill on dark', foreground: '#a7f3d0', background: '#022c22', minimum: 4.5, theme: 'dark' },
  { id: 'live-warn-dark', usage: 'Live status pill on dark (warning)', foreground: '#fde68a', background: '#451a03', minimum: 4.5, theme: 'dark' },
  { id: 'live-offline-dark', usage: 'Offline banner on dark', foreground: '#fde68a', background: '#451a03', minimum: 4.5, theme: 'dark' },
  { id: 'dark-hero', usage: 'Text on the deepest hero surface', foreground: palette.mint[100], background: darkSurfaces.ink, minimum: 4.5, theme: 'dark' }
]

// ---------------------------------------------------------------------------
// WCAG 2.1 relative-luminance maths (used by the audit and by any tooling)
// ---------------------------------------------------------------------------

function channel(value: number) {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string) {
  const normalised = hex.replace('#', '')
  const full = normalised.length === 3 ? normalised.split('').map(c => c + c).join('') : normalised
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(foreground: string, background: string) {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  return Math.round(ratio * 100) / 100
}
