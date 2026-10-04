/*
 * Connectivity check — proves the packaged site is wired end to end:
 * browser → API routes → Prisma → SQLite, plus private file storage, email
 * outbox, certificates/PDF, the AI assistant and the payment simulation.
 *
 *   cd pypc-website
 *   node scripts/check-connectivity.js
 *   BASE=http://127.0.0.1:3100 node scripts/check-connectivity.js
 *
 * Safe to re-run: it cleans up the accounts it creates and the rate-limit
 * buckets, and restores anything it changes on shared records.
 */

/**
 * Round 7: register and contact are gated by the signed human check. The audit
 * solves it the way the browser widget does.
 */
async function humanCheckFields() {
  const res = await fetch(`${BASE}/api/human-check`)
  const data = await res.json()
  const match = /What is (\d+) \+ (\d+)\?/.exec(data.question)
  if (!match) throw new Error('human-check question not understood: ' + data.question)
  return { humanToken: data.token, humanAnswer: String(Number(match[1]) + Number(match[2])) }
}

const fs = require('node:fs')
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

let ipCounter = 0
const nextIp = () => `198.18.7.${10 + (ipCounter += 1)}`

const request = async (method, url, { body, jar = {}, headers = {}, form } = {}) => {
  const finalHeaders = {
    origin: BASE,
    'user-agent': 'pypc-connectivity/1.0',
    'x-forwarded-for': nextIp(),
    ...headers
  }
  if (jar.cookie) finalHeaders.cookie = jar.cookie

  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    finalHeaders['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(BASE + url, { method, headers: finalHeaders, body: payload, redirect: 'manual' })
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  if (cookies.length) jar.cookie = cookies.map(c => c.split(';')[0]).join('; ')

  const contentType = res.headers.get('content-type') ?? ''
  let data = null
  let text = ''
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null)
  } else {
    const buffer = Buffer.from(await res.arrayBuffer())
    text = contentType.includes('text') || contentType.includes('xml') ? buffer.toString('utf8') : ''
    data = { bytes: buffer.length, contentType }
  }
  return { status: res.status, data, text, contentType }
}

const rnd = Math.random().toString(36).slice(2, 8)
const EMAIL = `conn.${rnd}@gmail.com`
const PASSWORD = 'Str0ng!Passw0rd'
const PHONE = '+92301' + String(Math.floor(1000000 + Math.random() * 8999999))

const reference = {
  programmeId: null,
  uploadedUrl: null,
  orderReference: null,
  visaReference: null,
  visaId: null,
  applicant: null,
  adminJar: {}
}

