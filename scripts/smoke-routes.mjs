/**
 * Sweeps every public route on the running production build and reports status,
 * page size and (for a couple of key pages) the presence of WebGL canvases.
 */
// Honours BASE so the same sweep can run against a dev server or another port:
//   BASE=http://127.0.0.1:3300 node scripts/smoke-routes.mjs
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

const routes = [
  '/', '/about', '/leadership', '/programmes', '/events', '/opportunities', '/membership',
  '/membership/checkout', '/international', '/international/visa-letter', '/conferences',
  '/conferences/imun-2027', '/courses', '/research', '/records', '/partnerships', '/policies',
  '/privacy', '/terms', '/refund-policy', '/code-of-conduct', '/contact', '/faq', '/verify',
  '/accessibility', '/news', '/news/membership-tiers-2026', '/news/imun-2027-concept-note',
  '/cookies', '/impact', '/search', '/reports/pypc-impact-report-2026.pdf',
  '/verify/PYPC-A2B4-C6D8-E9F1', '/verify/PYPC-Z9Y8-X7W6-V5U4', '/register', '/login',
  '/verify-email', '/status', '/api/status', '/robots.txt', '/sitemap.xml'
]

;(async () => {
  let failures = 0
  for (const route of routes) {
    try {
      const res = await fetch(BASE + route, { redirect: 'manual' })
      const body = await res.text()
      const ok = res.status === 200
      if (!ok) failures += 1
      const canvases = (body.match(/<canvas/g) || []).length
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(res.status).padEnd(4)} ${route.padEnd(34)} ${String(body.length).padStart(7)} B${canvases ? `  canvases:${canvases}` : ''}`)
    } catch (error) {
      failures += 1
      console.log(`FAIL ---- ${route.padEnd(34)} ${error.message}`)
    }
  }

  // protected routes must bounce anonymous visitors
  for (const route of ['/dashboard', '/dashboard/profile', '/admin', '/admin/emails', '/admin/members']) {
    const res = await fetch(BASE + route, { redirect: 'manual' })
    const ok = res.status === 307 || res.status === 302
    if (!ok) failures += 1
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(res.status).padEnd(4)} ${route.padEnd(34)} (anonymous → login)`)
  }

  console.log(failures ? `\n${failures} failure(s)` : `\nall ${routes.length + 5} routes behaved correctly`)
  process.exit(failures ? 1 : 0)
})()
