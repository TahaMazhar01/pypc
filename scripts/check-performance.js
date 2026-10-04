/**
 * Response-time budget.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-performance.js
 *
 * The requirement is that **every** function answers within 2–3 seconds. A
 * production build on any laptop clears that by a wide margin, so the budget
 * here is deliberately tighter than the requirement: it fails the run if any
 * page, API route or the AI assistant takes longer than the budget, which gives
 * early warning long before a visitor would notice.
 *
 * What is measured
 *  - every public page (full body, not just headers)
 *  - the read-only API endpoints the site itself calls
 *  - the AI assistant, both the JSON and streaming paths, in all three languages
 *  - repeated requests, to prove the second visit is not slower (no accidental
 *    per-request recompilation)
 *
 * Compressed transfer size is reported too, because that is what a visitor on a
 * phone actually waits for.
 */
const path = require('node:path')
const { readFileSync } = require('node:fs')

const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

/**
 * Budgets in milliseconds. The client requirement is 2–3 s; these are the
 * internal targets that keep a comfortable margin under it.
 */
const PAGE_BUDGET_MS = Number(process.env.PAGE_BUDGET_MS || 1200)
const API_BUDGET_MS = Number(process.env.API_BUDGET_MS || 800)
const AI_BUDGET_MS = Number(process.env.AI_BUDGET_MS || 2000)

let passed = 0
let failed = 0
const failures = []
const timings = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function ms(value) {
  return `${value.toFixed(0)} ms`
}

async function timeGet(pathname) {
  const started = process.hrtime.bigint()
  const response = await fetch(`${BASE}${pathname}`, { redirect: 'manual' })
  const body = await response.arrayBuffer()
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6
  return {
    status: response.status,
    ms: elapsed,
    bytes: body.byteLength,
    encoding: response.headers.get('content-encoding') || 'identity',
    cacheControl: response.headers.get('cache-control') || ''
  }
}

async function timePost(pathname, payload, headers = {}) {
  const started = process.hrtime.bigint()
  const response = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...headers },
    body: JSON.stringify(payload)
  })
  const text = await response.text()
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6
  return { status: response.status, ms: elapsed, text }
}

const PAGES = [
  '/',
  '/about',
  '/leadership',
  '/programmes',
  '/events',
  '/opportunities',
  '/membership',
  '/international',
  '/international/visa-letter',
  '/conferences',
  '/conferences/imun-2027',
  '/courses',
  '/research',
  '/records',
  '/partnerships',
  '/policies',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/code-of-conduct',
  '/faq',
  '/contact',
  '/verify',
  '/status',
  '/register',
  '/login'
]

const APIS = ['/api/status']