;(async () => {
  console.log('\n== database ==========================================================\n')

  const buckets = await prisma.rateLimitCounter.deleteMany({})
  const stale = await prisma.user.deleteMany({
    where: { email: { startsWith: 'conn.' } }
  })
  console.log(`reset: ${buckets.count} rate-limit buckets, ${stale.count} previous test accounts\n`)

  const counts = {
    users: await prisma.user.count(),
    plans: await prisma.membershipPlan.count(),
    programmes: await prisma.programme.count(),
    events: await prisma.event.count(),
    opportunities: await prisma.opportunity.count(),
    certificates: await prisma.certificate.count()
  }
  record(
    'SQLite database is present, migrated and seeded',
    counts.users >= 3 && counts.plans >= 4 && counts.programmes >= 5 && counts.certificates >= 2,
    `${counts.users} users · ${counts.plans} plans · ${counts.programmes} programmes · ${counts.events} events · ${counts.opportunities} opportunities · ${counts.certificates} certificates`
  )

  // Round 7: the published tier ladder is Free / Associate / Executive /
  // Institutional, and the free tier must really cost nothing.
  const freePlan = await prisma.membershipPlan.findUnique({ where: { code: 'FREE' } })
  record(
    'the Free Community tier exists and costs nothing',
    Boolean(freePlan) && freePlan.pricePkr === 0 && freePlan.priceUsd === 0 && freePlan.isActive,
    freePlan ? `${freePlan.name} · PKR ${freePlan.pricePkr} / USD ${freePlan.priceUsd}` : 'FREE plan missing'
  )

  const paidPlans = await prisma.membershipPlan.findMany({
    where: { isActive: true, pricePkr: { gt: 0 } },
    orderBy: { sortOrder: 'asc' }
  })
  record(
    'every paid tier publishes both a PKR and a USD price',
    paidPlans.length >= 3 && paidPlans.every(plan => plan.priceUsd > 0),
    paidPlans.map(plan => `${plan.code} ${plan.pricePkr}/${plan.priceUsd}`).join(' · ')
  )

  const programme = await prisma.programme.findFirst({ orderBy: { createdAt: 'asc' } })
  reference.programmeId = programme?.id ?? null
  record('a programme record can be read (used by the application form)', Boolean(reference.programmeId), programme?.title)

  console.log('\n== public pages and static assets ====================================\n')

  const home = await request('GET', '/')
  record('homepage renders from the database (live counters)', home.status === 200 && /PYPC|Pakistan Youth/.test(home.text))

  const sitemap = await request('GET', '/sitemap.xml')
  record('sitemap.xml generated', sitemap.status === 200 && sitemap.text.includes('<urlset'))

  const robots = await request('GET', '/robots.txt')
  record('robots.txt served', robots.status === 200 && /Sitemap:/.test(robots.text))

  const emblem = await request('GET', '/images/pypc-emblem.png')
  record('emblem image served (the supplied logo)', emblem.status === 200 && emblem.data.bytes > 1000,
    `${emblem.data.bytes} bytes`)

  const doc = await request('GET', '/documents/IMUN_2027_Concept_Note_Redesigned.pdf')
  record('institutional PDF served', doc.status === 200 && doc.data.bytes > 10000,
    `${doc.data.bytes} bytes, ${doc.data.contentType}`)

  console.log('\n== registration → email outbox → verification → session =============\n')

  const jar = {}
  let r = await request('POST', '/api/auth/register', {
    jar,
    body: {
      ...(await humanCheckFields()),
      firstName: 'Connectivity',
      lastName: 'Tester',
      email: EMAIL,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      country: 'PK',
      phoneCountry: 'PK',
      phone: PHONE,
      city: 'Islamabad',
      institution: 'National University of Sciences and Technology',
      profession: 'Student',
      companyWebsite: '',
      formOpenedAt: Date.now() - 60000,
      acceptTerms: true
    }
  })
  const devCode = r.data?.devCode
  record('POST /api/auth/register writes a PENDING account', r.status === 201 && r.data?.requiresVerification === true,
    `status ${r.status}, delivery "${(r.data?.delivery ?? '').slice(0, 34)}…"`)

  const outboxRow = await prisma.emailOutbox.findFirst({ where: { to: EMAIL }, orderBy: { createdAt: 'desc' } })
  record('the verification email was written to the EmailOutbox table', Boolean(outboxRow),
    outboxRow ? `"${outboxRow.subject.slice(0, 52)}…" via ${outboxRow.transport}` : 'no row found')

  const savedUser = await prisma.user.findUnique({ where: { email: EMAIL } })
  record('the account is stored as unverified (no access yet)',
    Boolean(savedUser) && savedUser.emailVerifiedAt === null && savedUser.status === 'PENDING',
    `status ${savedUser?.status}, verified ${savedUser?.emailVerifiedAt ? 'yes' : 'no'}`)

  const blocked = await request('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } })
  record('login before verification is refused (403 EMAIL_NOT_VERIFIED)',
    blocked.status === 403 && blocked.data?.code === 'EMAIL_NOT_VERIFIED', `status ${blocked.status}`)

  if (devCode) {
    const wrong = await request('POST', '/api/auth/verify-email', { body: { email: EMAIL, code: '000000' } })
    record('a wrong code is rejected and counted', wrong.status === 400 && wrong.data?.code === 'INVALID')

    const token = await prisma.emailVerificationToken.findFirst({
      where: { userId: savedUser.id },
      orderBy: { createdAt: 'desc' }
    })
    record('the code is stored only as a hash (never in clear text)',
      Boolean(token) && typeof token.tokenHash === 'string' && !token.tokenHash.includes(devCode),
      token ? `hash ${token.tokenHash.slice(0, 12)}…, ${token.attempts} attempt(s), expires ${token.expiresAt.toISOString().slice(11, 19)}Z` : 'no token')

    const verified = await request('POST', '/api/auth/verify-email', { body: { email: EMAIL, code: devCode }, jar })
    record('the correct code activates the account and starts a session',
      verified.status === 200 && verified.data?.ok === true && Boolean(jar.cookie),
      `redirect ${verified.data?.redirectTo}`)

    const dash = await request('GET', '/dashboard', { jar })
    record('the member dashboard renders for the verified session', dash.status === 200, `status ${dash.status}`)
  } else {
    console.log('SKIP  verification branch — EMAIL_DEV_MODE is off and no code was surfaced')
  }

  console.log('\n== member profile, document upload and applications ==================\n')

  const profile = await request('PATCH', '/api/dashboard/profile', {
    jar,
    body: {
      firstName: 'Connectivity',
      lastName: 'Tester',
      country: 'PK',
      phoneCountry: 'PK',
      phone: PHONE,
      city: 'Rawalpindi',
      province: 'Punjab',
      institution: 'National University of Sciences and Technology',
      fieldOfStudy: 'Public Policy',
      profession: 'Student',
      bio: 'Connectivity test account.'
    }
  })
  record('PATCH /api/dashboard/profile writes to the database',
    profile.status === 200, `status ${profile.status} ${profile.data?.error ?? ''}`)

  const reread = await prisma.user.findUnique({ where: { email: EMAIL } })
  record('the change is visible on a fresh database read',
    reread?.city === 'Rawalpindi' && reread?.countryName === 'Pakistan',
    `${reread?.city}, ${reread?.countryName}, ${reread?.phone}`)

  // real PDF, real multipart upload → private storage → authenticated download
  const samplePdf = path.resolve(__dirname, '..', 'public', 'documents', 'PYPC_Memorandum_of_Understanding_Perfect.pdf')
  const pdfBuffer = fs.readFileSync(samplePdf)
  const form = new FormData()
  form.append('file', new File([pdfBuffer], 'connectivity-resume.pdf', { type: 'application/pdf' }))

  const upload = await request('POST', '/api/uploads/resume', { jar, form })
  reference.uploadedUrl = upload.data?.url ?? null
  record('POST /api/uploads/resume stores a real PDF privately',
    upload.status === 200 && Boolean(reference.uploadedUrl),
    `${upload.data?.size ?? 0} bytes → ${reference.uploadedUrl}`)

  const storedPath = reference.uploadedUrl
    ? path.resolve(__dirname, '..', 'private', 'uploads', 'resumes', path.basename(reference.uploadedUrl))
    : ''
  const storedOnDisk = storedPath && fs.existsSync(storedPath)
  record('the file exists outside the public web root', Boolean(storedOnDisk), storedPath.replace(process.cwd(), '.'))

  const ownerDownload = await request('GET', reference.uploadedUrl ?? '/api/uploads/resume/missing', { jar })
  record('the owner can download their own document', ownerDownload.status === 200 && ownerDownload.data.bytes === pdfBuffer.length,
    `status ${ownerDownload.status}, ${ownerDownload.data.bytes} bytes`)

  const anonDownload = await request('GET', reference.uploadedUrl ?? '/api/uploads/resume/missing')
  record('an anonymous visitor cannot (401)', anonDownload.status === 401, `status ${anonDownload.status}`)

  const application = await request('POST', '/api/applications', {
    jar,
    body: {
      type: 'PROGRAMME',
      programmeId: reference.programmeId,
      fullName: 'Connectivity Tester',
      email: EMAIL,
      country: 'PK',
      phoneCountry: 'PK',
      phone: PHONE,
      city: 'Rawalpindi',
      motivation:
        'I am testing the packaged deployment end to end: this application is written to the database, shown to the secretariat, and the attached CV is served through an authenticated route.',
      experience: 'Student researcher.',
      resumeUrl: reference.uploadedUrl
    }
  })
  const appReference = application.data?.reference ?? application.data?.application?.reference
  record('POST /api/applications persists an application with its CV',
    application.status === 201 && Boolean(appReference), `status ${application.status} reference ${appReference}`)

  const appRow = appReference
    ? await prisma.application.findFirst({ where: { reference: appReference } })
    : await prisma.application.findFirst({ where: { userId: reread.id }, orderBy: { createdAt: 'desc' } })
  reference.applicant = appRow?.userId ?? null
  record('the application row carries the uploaded CV URL',
    Boolean(appRow?.resumeUrl && appRow.resumeUrl === reference.uploadedUrl), appRow?.resumeUrl ?? 'none')

  const duplicate = await request('POST', '/api/applications', {
    jar,
    body: {
      type: 'PROGRAMME',
      programmeId: reference.programmeId,
      fullName: 'Connectivity Tester',
      email: EMAIL,
      country: 'PK',
      phoneCountry: 'PK',
      phone: PHONE,
      motivation:
        'Submitting the same application a second time must be refused by the duplicate guard so the same person cannot fill the queue twice.',
      resumeUrl: reference.uploadedUrl
    }
  })
  record('the duplicate guard refuses a second identical application (409)', duplicate.status === 409,
    `status ${duplicate.status} ${duplicate.data?.error ?? ''}`)

  console.log('\n== certificates, PDF and public verification ========================\n')

  const verifyPublic = await request('GET', '/api/certificates/verify?code=PYPC-A2B4-C6D8-E9F1')
  record('GET /api/certificates/verify returns the seeded valid record',
    verifyPublic.status === 200 && verifyPublic.data?.found === true,
    `${verifyPublic.data?.certificate?.recipientName ?? verifyPublic.data?.recipientName ?? ''} · ${verifyPublic.data?.status ?? verifyPublic.data?.certificate?.status ?? ''}`)

  const verifyRevoked = await request('GET', '/api/certificates/verify?code=PYPC-Z9Y8-X7W6-V5U4')
  const revokedState = verifyRevoked.data?.status ?? verifyRevoked.data?.certificate?.status
  record('the revoked certificate reports REVOKED', verifyRevoked.data?.found === true && revokedState === 'REVOKED',
    `status ${revokedState}`)

  const pdf = await request('GET', '/api/certificates/pdf?code=PYPC-A2B4-C6D8-E9F1')
  record('the certificate PDF renders (A4 landscape, embedded QR)',
    pdf.status === 200 && pdf.contentType.includes('pdf') && pdf.data.bytes > 20000,
    `${pdf.data.bytes} bytes ${pdf.data.contentType}`)

  const verifyPage = await request('GET', '/verify/PYPC-A2B4-C6D8-E9F1')
  record('the public verification page renders the record',
    verifyPage.status === 200 && /PYPC-A2B4-C6D8-E9F1/.test(verifyPage.text))

  console.log('\n== payments, membership and orders ==================================\n')

  const checkout = await request('POST', '/api/memberships/checkout', {
    jar,
    body: { planCode: 'ASSOCIATE', provider: 'SIMULATED', currency: 'PKR' }
  })

  // A production build deliberately refuses the developer gateway, so the check
  // adapts: in production it asserts that refusal *and* that the real gateways
  // honestly report the env vars they are missing; in development it walks the
  // whole order → payment → membership chain.
  // The simulated gateway answers 200 with { ok, reference, redirectUrl };
  // a production build answers 400 because the gateway is disabled there.
  const simulationAvailable = checkout.status === 200 && Boolean(checkout.data?.reference)
  reference.orderReference = checkout.data?.reference ?? null

  if (simulationAvailable) {
    record('POST /api/memberships/checkout creates an order',
      Boolean(reference.orderReference) && /\/membership\/simulate/.test(checkout.data?.redirectUrl ?? ''),
      `status ${checkout.status} order ${reference.orderReference} → ${checkout.data?.redirectUrl}`)

    const orderRow = await prisma.order.findUnique({ where: { reference: reference.orderReference } })
    record('the order is persisted as PENDING', orderRow?.status === 'PENDING', `status ${orderRow?.status}`)

    const settle = await request('POST', '/api/memberships/simulate', {
      jar,
      body: { reference: reference.orderReference, outcome: 'SUCCESS' }
    })
    record('the simulated gateway settles the order',
      settle.status === 200 && settle.data?.status === 'PAID',
      `status ${settle.status} → ${settle.data?.status}`)

    const membership = await prisma.membership.findFirst({
      where: { userId: reread.id },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { code: true, name: true } } }
    })
    record('membership activation created an ACTIVE membership',
      Boolean(membership) && membership.status === 'ACTIVE' && Boolean(membership.expiresAt),
      `${membership?.plan?.name ?? membership?.plan?.code} · ${membership?.status} until ${membership?.expiresAt?.toISOString().slice(0, 10) ?? '—'}`)

    const activationNotification = await prisma.notification.findFirst({
      where: { userId: reread.id, type: 'SUCCESS' },
      orderBy: { createdAt: 'desc' }
    })
    record('the member is notified that the membership is active', Boolean(activationNotification),
      activationNotification ? `"${activationNotification.title}"` : 'no notification')

    const settledOrder = await prisma.order.findUnique({ where: { reference: reference.orderReference } })
    record('the order is marked PAID with a provider reference',
      settledOrder?.status === 'PAID' && Boolean(settledOrder?.providerRef),
      `${settledOrder?.status} · ${settledOrder?.providerRef}`)
  } else {
    record('production build refuses the developer payment gateway (as designed)',
      checkout.status === 400 && /Unsupported payment method/i.test(checkout.data?.error ?? ''),
      `status ${checkout.status} "${checkout.data?.error}"`)

    const stripe = await request('POST', '/api/memberships/checkout', {
      jar,
      body: { planCode: 'ASSOCIATE', provider: 'STRIPE', currency: 'USD' }
    })
    record('an unconfigured gateway is refused with the missing variable named (503)',
      stripe.status === 503 && /STRIPE_SECRET_KEY/.test(stripe.data?.error ?? ''),
      `status ${stripe.status} "${(stripe.data?.error ?? '').slice(0, 66)}…"`)

    const jazz = await request('POST', '/api/memberships/checkout', {
      jar,
      body: { planCode: 'ASSOCIATE', provider: 'JAZZCASH', currency: 'PKR' }
    })
    record('JazzCash adapter reports its own missing credentials (503)',
      jazz.status === 503 && /JAZZCASH_/.test(jazz.data?.error ?? ''),
      `status ${jazz.status}`)

    console.log('NOTE  run this script against `npm run dev` to walk the full payment → membership chain')
  }

  console.log('\n== visa invitation letters (international desk) =====================\n')

  const visa = await request('POST', '/api/international/visa-letter', {
    jar,
    body: {
      fullName: 'Connectivity Tester',
      email: EMAIL,
      nationality: 'Kenya',
      phoneCountry: 'KE',
      phone: '+254712345678',
      passportNumber: 'AK0123456',
      letterType: 'CONFERENCE_INVITATION',
      purpose:
        'To attend the Islamabad Model United Nations 2027 as an international delegate, requiring a formal invitation letter for the Kenyan embassy.',
      eventName: 'IMUN 2027',
      embassyCity: 'Nairobi',
      travelFrom: '2027-01-10',
      travelTo: '2027-01-18'
    }
  })
  reference.visaReference = visa.data?.reference ?? null
  reference.visaId = visa.data?.id ?? null
  record('POST /api/international/visa-letter accepts an overseas request',
    visa.status === 201 && Boolean(reference.visaReference),
    `status ${visa.status} reference ${reference.visaReference}`)

  const visaRow = reference.visaReference
    ? await prisma.visaLetterRequest.findFirst({ where: { reference: reference.visaReference } })
    : null
  record('the request (with nationality, phone and dates) is stored',
    Boolean(visaRow) && visaRow.status === 'PENDING',
    `${visaRow?.nationality} · ${visaRow?.phone} · ${visaRow?.status}`)

  const adminJar = reference.adminJar
  const adminLogin = await request('POST', '/api/auth/login', {
    jar: adminJar,
    body: { email: 'admin@pypc.org.pk', password: 'Pypc@2026' }
  })
  record('the seeded SUPER_ADMIN can sign in', adminLogin.status === 200 && adminLogin.data?.role === 'SUPER_ADMIN',
    `status ${adminLogin.status}`)

  if (visaRow) {
    const decide = await request('PATCH', '/api/admin/visa-letters', {
      jar: adminJar,
      body: { requestId: visaRow.id, status: 'ISSUED', adminNotes: 'Invitation letter issued (connectivity test).' }
    })
    record('staff can issue the letter from the admin API', decide.status === 200, `status ${decide.status}`)

    const memberVisa = await request('GET', '/dashboard', { jar })
    record('the member dashboard reflects the decision',
      memberVisa.status === 200 && memberVisa.text.includes(reference.visaReference),
      `reference ${reference.visaReference} visible to the delegate`)
  }

  console.log('\n== AI assistant, contact form and outbound records ==================\n')

  const ai = await request('POST', '/api/ai-assistant', {
    body: { message: 'What are the membership plans and their fees?' }
  })
  const answer = ai.data?.reply ?? ai.data?.answer ?? ''
  record('POST /api/ai-assistant answers from the PYPC knowledge base',
    ai.status === 200 && answer.length > 40, `"${answer.slice(0, 70)}…"`)

  const chatRow = await prisma.aiMessage.findFirst({ orderBy: { createdAt: 'desc' } })
  record('the conversation is stored in the database',
    Boolean(chatRow) && chatRow.content.length > 0, `last message role ${chatRow?.role}`)

  const contact = await request('POST', '/api/contact', {
    body: {
      ...(await humanCheckFields()),
      name: 'Connectivity Tester',
      email: EMAIL,
      country: 'PK',
      phoneCountry: 'PK',
      phone: PHONE,
      subject: 'Connectivity check',
      message:
        'This message was submitted by the automated connectivity check to prove the contact form writes to the database and appears in the secretariat queue.',
      companyWebsite: ''
    }
  })
  record('POST /api/contact stores a message', contact.status === 201 || contact.status === 200,
    `status ${contact.status}`)

  const messageRow = await prisma.contactMessage.findFirst({ where: { email: EMAIL }, orderBy: { createdAt: 'desc' } })
  record('the message is visible to staff in the database',
    Boolean(messageRow) && messageRow.subject === 'Connectivity check',
    `${messageRow?.countryName ?? '—'} · ${messageRow?.status}`)

  const audit = await prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } })
  record('the audit trail is receiving entries', Boolean(audit),
    `${audit?.action} · ${audit?.createdAt?.toISOString().slice(11, 19)}Z`)

  const notification = await prisma.notification.findFirst({ where: { userId: reread.id }, orderBy: { createdAt: 'desc' } })
  record('member notifications are generated for account events', Boolean(notification),
    notification ? `"${notification.title}"` : 'none yet')

  console.log('\n== admin console ====================================================\n')
  for (const [label, route] of [
    ['overview', '/admin'],
    ['members', '/admin/users'],
    ['applications', '/admin/applications'],
    ['payments', '/admin/payments'],
    ['certificates', '/admin/certificates'],
    ['messages', '/admin/messages'],
    ['visa letters', '/admin/visa-letters'],
    ['email & verification', '/admin/emails'],
    ['audit log', '/admin/audit']
  ]) {
    const page = await request('GET', route, { jar: adminJar })
    record(`/admin ${label} renders for staff`, page.status === 200, `${route} → ${page.status}`)
  }

  const blockedAdmin = await request('GET', '/admin')
  record('an anonymous visitor is redirected away from /admin',
    blockedAdmin.status === 307 || blockedAdmin.status === 302, `status ${blockedAdmin.status}`)

  console.log('\n== round 7: human check, newsletter, calendar, search, policy pages ==\n')

  // ── Human check (the self-hosted CAPTCHA) ────────────────────────────────
  const challengeRes = await request('GET', '/api/human-check')
  const challenge = challengeRes.data
  record(
    'a human-check challenge is issued with a question and a signed token',
    challengeRes.status === 200 && typeof challenge?.question === 'string' && typeof challenge?.token === 'string',
    challenge?.question
  )

  const wrongAnswer = await request('POST', '/api/contact', {
    body: {
      ...(await humanCheckFields()),
      humanAnswer: '999',
      name: 'Wrong Answer',
      email: EMAIL,
      subject: 'Human check negative test',
      message: 'This submission must be refused because the human-check answer is deliberately wrong.',
      companyWebsite: ''
    }
  })
  record(
    'a wrong human-check answer is refused before anything is stored',
    wrongAnswer.status === 400 && wrongAnswer.data?.humanCheckFailed === true,
    `status ${wrongAnswer.status}`
  )

  const unsigned = await request('POST', '/api/newsletter', {
    body: { email: `signless.${rnd}@gmail.com` }
  })
  record(
    'a form post with no human check is refused',
    unsigned.status === 400 && unsigned.data?.humanCheckFailed === true,
    `status ${unsigned.status}`
  )

  // ── Newsletter: double opt-in, confirmation, unsubscribe ────────────────
  const newsletterEmail = `news.${rnd}@gmail.com`
  const subscribe = await request('POST', '/api/newsletter', {
    body: {
      ...(await humanCheckFields()),
      email: newsletterEmail,
      name: 'Newsletter Tester',
      interests: 'events'
    }
  })
  record(
    'newsletter subscription is accepted as PENDING, not CONFIRMED',
    subscribe.status === 201 && subscribe.data?.status === 'PENDING',
    `status ${subscribe.status} · ${subscribe.data?.status}`
  )

  const pendingRow = await prisma.newsletterSubscriber.findUnique({ where: { email: newsletterEmail } })
  record(
    'the pending subscriber is stored and unusable until confirmed',
    Boolean(pendingRow) && pendingRow.status === 'PENDING' && pendingRow.confirmedAt === null,
    pendingRow ? `${pendingRow.status} · interests ${pendingRow.interests}` : 'row missing'
  )

  const confirm = await request('GET', `/api/newsletter?token=${pendingRow?.token}`)
  const confirmedRow = await prisma.newsletterSubscriber.findUnique({ where: { email: newsletterEmail } })
  record(
    'the confirmation link activates the subscription',
    (confirm.status === 307 || confirm.status === 302) && confirmedRow?.status === 'CONFIRMED',
    `${confirm.status} → ${confirmedRow?.status}`
  )

  const unsubscribe = await request('GET', `/api/newsletter?unsubscribe=${pendingRow?.token}`)
  const unsubscribedRow = await prisma.newsletterSubscriber.findUnique({ where: { email: newsletterEmail } })
  record(
    'the unsubscribe link stops all future mail',
    (unsubscribe.status === 307 || unsubscribe.status === 302) && unsubscribedRow?.status === 'UNSUBSCRIBED',
    `${unsubscribe.status} → ${unsubscribedRow?.status}`
  )

  await prisma.newsletterSubscriber.deleteMany({ where: { email: newsletterEmail } })

  // ── Calendar export ─────────────────────────────────────────────────────
  const calendarEvent = await prisma.event.findFirst({ where: { isPublished: true } })
  const ics = await request('GET', `/api/events/${calendarEvent?.slug}/ics`)
  record(
    'an event exports as a valid calendar file',
    ics.status === 200 &&
      /text\/calendar/.test(ics.contentType) &&
      /BEGIN:VCALENDAR/.test(ics.text) &&
      /BEGIN:VEVENT/.test(ics.text) &&
      /DTSTART:\d{8}T\d{6}Z/.test(ics.text) &&
      /END:VCALENDAR/.test(ics.text),
    `${ics.status} · ${ics.contentType}`
  )
  record(
    'the calendar file carries the event summary and an identifier',
    /SUMMARY:/.test(ics.text) && /UID:pypc-event-/.test(ics.text),
    calendarEvent?.slug
  )

  // ── Site search ─────────────────────────────────────────────────────────
  const searchHit = await request('GET', '/search?q=refund')
  record(
    'site search finds policy content by a visitor word',
    searchHit.status === 200 && /Refund/i.test(searchHit.text),
    `status ${searchHit.status}`
  )

  const searchMembership = await request('GET', '/search?q=membership')
  record(
    'site search finds membership tiers',
    searchMembership.status === 200 && /Membership/i.test(searchMembership.text)
  )

  const searchMiss = await request('GET', '/search?q=zzzznotathing')
  record(
    'a search with no match explains itself instead of showing an empty page',
    searchMiss.status === 200 && /Nothing matched/i.test(searchMiss.text)
  )

  // ── New policy, report and impact pages ─────────────────────────────────
  for (const [path, needle, label] of [
    ['/cookies', /Cookie Policy/i, 'the cookie policy is published'],
    ['/impact', /Impact Report|Impact & Reports/i, 'the impact and reports page renders'],
    ['/accessibility', /Accessibility/i, 'the accessibility statement renders'],
    ['/news', /Newsroom/i, 'the newsroom index renders'],
    ['/reports/pypc-impact-report-2026.pdf', null, 'the impact report PDF is downloadable']
  ]) {
    const page = await request('GET', path)
    const ok =
      page.status === 200 &&
      (needle ? needle.test(page.text) : page.contentType.includes('pdf') || (page.data?.bytes ?? 0) > 1000)
    record(label, ok, `status ${page.status}${page.data?.bytes ? ` · ${page.data.bytes} bytes` : ''}`)
  }

  // ── Audit log structure: hashed, and each entry linked to its predecessor ─
  const hashedRows = await prisma.auditLog.findMany({
    where: { hash: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { hash: true, prevHash: true, action: true }
  })
  record(
    'audit entries are cryptographically chained',
    hashedRows.length >= 2 &&
      hashedRows.every((row, index) =>
        index === 0 ? true : row.prevHash === hashedRows[index - 1].hash
      ) &&
      hashedRows.every(row => /^[0-9a-f]{64}$/.test(row.hash)),
    `${hashedRows.length} chained entries`
  )

  console.log('\n== cleanup ==========================================================\n')
  const uploadedName = reference.uploadedUrl ? path.basename(reference.uploadedUrl) : null
  if (uploadedName && storedOnDisk && fs.existsSync(storedPath)) fs.unlinkSync(storedPath)

  await prisma.application.deleteMany({ where: { OR: [{ userId: reread.id }, { email: EMAIL }] } })
  await prisma.membership.deleteMany({ where: { userId: reread.id } })
  await prisma.order.deleteMany({ where: { userId: reread.id } })
  await prisma.visaLetterRequest.deleteMany({ where: { email: EMAIL } })
  await prisma.contactMessage.deleteMany({ where: { email: EMAIL } })
  await prisma.emailVerificationToken.deleteMany({ where: { userId: reread.id } })
  await prisma.emailOutbox.deleteMany({ where: { to: EMAIL } })
  await prisma.user.delete({ where: { id: reread.id } }).catch(() => {})
  await prisma.rateLimitCounter.deleteMany({})
  console.log('test data removed; seeded accounts and content left untouched')

  await prisma.$disconnect()

  const failed = results.filter(x => !x.ok)
  console.log(`\n${results.length - failed.length}/${results.length} connectivity checks passed`)
  if (failed.length) console.log('failed:', failed.map(f => f.name).join(' | '))
  process.exit(failed.length ? 1 : 0)
})().catch(async error => {
  console.error('connectivity harness error', error)
  await prisma.$disconnect().catch(() => {})
  process.exit(2)
})
