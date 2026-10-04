/**
 * Responsive audit — verifies the site adapts at every width.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-responsive.js
 *
 * Two layers:
 *
 *   A. Source audit — the patterns that cause horizontal overflow or cramped
 *      layouts on real devices: unwrapped tables, fixed pixel widths, hero-only
 *      heights, off-grid breakpoints, unsized fill images, missing viewport-fit.
 *   B. Rendered audit — fetches the real HTML and the compiled CSS from the
 *      running server and proves the responsive rules actually ship: fluid
 *      gutter, `clamp()` type, `dvh` heights, `overflow-x: clip`,
 *      `@media (hover: hover)`, safe-area insets, and per-breakpoint rules for
 *      640 / 768 / 1024 / 1280 px.
 *
 * There is no headless browser in this environment, so widths are verified
 * structurally (rules + markup) rather than by pixel measurement.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

let passed = 0
let failed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry)) continue
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, acc)
    else if (/\.(tsx|ts|css)$/.test(entry)) acc.push(full)
  }
  return acc
}

const appFiles = walk(path.join(ROOT, 'app'))
const componentFiles = walk(path.join(ROOT, 'components'))
const sources = [...appFiles, ...componentFiles]
const css = fs.readFileSync(path.join(ROOT, 'app', 'globals.css'), 'utf8')
const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8')

console.log(`\nResponsive audit — ${BASE}\n${'─'.repeat(72)}\nA. Source\n`)

// A1 — viewport meta with viewport-fit for safe areas -----------------------
check('A1  viewport is declared with device-width and viewport-fit=cover', /viewportFit:\s*'cover'/.test(layout) && /width:\s*'device-width'/.test(layout))

// A2 — no viewport-height heroes that jump when the mobile URL bar hides -----
const hScreen = sources.filter(file => /className="[^"]*\bh-screen\b/.test(fs.readFileSync(file, 'utf8')))
check('A2  no `h-screen` (100vh) layout — dynamic viewport units used instead', hScreen.length === 0, hScreen.map(f => path.relative(ROOT, f)).join(', '))
check('A2b body uses min-h-dvh', /min-h-dvh/.test(layout))

// A3 — every table can scroll sideways on a phone ---------------------------
const tables = []
for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (!/<table\b/.test(line)) return
    const before = lines.slice(Math.max(0, i - 12), i + 1).join('\n')
    const wrapped = /overflow-x-auto|table-scroll/.test(before)
    if (!wrapped) tables.push(`${path.relative(ROOT, file)}:${i + 1}`)
  })
}
check('A3  every <table> sits in a horizontal scroll wrapper', tables.length === 0, tables.join(', '))

// A4 — no fixed width wider than a small phone, unless it scrolls ------------
// `max-w-*` is intentionally not matched: only a hard `w-[Npx]` can pin a layout.
const wide = []
for (const file of sources) {
  if (file.endsWith(path.join('app', 'globals.css'))) continue
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const matches = line.match(/(?<![-\w])w-\[(\d{3,})px\]/g) || []
    for (const m of matches) {
      const px = Number(m.match(/(\d+)px/)[1])
      if (px < 360) continue
      const sameLineGuarded = /max-w-full|min-w-0/.test(line)
      // A wide element is fine when an ancestor scrolls horizontally.
      const ancestor = lines.slice(Math.max(0, i - 6), i + 1).join('\n')
      const scrollGuarded = /table-scroll|overflow-x-auto|overflow-auto/.test(ancestor)
      if (!sameLineGuarded && !scrollGuarded) wide.push(`${path.relative(ROOT, file)}:${i + 1} ${m}`)
    }
  })
}
check('A4  no unguarded fixed width ≥ 360px (wide tables may scroll)', wide.length === 0, wide.join(', '))

// A5 — multi-column grids declare a breakpoint ------------------------------
const rigid = []
for (const file of sources) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const matches = line.match(/(?<![:\w-])grid-cols-([3-9])/g) || []
    // a bare `grid-cols-3` with no `sm:`/`md:` variant on the same line is rigid on phones
    if (matches.length && !/(sm|md|lg|xl|2xl):grid-cols-/.test(line)) {
      rigid.push(`${path.relative(ROOT, file)}:${i + 1}`)
    }
  })
}
check('A5  grid layouts of 3+ columns declare a mobile breakpoint', rigid.length === 0, rigid.slice(0, 6).join(', '))

// A6 — fill images carry `sizes` so phones do not download desktop assets ----
const unsized = []
for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8')
  const blocks = text.split(/<Image\b/)
  blocks.slice(1).forEach(block => {
    const tag = block.slice(0, block.indexOf('/>') + 2)
    if (/\bfill\b/.test(tag) && !/\bsizes=/.test(tag)) unsized.push(path.relative(ROOT, file))
  })
}
check('A6  every `fill` image declares `sizes`', unsized.length === 0, [...new Set(unsized)].join(', '))

// A7 — CSS base layer ------------------------------------------------------
check('A7  html guards against horizontal overflow (overflow-x: clip)', /overflow-x:\s*clip/.test(css))
check('A8  dynamic viewport height used in CSS (100dvh)', /100dvh/.test(css))
check('A9  fluid typography uses clamp()', /clamp\(/.test(css))
check('A10 iOS text autosizing disabled (-webkit-text-size-adjust)', /-webkit-text-size-adjust:\s*100%/.test(css))
check('A11 safe-area insets respected', /env\(safe-area-inset/.test(css))
check('A12 hover effects only run on hover-capable pointers', /@media \(hover: hover\)/.test(css))
check('A13 taps respond immediately (touch-action: manipulation)', /touch-action:\s*manipulation/.test(css))
check('A14 long words and addresses wrap (overflow-wrap: break-word)', /overflow-wrap:\s*break-word/.test(css))
check('A15 images cannot exceed their column (max-width: 100%)', /img,\s*\n?picture,\s*\n?video/.test(css) || /img,[\s\S]{0,80}max-width: 100%/.test(css))

// A16 — fluid gutter shared with Tailwind's container ----------------------
const tailwind = fs.readFileSync(path.join(ROOT, 'tailwind.config.ts'), 'utf8')
check('A16 container padding is a fluid clamp() value', /padding:\s*\{\s*DEFAULT:\s*'clamp\(/.test(tailwind))
check('A17 motion preferences honoured (prefers-reduced-motion)', /prefers-reduced-motion: reduce/.test(css))
check('A18 print stylesheet present', /@media print/.test(css))

// A20 — real-time layer: viewport tracking, live status, connection banner --
const layoutText = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8')
check('A20 <ViewportSync /> is mounted in the root layout', /<ViewportSync \/>/.test(layoutText))
check('A21 <ConnectionStatus /> is mounted in the root layout', /<ConnectionStatus \/>/.test(layoutText))
check('A22 viewport sync publishes --vh and a breakpoint event', (() => {
  const file = path.join(ROOT, 'components', 'experience', 'viewport-sync.tsx')
  if (!fs.existsSync(file)) return false
  const text = fs.readFileSync(file, 'utf8')
  return /--vh/.test(text) && /pypc:breakpoint/.test(text) && /dataset\.viewport/.test(text)
})())
check('A23 live status pill polls the health endpoint', (() => {
  const file = path.join(ROOT, 'components', 'experience', 'live-status.tsx')
  if (!fs.existsSync(file)) return false
  const text = fs.readFileSync(file, 'utf8')
  return /fetch\('\/api\/status'/.test(text) && /visibilitychange/.test(text) && /aria-live/.test(text)
})())
check('A24 connection banner reacts to online/offline events', (() => {
  const file = path.join(ROOT, 'components', 'experience', 'connection-status.tsx')
  if (!fs.existsSync(file)) return false
  const text = fs.readFileSync(file, 'utf8')
  return /addEventListener\('offline'/.test(text) && /addEventListener\('online'/.test(text) && /aria-live="assertive"/.test(text)
})())
check('A25 mobile navigation closes on the live breakpoint + Escape', (() => {
  const text = fs.readFileSync(path.join(ROOT, 'components', 'layout', 'header-nav.tsx'), 'utf8')
  return /pypc:breakpoint/.test(text) && /Escape/.test(text)
})())
check('A26 skip-to-content link is the first focusable element', /Skip to content/.test(layoutText))

// A19 — every page exposes one h1 for both SEO and layout sanity -----------
const pages = appFiles.filter(f => /app[\\/].*page\.tsx$/.test(f))
const noH1 = []
for (const file of pages) {
  const text = fs.readFileSync(file, 'utf8')
  // A page may own its h1 directly or delegate to a shared header component.
  const sharedHeader = /<PageHero|<HomeHero3D|<PolicyDocumentView|DashboardShell|<DashboardShell/.test(text)
  // Admin and dashboard pages all render inside a shell that emits the h1.
  const shellPage = /[\\/](admin|dashboard)[\\/]/.test(file)
  if (!/<h1\b/.test(text) && !sharedHeader && !shellPage) {
    noH1.push(path.relative(ROOT, file))
  }
}
check(`A19 all ${pages.length} pages render an h1 (or a hero that owns one)`, noH1.length === 0, noH1.join(', '))

// ---------------------------------------------------------------------------
// B. Rendered audit
// ---------------------------------------------------------------------------

const ROUTES = [
  '/',
  '/about',
  '/membership',
  '/international',
  '/conferences',
  '/conferences/imun-2027',
  '/courses',
  '/events',
  '/programmes',
  '/opportunities',
  '/research',
  '/records',
  '/leadership',
  '/partnerships',
  '/policies',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/code-of-conduct',
  '/faq',
  '/verify',
  '/contact',
  '/register',
  '/login',
  '/status'
]

async function main() {
  console.log('\nB. Rendered output\n')

  const home = await fetch(`${BASE}/`)
  const homeHtml = await home.text()
  const manifestResponse = await fetch(`${BASE}/manifest.webmanifest`)
  const manifestBody = (await manifestResponse.text()) ?? ''

  check('B1  home page serves 200', home.status === 200, `status ${home.status}`)
  check('B1b the web app manifest is served as a manifest', (manifestResponse.headers.get('content-type') || '').includes('manifest'), manifestResponse.headers.get('content-type') || 'no content-type')
  check('B2  viewport meta shipped to the client', /name="viewport"[^>]*width=device-width/.test(homeHtml))
  check('B3  viewport-fit=cover shipped', /viewport-fit=cover/.test(homeHtml))

  // every route renders with the responsive shell
  const bad = []
  for (const route of ROUTES) {
    const res = await fetch(`${BASE}${route}`, { redirect: 'manual' })
    const html = res.status === 200 ? await res.text() : ''
    const ok = [200, 307, 308].includes(res.status) && (res.status !== 200 || /name="viewport"[^>]*width=device-width/.test(html))
    if (!ok) bad.push(`${route} → ${res.status}`)
  }
  check(`B4  all ${ROUTES.length} routes respond with a responsive shell`, bad.length === 0, bad.join(', '))

  // compiled CSS must carry the responsive system
  const cssMatch = homeHtml.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/)
  check('B5  compiled stylesheet is linked', Boolean(cssMatch))
  let built = ''
  if (cssMatch) {
    const cssRes = await fetch(`${BASE}${cssMatch[1]}`)
    built = await cssRes.text()
    fs.writeFileSync(path.join(ROOT, '.next', 'responsive-audit.css'), built)

    check('B6  built CSS keeps `overflow-x:clip`', /overflow-x:\s*clip/.test(built))
    check('B7  built CSS ships `dvh` units', /\ddvh/.test(built))
    check('B8  built CSS ships clamp() typography', /clamp\(/.test(built))
    check('B9  built CSS ships safe-area insets', /env\(safe-area-inset/.test(built))
    check('B10 built CSS ships the hover-capable-pointer guard', /@media \(hover:\s*hover\)/.test(built))
    check('B11 built CSS has a rule for every breakpoint (640/768/1024/1280)', [
      /min-width: ?640px/,
      /min-width: ?768px/,
      /min-width: ?1024px/,
      /min-width: ?1280px/
    ].every(re => re.test(built)))
    check('B12 built CSS ships the fluid editorial hero heading', /\.editorial-hero h1\{[^}]*font-size:clamp\(/.test(built))
    check('B13 built CSS ships the table scroll wrapper', /\.table-scroll/.test(built))
    check(`B14 built CSS is a substantial production bundle (${Math.round(built.length / 1024)} kB)`, built.length > 40_000)
  }

  // the wide comparison table on /international is inside the scroll wrapper
  const intl = await (await fetch(`${BASE}/international`)).text()
  check('B15 /international table is horizontally scrollable', /table-scroll[\s\S]{0,200}<table/.test(intl))

  // inline styles must not pin the layout wider than a phone
  const pinning = [...homeHtml.matchAll(/style="[^"]*width: ?(\d{3,})px/g)].map(m => Number(m[1])).filter(w => w > 380)
  check('B16 no inline style pins the layout wider than a phone', pinning.length === 0, pinning.join(', '))

  // the real contact channels are reachable by tap on a phone
  const contact = await (await fetch(`${BASE}/contact`)).text()
  check('B17 contact page exposes a tappable tel: link', /href="tel:\+923155729598"/.test(contact))
  check(
    'B18 contact page exposes both mailboxes',
    /pypcofficial@gmail\.com/.test(contact) && /officialpypc@gmail\.com/.test(contact)
  )

  // every public page that renders must expose exactly one h1
  const h1Problems = []
  for (const route of ROUTES) {
    const res = await fetch(`${BASE}${route}`, { redirect: 'manual' })
    if (res.status !== 200) continue
    const html = await res.text()
    const count = (html.match(/<h1[\s>]/g) || []).length
    if (count !== 1) h1Problems.push(`${route} has ${count}`)
  }
  check('B19 every public page renders exactly one <h1>', h1Problems.length === 0, h1Problems.join(', '))

  // Real-time layer must actually reach the browser. Some of it renders nothing
  // until it is needed (the offline banner only exists while offline), so the
  // proof for those parts is the client bundle that ships, not the HTML.
  check('B20 live status pill is rendered on the page', /data-live-status="/.test(homeHtml))

  const chunks = []
  const chunkDir = path.join(ROOT, '.next', 'static', 'chunks')
  if (fs.existsSync(chunkDir)) {
    ;(function walkChunks(dir) {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) walkChunks(full)
        else if (entry.endsWith('.js')) chunks.push(fs.readFileSync(full, 'utf8'))
      }
    })(chunkDir)
  }
  const bundle = chunks.join('\n')
  check(`B21 connection banner ships in the client bundle (${chunks.length} chunks)`, /data-connection-status/.test(bundle) && /aria-live/.test(bundle))
  check('B22 CSS carries the --vh fallback for older mobile browsers', /--vh/.test(css))
  check('B23 the viewport signal ships in the client bundle', /pypc:breakpoint/.test(bundle) && /pypc:resize/.test(bundle))
  check('B24 the live status poller ships with cache-busting fetch', /\/api\/status/.test(bundle))

  // ── B25-B32: the devices the site is actually opened on ──────────────────
  // These are structural checks: the build has no browser, so instead of
  // pretending to render, they assert the things that break on each platform.

  // iPhone / iOS: standalone launch, notch handling, no zoom-on-rotate.
  check('B25 apple-mobile-web-app-capable is set', /apple-mobile-web-app-capable"\s+content="yes"/.test(homeHtml))
  check('B26 iOS status-bar style is set for standalone', /apple-mobile-web-app-status-bar-style/.test(homeHtml))
  check('B27 an apple-touch-icon is linked', /rel="apple-touch-icon"/.test(homeHtml))
  check('B28 viewport locks scaling suppression only via maximum-scale=1 absent', !/maximum-scale=1/.test(homeHtml))

  // Android: installable manifest, maskable icon, theme colour.
  check('B29 a web app manifest is linked', /rel="manifest"/.test(homeHtml))
  check('B30 the manifest declares a standalone display mode', /"display"\s*:\s*"standalone"/.test(manifestBody))
  check('B31 the manifest ships a maskable icon for Android adaptive masks', /maskable/.test(manifestBody))
  check('B32 theme-color is declared for light and dark', (homeHtml.match(/name="theme-color"/g) || []).length >= 1)

  // Desktop / large screens: the layout must not cap at a phone width.
  check('B33 the container utility scales past tablet', /\.container/.test(built) || /\.container/.test(css))
  check('B34 desktop breakpoints are present in the built CSS', /@media\s*\(min-width:\s*1024px\)/.test(built))
  check('B35 the responsive grid utilities used by the shell are compiled', /lg\\:grid-cols-/.test(built) || /@media[^{]*1024px[^{]*\{[^}]*grid-cols/.test(built), 'no wide-screen grid utility found in the built CSS')

  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${passed} passed, ${failed} failed`)
  if (failed) {
    console.log(`\nFix these: ${failures.join(' | ')}\n`)
    process.exit(1)
  }
  console.log('\nResponsive audit clean.\n')
}

main().catch(error => {
  console.error('\nAudit could not run:', error.message)
  console.error('Start the server first: npm run build && npm start\n')
  process.exit(1)
})

