/**
 * End-to-end verification of the registration, login and anti-abuse rules.
 *
 *   cd pypc-website
 *   node scripts/check-registration.js            # against http://127.0.0.1:3000
 *   BASE=http://127.0.0.1:3100 node scripts/check-registration.js
 *
 * It resets its own throwaway rows and rate-limit buckets first, so it can be
 * run repeatedly against a live database. Every check prints PASS/FAIL with the
 * server's own message, so failures are diagnosable without a debugger.
 */
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.resolve(__dirname, '..', 'prisma', 'dev.db')}`

const prisma = new PrismaClient()
const results = []
function record(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

async function reset() {
  const buckets = await prisma.rateLimitCounter.deleteMany({})
  const users = await prisma.user.deleteMany({
    where: { email: { notIn: ['admin@pypc.org.pk', 'executive@pypc.org.pk', 'member@example.com'] } }
  })
  await prisma.emailVerificationToken.deleteMany({})
  console.log(`reset: ${buckets.count} rate-limit buckets, ${users.count} throwaway accounts\n`)
}

let ipCounter = 0
const nextIp = () => `203.0.113.${10 + (ipCounter += 1)}`

/**
 * Round 7: public forms are protected by a signed, server-issued human check
 * (see lib/security/human-check.ts). A real browser solves it; so does this
 * audit — it asks for a challenge, computes the answer and attaches both to the
 * payload, which is exactly what the widget does.
 */
async function withHumanCheck(payload) {
  const res = await fetch(BASE + '/api/human-check')
  const data = await res.json()
  const match = /What is (\d+) \+ (\d+)\?/.exec(data.question)
  if (!match) throw new Error('human-check question was not understood: ' + data.question)
  return { ...payload, humanToken: data.token, humanAnswer: String(Number(match[1]) + Number(match[2])) }
}

async function post(url, body, jar = {}, extraHeaders = {}) {
  const headers = { 'content-type': 'application/json', origin: BASE, 'user-agent': 'pypc-e2e/1.0', ...extraHeaders }
  if (jar.cookie) headers.cookie = jar.cookie
  const res = await fetch(BASE + url, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'manual' })
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (cookies.length) jar.cookie = cookies.map(c => c.split(';')[0]).join('; ')
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* html error page */ }
  return { status: res.status, json, cookies }
}

async function get(url, jar = {}) {
  const res = await fetch(BASE + url, {
    headers: jar.cookie ? { cookie: jar.cookie } : {},
    redirect: 'manual'
  })
  return { status: res.status, body: await res.text() }
}

const rnd = Math.random().toString(36).slice(2, 8)
const EMAIL = `e2e.${rnd}@gmail.com`
const PASSWORD = 'Str0ng!Passw0rd'
const PHONE = '+92300' + String(Math.floor(1000000 + Math.random() * 8999999))

const base = {
  firstName: 'Eve',
  lastName: 'Tester',
  email: EMAIL,
  password: PASSWORD,
  confirmPassword: PASSWORD,
  country: 'PK',
  phoneCountry: 'PK',
  phone: PHONE,
  city: 'Islamabad',
  institution: 'Quaid-e-Azam University',
  profession: 'Student',
  companyWebsite: '',
  formOpenedAt: Date.now() - 60000,
  acceptTerms: true
}

;(async () => {
  await reset()

  console.log('== positive flow ==\n')
  const jar = {}
  let r = await post('/api/auth/register', await withHumanCheck(base), jar)
  const devCode = r.json?.devCode
  record('valid registration → 201, verification required',
    r.status === 201 && r.json?.requiresVerification === true,
    `status ${r.status} delivery=${(r.json?.delivery ?? '').slice(0, 40)}…`)
  record('no session cookie before verification',
    !r.cookies.some(c => c.startsWith('pypc_session')))

  r = await post('/api/auth/login', { email: EMAIL, password: PASSWORD })
  record('login while unverified → 403 EMAIL_NOT_VERIFIED',
    r.status === 403 && r.json?.code === 'EMAIL_NOT_VERIFIED',
    `status ${r.status} canResend=${r.json?.canResend}`)

  const dash = await get('/dashboard')
  record('anonymous /dashboard is redirected to sign-in', dash.status === 307 || dash.status === 302, `status ${dash.status}`)

  if (!devCode) {
    console.log('\nSKIP  verification steps — EMAIL_DEV_MODE is off and no code was surfaced')
  } else {
    r = await post('/api/auth/verify-email', { email: EMAIL, code: '000000' })
    record('wrong code → 400 INVALID', r.status === 400 && r.json?.code === 'INVALID',
      `status ${r.status} code=${r.json?.code}`)

    r = await post('/api/auth/resend-verification', { email: EMAIL })
    const freshCode = r.json?.devCode ?? devCode
    record('resend issues a new code', r.status === 200, `status ${r.status}`)

    r = await post('/api/auth/verify-email', { email: EMAIL, code: freshCode }, jar)
    record('correct code → 200 with a session', r.status === 200 && r.json?.ok === true,
      `redirect=${r.json?.redirectTo} cookie=${jar.cookie ? 'set' : 'missing'}`)

    const dash2 = await get('/dashboard', jar)
    record('verified session opens /dashboard', dash2.status === 200, `status ${dash2.status}`)

    r = await post('/api/auth/verify-email', { email: EMAIL, code: freshCode })
    record('a used code cannot be replayed', r.status === 400, `code=${r.json?.code}`)

    const jar2 = {}
    r = await post('/api/auth/login', { email: EMAIL, password: PASSWORD }, jar2)
    record('login after verification → 200', r.status === 200, `role=${r.json?.role}`)

    r = await post('/api/dashboard/password',
      { currentPassword: PASSWORD, newPassword: 'abcdefgh' }, jar2)
    record('weak password change → 422', r.status === 422, r.json?.error)
  }

  console.log('\n== negative / anti-abuse ==\n')

  const cases = [
    ['invalid email syntax', { ...base, email: 'not-an-email' }],
    ['disposable email domain', { ...base, email: `x${rnd}@mailinator.com` }],
    ['phone invalid for the chosen country', { ...base, email: `y${rnd}@gmail.com`, phone: '12345' }],
    ['weak password', { ...base, email: `z${rnd}@gmail.com`, password: 'password', confirmPassword: 'password' }],
    ['password equal to the member name', { ...base, firstName: 'Eve', lastName: 'Tester', email: `n${rnd}@gmail.com`, password: 'EveTester!2026', confirmPassword: 'EveTester!2026' }],
    ['bot-speed submission', { ...base, email: `f${rnd}@gmail.com`, formOpenedAt: Date.now() - 100 }]
  ]
  for (const [label, payload] of cases) {
    const res = await post('/api/auth/register', await withHumanCheck(payload), {}, { 'x-forwarded-for': nextIp() })
    record(`${label} → 422`, res.status === 422, res.json?.error)
  }

  r = await post('/api/auth/register', await withHumanCheck({ ...base, email: `h${rnd}@gmail.com`, companyWebsite: 'http://spam.example' }), {}, { 'x-forwarded-for': nextIp() })
  record('honeypot is answered like a real signup (201)', r.status === 201 && r.json?.ok === true, `status ${r.status}`)

  const burstIp = nextIp()
  const burst = []
  for (let i = 0; i < 6; i += 1) {
    burst.push(await post('/api/auth/register', await withHumanCheck({ ...base, email: `burst${rnd}${i}@gmail.com` }), {}, { 'x-forwarded-for': burstIp }))
  }
  record('6th signup from one IP → 429 (5 per hour)',
    burst.slice(0, 5).every(x => x.status !== 429) && burst[burst.length - 1].status === 429,
    `statuses ${burst.map(x => x.status).join(',')} retryAfter=${burst[5].json?.retryAfterSeconds}s`)

  const cross = await fetch(BASE + '/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ name: 'x', email: 'x@gmail.com', message: 'hello world hello world' })
  })
  record('cross-origin POST → 403', cross.status === 403, `status ${cross.status}`)

  console.log('\n== existing accounts and pages ==\n')

  const adminJar = {}
  r = await post('/api/auth/login', { email: 'admin@pypc.org.pk', password: 'Pypc@2026' }, adminJar)
  record('seeded SUPER_ADMIN signs in', r.status === 200 && r.json?.role === 'SUPER_ADMIN', `status ${r.status}`)

  r = await post('/api/auth/login', { email: 'member@example.com', password: 'Pypc@2026' })
  record('seeded member signs in', r.status === 200, `status ${r.status}`)

  const emailsPage = await get('/admin/emails', adminJar)
  record('/admin/emails renders for staff', emailsPage.status === 200 && /verification/i.test(emailsPage.body), `status ${emailsPage.status}`)

  const registerPage = await get('/register')
  record('/register renders the country picker', registerPage.status === 200 && /Pakistan/.test(registerPage.body))

  const verifyPage = await get('/verify-email')
  record('/verify-email is reachable', verifyPage.status === 200)

  console.log('\n== cleanup ==\n')
  const removedUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'e2e.' } },
        { email: { startsWith: 'burst' } },
        { email: { startsWith: 'ui.' } }
      ]
    }
  })
  const removedTokens = await prisma.emailVerificationToken.deleteMany({})
  const removedOutbox = await prisma.emailOutbox.deleteMany({ where: { to: { startsWith: 'e2e.' } } })
  const removedBuckets = await prisma.rateLimitCounter.deleteMany({})
  console.log(
    `removed ${removedUsers.count} test accounts, ${removedTokens.count} tokens, ` +
      `${removedOutbox.count} outbox rows, ${removedBuckets.count} rate-limit buckets`
  )

  await prisma.$disconnect()

  const failed = results.filter(x => !x.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) console.log('failed:', failed.map(f => f.name).join(' | '))
  process.exit(failed.length ? 1 : 0)
})().catch(async error => {
  console.error('harness error', error)
  await prisma.$disconnect().catch(() => {})
  process.exit(2)
})
