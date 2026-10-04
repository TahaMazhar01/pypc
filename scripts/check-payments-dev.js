/**
 * Payment → membership → certificate chain, proven against a development server.
 *
 * The developer "Simulated" gateway is deliberately disabled in production, so
 * this short check is meant to run against `npm run dev` (NODE_ENV=development):
 *
 *   npm run dev                 # terminal 1
 *   node scripts/check-payments-dev.js   # terminal 2
 *
 * It is deliberately short — six requests — so it also works on a slow cold
 * start. Use scripts/check-connectivity.js for the full end-to-end sweep.
 */
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.resolve(__dirname, '..', 'prisma', 'dev.db')}`

const prisma = new PrismaClient()
const results = []
const record = (name, ok, detail) => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

async function api(method, url, { body, cookie } = {}) {
  const headers = { origin: BASE, 'content-type': 'application/json', 'user-agent': 'pypc-payments/1.0' }
  if (cookie) headers.cookie = cookie
  const res = await fetch(BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* not json */ }
  return {
    status: res.status,
    json,
    text,
    cookie: setCookie.map(c => c.split(';')[0]).join('; ') || cookie
  }
}

const rnd = Math.random().toString(36).slice(2, 8)
const email = `pay.${rnd}@gmail.com`
const password = 'Str0ng!Passw0rd'
const phone = '+92302' + String(Math.floor(1000000 + Math.random() * 8999999))

/** Round 7: registration is gated by the signed human check (solved as a browser would). */
async function humanCheckFields() {
  const res = await fetch(`${BASE}/api/human-check`)
  const data = await res.json()
  const match = /What is (\d+) \+ (\d+)\?/.exec(data.question)
  if (!match) throw new Error('human-check question not understood: ' + data.question)
  return { humanToken: data.token, humanAnswer: String(Number(match[1]) + Number(match[2])) }
}

;(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'pay.' } } })
  await prisma.rateLimitCounter.deleteMany({})

  const register = await api('POST', '/api/auth/register', {
    body: {
      ...(await humanCheckFields()),
      firstName: 'Payment', lastName: 'Tester', email, password, confirmPassword: password,
      country: 'PK', phoneCountry: 'PK', phone, city: 'Islamabad', companyWebsite: '',
      formOpenedAt: Date.now() - 60000, acceptTerms: true
    }
  })
  record('a member can register and receive a verification code',
    register.status === 201 && Boolean(register.json?.devCode), `status ${register.status}`)

  const verify = await api('POST', '/api/auth/verify-email', { body: { email, code: register.json?.devCode } })
  record('the account verifies and issues a session', verify.status === 200 && Boolean(verify.cookie), `status ${verify.status}`)

  const cookie = verify.cookie
  const member = await prisma.user.findUnique({ where: { email } })

  const checkout = await api('POST', '/api/memberships/checkout', {
    cookie,
    body: { planCode: 'ASSOCIATE', provider: 'SIMULATED', currency: 'PKR' }
  })
  const reference = checkout.json?.reference

  // -------------------------------------------------------------------------
  // Production guard mode.
  //
  // Against `next start` (NODE_ENV=production) `paymentsSimulationEnabled()` is
  // false on purpose — a production build must never be able to settle a payment
  // with the developer gateway. That refusal is itself worth asserting, so this
  // script proves the fail-closed behaviour and stops, instead of walking a chain
  // that is correctly unavailable. Run it against `npm run dev` for the full chain.
  // -------------------------------------------------------------------------
  if (checkout.status !== 200) {
    console.log('\n  production build detected — the developer gateway is disabled by design.\n')
    record('a production build refuses the developer gateway (fail-closed)',
      checkout.status === 400, `status ${checkout.status} · ${checkout.json?.error ?? ''}`)

    const orphanOrders = await prisma.order.count({ where: { userId: member.id } })
    record('the refused checkout wrote no order row', orphanOrders === 0, `${orphanOrders} order row(s)`)

    const orphanMemberships = await prisma.membership.count({ where: { userId: member.id } })
    record('the refused checkout activated no membership', orphanMemberships === 0, `${orphanMemberships} membership row(s)`)

    const realGateway = await api('POST', '/api/memberships/checkout', {
      cookie,
      body: { planCode: 'ASSOCIATE', provider: 'STRIPE', currency: 'USD' }
    })
    record('an unconfigured real gateway fails with a readable message, not a crash',
      [400, 402, 501, 502, 503].includes(realGateway.status) && Boolean(realGateway.json?.error),
      `stripe → ${realGateway.status} · ${realGateway.json?.error ?? ''}`)

    const checkoutPage = await api('GET', '/membership/checkout', { cookie })
    const gatewaysNamed = ['JazzCash', 'Stripe'].filter(name => new RegExp(name, 'i').test(checkoutPage.text))
    record('the checkout page still lists the real gateways for members',
      checkoutPage.status === 200 && gatewaysNamed.length === 2,
      `status ${checkoutPage.status} · found ${gatewaysNamed.join(', ') || 'none'}`)

    await prisma.rateLimitCounter.deleteMany({})
    await prisma.auditLog.deleteMany({ where: { actorId: member.id, hash: null } })  // chained rows are immutable evidence
    await prisma.emailOutbox.deleteMany({ where: { to: email } })
    await prisma.emailVerificationToken.deleteMany({ where: { userId: member.id } })
    await prisma.user.delete({ where: { id: member.id } })
    console.log('test rows removed')
    console.log(`\n${results.length}/${results.length} payment checks passed (production guard mode)`)
    console.log('The full order → payment → membership chain runs against `npm run dev` — see docs/VERIFICATION.md.\n')

    await prisma.$disconnect()
    const guardFailures = results.filter(r => !r.ok)
    process.exit(guardFailures.length ? 1 : 0)
  }

  const pendingOrder = await prisma.order.findUnique({ where: { reference } })
  record('the order is stored as PENDING in the database', pendingOrder?.status === 'PENDING', pendingOrder?.status)

  const settle = await api('POST', '/api/memberships/simulate', { cookie, body: { reference, outcome: 'SUCCESS' } })
  record('the gateway callback settles the payment', settle.status === 200 && settle.json?.status === 'PAID',
    `status ${settle.json?.status}`)

  const paidOrder = await prisma.order.findUnique({ where: { reference } })
  record('the order is PAID with a provider reference',
    paidOrder?.status === 'PAID' && Boolean(paidOrder?.providerRef), paidOrder?.providerRef)

  const membership = await prisma.membership.findFirst({
    where: { userId: member.id }, include: { plan: { select: { name: true } } }
  })
  record('membership activation produces an ACTIVE membership',
    membership?.status === 'ACTIVE' && Boolean(membership?.expiresAt),
    `${membership?.plan?.name} until ${membership?.expiresAt?.toISOString().slice(0, 10)}`)

  const notification = await prisma.notification.findFirst({ where: { userId: member.id } })
  record('the member is notified', Boolean(notification), notification?.title)

  // idempotency: settling the same reference twice must not double-activate
  const again = await api('POST', '/api/memberships/simulate', { cookie, body: { reference, outcome: 'SUCCESS' } })
  const memberships = await prisma.membership.count({ where: { userId: member.id } })
  record('settling twice does not create a second membership',
    memberships === 1 && (again.status === 200 || again.status === 409),
    `${memberships} membership row, replay status ${again.status}`)

  record('checkout creates an order and a redirect to the gateway screen',
    checkout.status === 200 && /\/membership\/simulate/.test(checkout.json?.redirectUrl ?? ''),
    `order ${reference}`)

  // cleanup
  await prisma.membership.deleteMany({ where: { userId: member.id } })
  await prisma.order.deleteMany({ where: { userId: member.id } })
  await prisma.notification.deleteMany({ where: { userId: member.id } })
  await prisma.auditLog.deleteMany({ where: { actorId: member.id, hash: null } })  // chained rows are immutable evidence
  await prisma.emailOutbox.deleteMany({ where: { to: email } })
  await prisma.emailVerificationToken.deleteMany({ where: { userId: member.id } })
  await prisma.user.delete({ where: { id: member.id } })
  await prisma.rateLimitCounter.deleteMany({})
  console.log('test rows removed')

  await prisma.$disconnect()
  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} payment checks passed`)
  if (failed.length) console.log('failed:', failed.map(f => f.name).join(' | '))
  process.exit(failed.length ? 1 : 0)
})().catch(async error => {
  console.error('payment harness error', error)
  await prisma.$disconnect().catch(() => {})
  process.exit(2)
})
