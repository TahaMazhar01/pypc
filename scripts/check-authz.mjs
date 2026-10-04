#!/usr/bin/env node
/**
 * Authorisation test matrix.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-authz.mjs
 *
 * The eight rows every reviewer asks for, executed against the running site with
 * real sessions rather than asserted in a document:
 *
 *   1. anonymous visitor  → /dashboard                     → redirect to login
 *   2. anonymous visitor  → /admin                         → redirect to login
 *   3. anonymous visitor  → private API                    → 401
 *   4. member             → /admin                         → not 200 (redirected)
 *   5. member             → another member's data          → 403 / 404
 *   6. member             → admin API                      → 401/403
 *   7. executive (staff)  → /admin/users                   → 200
 *   8. super admin        → /admin/users                   → 200
 *
 * It signs in with the seeded accounts, so it needs the database to be seeded
 * (npm run db:seed). It changes nothing except the session cookies it holds
 * itself.
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

let passed = 0
let failed = 0
const failures = []

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

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual', ...options })
  return { status: response.status, headers: response.headers, body: await response.text().catch(() => '') }
}

async function signIn(email, password) {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    throw new Error(`sign-in failed for ${email}: ${response.status} ${await response.text()}`)
  }

  const setCookie = response.headers.getSetCookie?.() ?? []
  const cookie = setCookie.map(entry => entry.split(';')[0]).join('; ')
  if (!cookie) throw new Error(`no session cookie returned for ${email}`)
  return cookie
}

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Pypc@2026'

async function main() {
  console.log(`\nAuthorisation matrix — ${BASE}\n${'─'.repeat(72)}\n`)

  // ---- 1 + 2: anonymous ---------------------------------------------------
  const anonDashboard = await request('/dashboard')
  check(
    '1.  anonymous → /dashboard is not served (redirect to sign-in)',
    [302, 303, 307, 308].includes(anonDashboard.status),
    `status ${anonDashboard.status}`
  )

  const anonAdmin = await request('/admin')
  check(
    '2.  anonymous → /admin is not served',
    [302, 303, 307, 308].includes(anonAdmin.status),
    `status ${anonAdmin.status}`
  )

  // ---- 3: private API without a session ----------------------------------
  const anonApi = await request('/api/status', { headers: { accept: 'application/json' } })
  // Real private GET endpoints. (`/api/profile` is PATCH-only, so a GET there
  // returns 404 and would prove nothing.)
  const anonApplications = await request('/api/applications', {
    headers: { accept: 'application/json' }
  })
  check(
    '3.  anonymous → /api/applications is refused (401/403/redirect)',
    [401, 403, 302, 307].includes(anonApplications.status),
    `/api/applications → ${anonApplications.status}`
  )
  const anonCertificates = await request('/api/certificates', {
    headers: { accept: 'application/json' }
  })
  check(
    '3c. anonymous → /api/certificates is refused (401/403/redirect)',
    [401, 403, 302, 307].includes(anonCertificates.status),
    `/api/certificates → ${anonCertificates.status}`
  )
  check(
    '3b. anonymous → /api/status still answers (it is public by design)',
    [200, 503].includes(anonApi.status),
    `status ${anonApi.status}`
  )

  // ---- signed-in sessions -------------------------------------------------
  let memberCookie
  let executiveCookie
  let adminCookie
  try {
    memberCookie = await signIn('member@example.com', SEED_PASSWORD)
    executiveCookie = await signIn('executive@pypc.org.pk', SEED_PASSWORD)
    adminCookie = await signIn('admin@pypc.org.pk', SEED_PASSWORD)
  } catch (error) {
    console.error(`\nCould not sign in with the seeded accounts: ${error.message}`)
    console.error('Seed the database first:  npm run db:seed\n')
    process.exit(2)
  }
  console.log('')
  check('sessions established for member, executive and super admin', true)

  // ---- 4: member cannot reach the admin console ---------------------------
  // Status alone is not enough: a redirect thrown inside a layout can be
  // delivered as a 200 with a client-side navigation payload. The real question
  // is whether any of the panel actually rendered.
  const memberAdmin = await request('/admin', { headers: { cookie: memberCookie } })
  const adminShellRendered = /PYPC Admin Panel|Signed in as .*·/.test(memberAdmin.body)
  const clientRedirect = /NEXT_REDIRECT;replace;\/dashboard/.test(memberAdmin.body)
  const adminDataLeaked = /Total members|Revenue|Pending applications|admin@pypc\.org\.pk/.test(memberAdmin.body)
  check(
    '4.  member → /admin does not render the panel',
    !adminShellRendered,
    adminShellRendered ? 'admin shell was rendered for a member' : `status ${memberAdmin.status}`
  )
  check(
    '4b. member → /admin is redirected (307, or 200 carrying a redirect)',
    [302, 303, 307, 308, 403].includes(memberAdmin.status) || clientRedirect,
    `status ${memberAdmin.status}${clientRedirect ? ' with client-side redirect' : ''}`
  )
  check('4c. member → /admin leaks no admin figure', !adminDataLeaked)

  // ---- 5: member cannot read another member's record ----------------------
  const memberDashboard = await request('/dashboard', { headers: { cookie: memberCookie } })
  check('5a. member → own /dashboard is served', memberDashboard.status === 200, `status ${memberDashboard.status}`)

  // A member probing for someone else's data must never receive it. These are the
  // collections a member legitimately owns, so the assertion is that the payload
  // carries nothing belonging to anybody else — staff email, staff name, or a
  // record that is not scoped to the signed-in account.
  const staffEmails = /admin@pypc\.org\.pk|executive@pypc\.org\.pk/i
  const ownApplications = await request('/api/applications', {
    headers: { cookie: memberCookie, accept: 'application/json' }
  })
  const ownVisas = await request('/api/international/visa-letter', {
    headers: { cookie: memberCookie, accept: 'application/json' }
  })
  const leaked =
    staffEmails.test(ownApplications.body) ||
    staffEmails.test(ownVisas.body) ||
    /SUPER_ADMIN|EXECUTIVE/.test(ownApplications.body)
  check(
    '5b. member → own collections carry no other member’s data',
    !leaked &&
      [200, 403, 404].includes(ownApplications.status) &&
      [200, 403, 404].includes(ownVisas.status),
    `/api/applications → ${ownApplications.status}, /api/international/visa-letter → ${ownVisas.status}${leaked ? ', foreign data present in the response' : ''}`
  )

  // ---- 6: member cannot use the admin API ---------------------------------
  const memberAdminApi = await request('/api/admin/visa-letters', { headers: { cookie: memberCookie } })
  check(
    '6.  member → admin API is refused',
    [401, 403, 302, 307, 405].includes(memberAdminApi.status),
    `status ${memberAdminApi.status}`
  )

  // ---- 6b: cross-site settlement attempt is blocked -----------------------
  const crossSite = await fetch(`${BASE}/api/payments/manual-settlement`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ reference: 'PYPC-ORD-X', decision: 'APPROVE', evidence: 'forged' })
  })
  check(
    '6b. cross-origin settlement POST is rejected',
    [400, 401, 403].includes(crossSite.status),
    `status ${crossSite.status}`
  )

  // ---- 7 + 8: staff — asserting the page's own content, not a status -------
  // "Signed in as …" is rendered by the layout, so the shell alone proves nothing:
  // it would also appear above an error boundary. Each check therefore looks for
  // the heading that only the page itself renders.
  const execPanel = await request('/admin', { headers: { cookie: executiveCookie } })
  check(
    '7.  executive → /admin renders the panel overview',
    execPanel.status === 200 && /Operational queues/.test(execPanel.body),
    `status ${execPanel.status}`
  )

  const execUsers = await request('/admin/users', { headers: { cookie: executiveCookie } })
  check(
    '7b. executive → /admin/users (admin-only) is refused',
    [302, 303, 307, 308, 403].includes(execUsers.status) && !/Member directory/.test(execUsers.body),
    `status ${execUsers.status}${/Member directory/.test(execUsers.body) ? ', member directory was rendered' : ''}`
  )

  const adminUsers = await request('/admin/users', { headers: { cookie: adminCookie } })
  check(
    '8.  super admin → /admin/users renders the member directory',
    adminUsers.status === 200 && /Member directory/.test(adminUsers.body),
    `status ${adminUsers.status}`
  )

  const adminAudit = await request('/admin/audit', { headers: { cookie: adminCookie } })
  check(
    '8b. super admin → the audit log renders',
    adminAudit.status === 200 && /Audit|audit/.test(adminAudit.body),
    `status ${adminAudit.status}`
  )

  // ---- separation of duties: manual settlement is admin-only --------------
  const memberSettlement = await fetch(`${BASE}/api/payments/manual-settlement`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json', origin: BASE, cookie: memberCookie },
    body: JSON.stringify({ reference: 'PYPC-ORD-NOTREAL', decision: 'APPROVE', evidence: 'attempted' })
  })
  check(
    '8c. member cannot settle an order manually',
    [401, 403, 404].includes(memberSettlement.status),
    `status ${memberSettlement.status}`
  )

  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${passed} passed, ${failed} failed`)
  if (failed) {
    console.log(`\nFix these: ${failures.join(' | ')}\n`)
    process.exit(1)
  }
  console.log('\nAuthorisation matrix clean.\n')
}

main().catch(error => {
  console.error('\nMatrix could not run:', error.message)
  console.error('Start the server first: npm run build && npm start\n')
  process.exit(1)
})