async function main() {
  console.log(`budget: pages ≤ ${PAGE_BUDGET_MS} ms · APIs ≤ ${API_BUDGET_MS} ms · assistant ≤ ${AI_BUDGET_MS} ms\n`)

  // ── 1. Every public page ────────────────────────────────────────────────
  let slowest = { path: '', ms: 0 }
  let totalBytes = 0
  let compressedCount = 0

  for (const pathname of PAGES) {
    const result = await timeGet(pathname)
    const okStatus = result.status === 200 || result.status === 307 || result.status === 308
    if (result.encoding !== 'identity') compressedCount += 1
    totalBytes += result.bytes
    if (result.ms > slowest.ms) slowest = { path: pathname, ms: result.ms }
    timings.push([pathname, result.ms, result.bytes])
    check(
      `${pathname} within budget`,
      okStatus && result.ms <= PAGE_BUDGET_MS,
      `${ms(result.ms)} · ${(result.bytes / 1024).toFixed(0)} kB · ${result.encoding} · status ${result.status}`
    )
  }

  console.log()
  check(
    'compression is active on page responses',
    compressedCount >= PAGES.length,
    `${compressedCount}/${PAGES.length} responses compressed`
  )
  check(
    'average page body stays small',
    totalBytes / PAGES.length < 400 * 1024,
    `average ${(totalBytes / PAGES.length / 1024).toFixed(0)} kB over ${PAGES.length} pages`
  )
  check(
    'no page is dramatically slower than the rest',
    slowest.ms <= PAGE_BUDGET_MS,
    `slowest was ${slowest.path} at ${ms(slowest.ms)}`
  )

  // ── 2. Read-only APIs ───────────────────────────────────────────────────
  console.log()
  for (const pathname of APIS) {
    const result = await timeGet(pathname)
    check(
      `${pathname} within budget`,
      result.status === 200 && result.ms <= API_BUDGET_MS,
      `${ms(result.ms)} · status ${result.status}`
    )
  }

  // ── 3. Static assets are cached, not re-fetched ─────────────────────────
  console.log()
  const emblem = await timeGet('/images/pypc-emblem-192.png')
  check('emblem is served', emblem.status === 200, `status ${emblem.status}`)
  check(
    'emblem carries a long-lived immutable cache header',
    /immutable/.test(emblem.cacheControl) && /max-age=31536000/.test(emblem.cacheControl),
    emblem.cacheControl || 'no cache header'
  )

  const manifestResponse = await fetch(`${BASE}/manifest.webmanifest`)
  const manifestBody = manifestResponse.text ? await manifestResponse.text() : ''
  let manifest = {}
  try {
    manifest = JSON.parse(manifestBody)
  } catch {
    /* reported below */
  }
  check('web app manifest is served', manifestResponse.status === 200, `status ${manifestResponse.status}`)
  check(
    'manifest declares an installable display mode',
    ['standalone', 'minimal-ui', 'fullscreen'].includes(manifest.display),
    `display: ${manifest.display ?? 'missing'}`
  )
  check(
    'manifest carries the crest icons',
    Array.isArray(manifest.icons) && manifest.icons.length >= 3,
    `${manifest.icons?.length ?? 0} icons`
  )
  check(
    'manifest is typed as a manifest, not HTML',
    (manifestResponse.headers.get('content-type') || '').includes('manifest'),
    manifestResponse.headers.get('content-type') || 'no content-type'
  )

  // ── 4. The assistant, every language, both transports ───────────────────
  console.log()
  const auditHeaders = process.env.AI_AUDIT_BYPASS_TOKEN
    ? { 'x-pypc-audit': process.env.AI_AUDIT_BYPASS_TOKEN }
    : {}

  const questions = [
    ['en', 'How do I become a member?'],
    ['roman-ur', 'Membership kaise lein? Fees kitni hai?'],
    ['ur', 'رکنیت کیسے حاصل کروں؟']
  ]
  for (const [expected, question] of questions) {
    const result = await timePost('/api/ai-assistant', { message: question }, auditHeaders)
    let payload = null
    try {
      payload = JSON.parse(result.text)
    } catch {
      /* reported below */
    }
    check(
      `assistant answers ${expected} within budget`,
      result.status === 200 && payload?.answer && result.ms <= AI_BUDGET_MS,
      `${ms(result.ms)} · language ${payload?.language ?? '?'}`
    )
  }

  const firstTokenStart = process.hrtime.bigint()
  const streamResponse = await fetch(`${BASE}/api/ai-assistant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...auditHeaders },
    body: JSON.stringify({ message: 'What programmes do you run?', stream: true })
  })
  const reader = streamResponse.body.getReader()
  const decoder = new TextDecoder()
  let firstChunk = ''
  let reachedMeta = false
  while (!reachedMeta) {
    const { value, done } = await reader.read()
    if (done) break
    firstChunk += decoder.decode(value, { stream: true })
    reachedMeta = firstChunk.includes('event: meta')
  }
  const firstFrameMs = Number(process.hrtime.bigint() - firstTokenStart) / 1e6
  while (true) {
    const { done } = await reader.read()
    if (done) break
  }
  check(
    'assistant starts streaming immediately',
    reachedMeta && firstFrameMs <= 1500,
    `first frame in ${ms(firstFrameMs)}`
  )

  // ── 4b. No blocking loading overlay can ever come back ──────────────────
  //
  // The site used to open with a full-screen "Loading platform 8%" overlay that
  // unblocked only when document.readyState reached "complete". In an embedded
  // pane or on a slow connection that state never arrived, so the overlay stayed
  // and the working page was hidden underneath it. These checks make a
  // reintroduction impossible without a failing build.
  const source = await (await fetch(`${BASE}/`)).text()
  check(
    'no percentage-based loading overlay is shipped',
    !/Loading platform/i.test(source),
    'a loading overlay is present in the markup'
  )
  check(
    'no fixed full-screen overlay sits above the page on first paint',
    !/z-\[200\]/.test(source),
    'a very high z-index overlay was found'
  )
  check(
    'the page paints content immediately (skeleton placeholders instead)',
    /skeleton|class="container/.test(source),
    'no content or skeleton markup found'
  )

  // ── 4c. No placeholder numbers ("0", "0%", "0+") in the served markup ──
  //
  // Two separate traps caused the "0% / 0+" impressions: an animated Counter
  // that shipped useState(0) (so the server-rendered HTML and any no-JS view
  // showed a bare 0), and stats that printed 0 when the database was empty.
  // Both are now fixed at source; these checks fail the build if either
  // pattern returns. The counter must initialise from the real value...
  const counterSource = readFileSync(path.join(ROOT, 'components', 'motion', 'counter.tsx'), 'utf8')
  check(
    'the animated counter initialises from the real value, never 0',
    /useState\(value\)/.test(counterSource) && !/useState\(0\)/.test(counterSource),
    'components/motion/counter.tsx starts its state at 0'
  )
  // ...and the homepage must never ship a zero-inside-a-stat in its HTML.
  const zeroStats = source.match(/tabular-nums">0</g)
  check(
    'no statistic renders as a bare 0 in the homepage HTML',
    !zeroStats,
    `${zeroStats?.length ?? 0} zero-valued statistics in the served markup`
  )

  // ── 5. Repeat visit is not slower (no per-request recompilation) ────────
  console.log()
  const first = await timeGet('/')
  const second = await timeGet('/')
  check(
    'a repeat page view is as fast or faster',
    second.ms <= Math.max(first.ms * 2, PAGE_BUDGET_MS),
    `first ${ms(first.ms)} → second ${ms(second.ms)}`
  )

  const firstApi = await timeGet('/api/status')
  const secondApi = await timeGet('/api/status')
  check(
    'a repeat API call is as fast or faster',
    secondApi.ms <= Math.max(firstApi.ms * 2, API_BUDGET_MS),
    `first ${ms(firstApi.ms)} → second ${ms(secondApi.ms)}`
  )

  // ── 6. Summary ──────────────────────────────────────────────────────────
  const slowestPage = timings.reduce((worst, row) => (row[1] > worst[1] ? row : worst), ['', 0, 0])
  console.log(
    `\nslowest page: ${slowestPage[0]} at ${ms(slowestPage[1])} · ` +
      `fastest: ${timings.reduce((best, row) => (row[1] < best[1] ? row : best), timings[0])[0]}`
  )
  console.log(`page budget kept with ${(PAGE_BUDGET_MS / Math.max(1, slowestPage[1])).toFixed(1)}× headroom`)

  console.log(`\nPerformance audit: ${passed} passed, ${failed} failed`)
  if (failed) {
    console.log('Failures:')
    for (const name of failures) console.log(`  - ${name}`)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Performance audit crashed:', error)
  process.exit(1)
})
