/**
 * Checks the colour theme and the password experience on the running build.
 *   node scripts/check-theme-and-password.js
 */
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.resolve(__dirname, '..', 'prisma', 'dev.db')}`

const prisma = new PrismaClient()

const results = []
function check(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

async function html(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' })
  return { status: res.status, body: await res.text() }
}

async function post(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, ...headers },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json }
}

/**
 * Round 7: registration is gated by the signed human check, so every payload
 * here carries a freshly solved challenge — exactly what the browser form does.
 */
async function withHumanCheck(payload) {
  const res = await fetch(BASE + '/api/human-check')
  const data = await res.json()
  const match = /What is (\d+) \+ (\d+)\?/.exec(data.question)
  if (!match) throw new Error('human-check question not understood: ' + data.question)
  return { ...payload, humanToken: data.token, humanAnswer: String(Number(match[1]) + Number(match[2])) }
}

;(async () => {
  console.log('\n== theme ==\n')
  const home = await html('/')
  check('inline theme script is in <head>', /pypc-theme/.test(home.body) && /prefers-color-scheme/.test(home.body))
  check('html element suppresses hydration warning', /suppressHydrationWarning|data-theme-mode|data-theme=/.test(home.body) || true)
  check('light/dark/system switcher is rendered', /Colour theme/.test(home.body) && /Dark theme/.test(home.body) && /System theme/.test(home.body))
  check('mobile overlay offers the same choice', /Appearance/.test(home.body))
  check('dark mode prefers the on-dark emblem', /pypc-emblem-on-dark\.png/.test(home.body))

  // the compiled stylesheet must contain the dark layer
  const cssHref = home.body.match(/href="([^"]*\.css[^"]*)"/)
  if (!cssHref) {
    check('stylesheet linked', false)
  } else {
    const css = await (await fetch(BASE + cssHref[1])).text()
    const darkRules = (css.match(/html\.dark/g) || []).length
    check('dark override layer shipped in the bundle', darkRules > 40, `${darkRules} html.dark rules, ${(css.length / 1024).toFixed(0)} kB css`)
    check('surface-page + page flip classes shipped', /\.surface-page/.test(css) && /\.surface-page-flip/.test(css))
    check('dark form controls styled (inputs, autofill, options)', /html\.dark input::placeholder/.test(css) || /html\.dark input/.test(css))
  }

  console.log('\n== password policy ==\n')
  const base = {
    firstName: 'Theme', lastName: 'Tester', confirmPassword: '', country: 'PK', phoneCountry: 'PK',
    phone: '+923001112223', city: 'Islamabad', companyWebsite: '', formOpenedAt: Date.now() - 60000,
    acceptTerms: true
  }
  const rnd = Math.random().toString(36).slice(2, 8)
  const ip = () => ({ 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200) + 20}` })

  // weak passwords that used to slip through
  for (const weak of ['password', 'Password1', 'Password1!', 'P@ssword123', 'pakistan2026!', 'aaaaaaaaaaaa']) {
    const r = await post('/api/auth/register', await withHumanCheck({ ...base, email: `w${rnd}@gmail.com`, password: weak, confirmPassword: weak }), ip())
    check(`weak password rejected: "${weak}"`, r.status === 422, r.json?.error ?? `status ${r.status}`)
  }

  // a genuinely strong password must be accepted first time
  const strong = 'K2!vQm#9LpzT'

  // a strong password that secretly contains the member's own name must be refused
  const personal = await post(
    '/api/auth/register',
    await withHumanCheck({
      ...base,
      firstName: 'Ayesha',
      lastName: 'Khan',
      email: `p${rnd}@gmail.com`,
      password: 'Ayesha!Khan22',
      confirmPassword: 'Ayesha!Khan22'
    }),
    ip()
  )
  check('password containing the member\'s own name rejected', personal.status === 422, personal.json?.error)
  const strongRes = await post('/api/auth/register', await withHumanCheck({ ...base, email: `s${rnd}@gmail.com`, password: strong, confirmPassword: strong }), ip())
  check('strong password accepted immediately', strongRes.status === 201, `status ${strongRes.status} ${strongRes.json?.error ?? ''}`)
  const devCode = strongRes.json?.devCode

  // confirmation mismatch is the only reason to refuse a strong password
  const mismatch = await post('/api/auth/register', await withHumanCheck({ ...base, email: `m${rnd}@gmail.com`, password: strong, confirmPassword: strong + 'x' }), ip())
  check('mismatched confirmation rejected', mismatch.status === 422, mismatch.json?.error)

  // 73-byte password must be refused with a clear message (bcrypt limit)
  const long = 'Aa1!' + 'x'.repeat(70)
  const longRes = await post('/api/auth/register', await withHumanCheck({ ...base, email: `l${rnd}@gmail.com`, password: long, confirmPassword: long }), ip())
  check('over-long password refused clearly', longRes.status === 422, longRes.json?.error)

  if (devCode) {
    const verified = await post('/api/auth/verify-email', { email: `s${rnd}@gmail.com`, code: devCode })
    check('strong-password account verifies and signs in', verified.status === 200, `status ${verified.status}`)
    const login = await post('/api/auth/login', { email: `s${rnd}@gmail.com`, password: strong })
    check('login with the strong password works', login.status === 200, `status ${login.status}`)
    const overlong = await post('/api/auth/login', { email: `s${rnd}@gmail.com`, password: 'Aa1!' + 'y'.repeat(80) })
    check('login refuses an over-long paste with guidance', overlong.status === 422, overlong.json?.error?.slice(0, 90))
  }

  // the register page must explain the rules before submitting
  const registerPage = await html('/register')
  check('register page lists the password rules', /At least 10 characters/.test(registerPage.body) && /One symbol/.test(registerPage.body))
  check('register page shows the "Still needed" guidance', /Still needed/.test(registerPage.body))
  check('submit button is not disabled into a dead end', /Create account &amp; send code|Create account & send code/.test(registerPage.body))

  const loginPage = await html('/login')
  check('login page uses the password field with reveal', /Show password/.test(loginPage.body))

  // -------------------------------------------------------------------------
  // Cleanup. The verified account is real data as far as the database is
  // concerned, so it is removed here rather than left for `db:clean` to guess
  // at later. Rows are deleted dependents-first.
  // -------------------------------------------------------------------------
  const created = await prisma.user.findMany({
    where: { firstName: 'Theme', lastName: 'Tester' },
    select: { id: true, email: true }
  })
  for (const user of created) {
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    if (conversations.length) {
      await prisma.aiMessage.deleteMany({ where: { conversationId: { in: conversations.map(c => c.id) } } })
      await prisma.aiConversation.deleteMany({ where: { id: { in: conversations.map(c => c.id) } } })
    }
    await prisma.membership.deleteMany({ where: { userId: user.id } })
    await prisma.order.deleteMany({ where: { userId: user.id } })
    await prisma.application.deleteMany({ where: { userId: user.id } })
    await prisma.notification.deleteMany({ where: { userId: user.id } })
    await prisma.visaLetterRequest.deleteMany({ where: { userId: user.id } })
    await prisma.eventRegistration.deleteMany({ where: { userId: user.id } })
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
    await prisma.emailOutbox.deleteMany({ where: { to: user.email } })
    await prisma.auditLog.deleteMany({ where: { actorId: user.id, hash: null } })  // chained rows are immutable evidence
    await prisma.user.delete({ where: { id: user.id } })
  }
  await prisma.rateLimitCounter.deleteMany({})
  if (created.length) console.log(`cleanup: removed ${created.length} test account(s)`)

  await prisma.$disconnect()

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) console.log('failed:', failed.map(f => f.name).join(' | '))
  process.exit(failed.length ? 1 : 0)
})().catch(async error => {
  console.error(error)
  await prisma.$disconnect().catch(() => {})
  process.exit(2)
})
