/**
 * Contrast audit — WCAG 2.1 AA verification of every colour pair the site renders.
 *
 *   npm run check:contrast
 *
 * Three things are checked:
 *   1. Every pair in `lib/design-tokens.ts` meets its required ratio
 *      (4.5:1 body text, 3:1 large text and graphics).
 *   2. The dark-theme values in `app/globals.css` match the tokens — so the CSS
 *      and the palette cannot silently drift apart.
 *   3. The codebase does not use a low-contrast class where readable text is
 *      expected (e.g. `text-slate-400` for body copy on a light surface).
 *
 * Exit code 0 = the palette is verified, 1 = something needs fixing.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import {
  contrastPairs,
  contrastRatio,
  darkSurfaces,
  darkText,
  palette,
  slate
} from '../lib/design-tokens'

const ROOT = path.resolve(__dirname, '..')

type Failure = { id: string; message: string }
const failures: Failure[] = []

function line() {
  console.log('─'.repeat(96))
}

console.log('\nWCAG 2.1 contrast audit — PYPC palette\n')
line()
console.log(
  'PAIR'.padEnd(24) +
    'FOREGROUND'.padEnd(12) +
    'BACKGROUND'.padEnd(12) +
    'RATIO'.padEnd(8) +
    'MIN'.padEnd(6) +
    'RESULT'
)
line()

const byTheme = { light: [] as string[], dark: [] as string[] }

for (const pair of contrastPairs) {
  const ratio = contrastRatio(pair.foreground, pair.background)
  const pass = ratio >= pair.minimum
  if (!pass) failures.push({ id: pair.id, message: `${pair.usage} — ${ratio}:1 (needs ${pair.minimum}:1)` })
  byTheme[pair.theme].push(pass ? 'ok' : 'FAIL')
  console.log(
    pair.id.padEnd(24) +
      pair.foreground.padEnd(12) +
      pair.background.padEnd(12) +
      `${ratio}:1`.padEnd(8) +
      `${pair.minimum}`.padEnd(6) +
      (pass ? 'PASS' : 'FAIL') +
      `  ${pair.usage}`
  )
}
line()

// ---------------------------------------------------------------------------
// 2. globals.css must use the same dark-theme values as the tokens
// ---------------------------------------------------------------------------

const css = readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8')
const cssLower = css.toLowerCase()

const darkChecks: [string, string][] = [
  ...Object.entries(darkSurfaces).map(([name, value]) => [`darkSurfaces.${name}`, value] as [string, string]),
  ...Object.entries(darkText).map(([name, value]) => [`darkText.${name}`, value] as [string, string]),
  ['status.success.dark', '#0c2b22'],
  ['status.danger.dark', '#3a1414'],
  ['status.warning.dark', '#332408'],
  ['status.info.dark', '#082f49']
]

let drift = 0
for (const [name, value] of darkChecks) {
  if (!cssLower.includes(value.toLowerCase())) {
    drift += 1
    console.log(`DRIFT  ${name} (${value}) is not present in app/globals.css`)
  }
}
if (drift) failures.push({ id: 'css-drift', message: `${drift} dark-theme value(s) missing from globals.css` })
else console.log(`PASS   dark theme: ${darkChecks.length} token values match app/globals.css`)

// ---------------------------------------------------------------------------
// 3. low-contrast utilities in source
// ---------------------------------------------------------------------------

/** Classes that are only acceptable for decoration, never for readable text. */
const risky = [
  { pattern: /(?<!dark:)text-slate-400\b/g, ratio: contrastRatio(slate[400], '#ffffff'), minimum: 4.5, note: 'text-slate-400 as readable text on light' },
  { pattern: /(?<!dark:)text-gold-400\b/g, ratio: contrastRatio(palette.gold[400], '#ffffff'), minimum: 4.5, note: 'text-gold-400 as readable text on light' },
  { pattern: /(?<!dark:)text-mint-400\b/g, ratio: contrastRatio(palette.mint[400], '#ffffff'), minimum: 4.5, note: 'text-mint-400 as readable text on light' },
  { pattern: /(?<!dark:)text-primary-400\b/g, ratio: contrastRatio(palette.primary[400], '#ffffff'), minimum: 4.5, note: 'text-primary-400 as readable text on light' }
]

function walk(dir: string, acc: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(entry)) continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(tsx|ts)$/.test(entry)) acc.push(full)
  }
  return acc
}

const sources = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components')), ...walk(path.join(ROOT, 'lib'))]
const offenders: string[] = []

for (const file of sources) {
  // The token file documents these class names in comments — not a real usage.
  if (file.endsWith(path.join('lib', 'design-tokens.ts'))) continue
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  for (const rule of risky) {
    lines.forEach((content, index) => {
      // Allow placeholders and purely decorative glyphs; flag everything else.
      if (!rule.pattern.test(content)) return
      rule.pattern.lastIndex = 0
      const isPlaceholder = /placeholder:text-slate-400/.test(content)
      const isDecorativeOnly = /aria-hidden|decoration-|pointer-events-none/.test(content)
      if (isPlaceholder || isDecorativeOnly) return
      offenders.push(`${path.relative(ROOT, file)}:${index + 1}  ${rule.note}  (${rule.ratio}:1)`)
    })
  }
}

if (offenders.length) {
  console.log(`\n${offenders.length} low-contrast usage(s) found where readable text is expected:`)
  offenders.forEach(item => console.log('   ' + item))
  failures.push({ id: 'utilities', message: `${offenders.length} low-contrast text utility usage(s)` })
} else {
  console.log('PASS   no low-contrast utility is used for readable text')
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const lightOk = byTheme.light.every(v => v === 'ok')
const darkOk = byTheme.dark.every(v => v === 'ok')

console.log('')
console.log(`light theme pairs : ${byTheme.light.filter(v => v === 'ok').length}/${byTheme.light.length} pass`)
console.log(`dark theme pairs  : ${byTheme.dark.filter(v => v === 'ok').length}/${byTheme.dark.length} pass`)

if (failures.length) {
  console.log(`\n${failures.length} contrast issue(s):`)
  failures.forEach(f => console.log(`   - ${f.id}: ${f.message}`))
  process.exit(1)
}

console.log(`\nAll ${contrastPairs.length} pairs meet WCAG 2.1 AA (light ${lightOk ? '✓' : '✗'}, dark ${darkOk ? '✓' : '✗'}).\n`)
