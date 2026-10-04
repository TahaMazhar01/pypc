/**
 * Health check — calls the running site's own /api/status endpoint and asserts
 * the shape a monitor relies on.
 *
 *   node scripts/check-health.js
 *   BASE=http://127.0.0.1:3100 node scripts/check-health.js
 *
 * Exit code 0 = every component operational or explicitly awaiting credentials,
 * 1 = something is actually broken (database unreachable, storage not writable).
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

const results = []
const record = (name, ok, detail) => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

;(async () => {
  const page = await fetch(`${BASE}/status`, { redirect: 'manual' })
  const pageHtml = await page.text()
  record('GET /status renders the connectivity page',
    page.status === 200 && /System status/i.test(pageHtml) && /Database/i.test(pageHtml),
    `status ${page.status}`)

  const res = await fetch(`${BASE}/api/status`)
  const report = await res.json().catch(() => null)

  record('GET /api/status returns a health report',
    Boolean(report) && typeof report.overall === 'string' && Array.isArray(report.checks),
    `status ${res.status}, overall "${report?.overall}"`)

  record('the endpoint answers 200 when nothing has failed (503 is reserved for real failures)',
    res.status === 200 || (res.status === 503 && report?.overall === 'fail'),
    `status ${res.status}`)

  const byId = new Map((report?.checks ?? []).map(check => [check.id, check]))
  for (const id of ['database', 'email', 'storage', 'payments', 'assets']) {
    record(`the report covers "${id}"`, byId.has(id), byId.get(id)?.state)
  }

  const database = byId.get('database')
  record('the database check reports live counts',
    database?.state === 'ok' && (database.facts ?? []).some(f => f.label === 'Members'),
    database?.facts?.find(f => f.label === 'Members')?.value)

  record('the storage check proves the folder is writable',
    byId.get('storage')?.state === 'ok', byId.get('storage')?.detail?.slice(0, 60))

  const assets = byId.get('assets')
  record('branding and the institutional PDFs are present',
    assets?.state === 'ok' && assets.facts?.some(f => f.label === 'Institutional PDFs' && Number(f.value) >= 8),
    assets?.facts?.map(f => `${f.label}=${f.value}`).join(' · '))

  // The organisation's own display name contains the word "…secretariat", and
  // "Payment simulation" is the documented dev mode label — neither is a secret.
  const scanned = JSON.stringify(report)
    .replace(/Payment simulation/gi, '')
    .replace(/secretariat/gi, '')
  record('no secret value is exposed by the endpoint',
    !/\b(secret|password|passwd|api[_-]?key|apikey|sk_live|sk_test|client[_-]?secret|access[_-]?token|DATABASE_URL|JWT_SECRET|SMTP_PASSWORD)\b/i.test(scanned),
    'scanned the JSON body for credential-shaped values')

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} health checks passed`)
  if (failed.length) console.log('failed:', failed.map(f => f.name).join(' | '))
  process.exit(failed.length ? 1 : 0)
})().catch(error => {
  console.error('health check error', error)
  process.exit(2)
})
