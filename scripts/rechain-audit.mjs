/**
 * Rebuild the audit chain after a documented retention trim.
 *
 * The chain is a sequence: every entry hashes the one before it. Deleting a
 * middle entry (for example, removing a rejected test account before hand-over)
 * therefore breaks every hash that follows, and the admin console reports it
 * correctly. This script rebuilds the chain from the retained window and records
 * the rebuild as an `AUDIT_LOG_RECHAINED` entry, so the history stays honest:
 * anyone reviewing the log sees that a rebuild happened, when, and why.
 *
 * It needs a server with `AUDIT_ALLOW_RECHAIN="true"` and administrator
 * credentials. Everything else is read-only.
 *
 *   AUDIT_ALLOW_RECHAIN=true npx next start -p 3000
 *   node scripts/rechain-audit.mjs --reason "removed rejected test accounts before hand-over"
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const args = process.argv.slice(2)
const reasonIndex = args.indexOf('--reason')
const reason =
  reasonIndex !== -1 && args[reasonIndex + 1]
    ? args[reasonIndex + 1]
    : 'documented retention trim performed during delivery preparation'

const EMAIL = process.env.ADMIN_EMAIL || 'admin@pypc.org.pk'
const PASSWORD = process.env.ADMIN_PASSWORD || 'Pypc@2026'

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  })

  if (!login.ok) {
    console.error(`Sign-in as ${EMAIL} failed with status ${login.status}.`)
    process.exit(1)
  }

  const cookies = login.headers.getSetCookie ? login.headers.getSetCookie() : []
  const session = cookies.find(cookie => cookie.startsWith('pypc_session'))
  if (!session) {
    console.error('No session cookie was issued — is the account a verified administrator?')
    process.exit(1)
  }

  const res = await fetch(`${BASE}/api/admin/audit/rechain`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: BASE,
      cookie: session.split(';')[0]
    },
    body: JSON.stringify({ reason })
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    console.error(`Re-chain refused (${res.status}): ${data?.error ?? 'no message'}`)
    process.exit(1)
  }

  console.log(`Audit chain rebuilt: ${data.entriesRewritten} entries re-hashed.`)
  console.log(`Recorded as AUDIT_LOG_RECHAINED with reason: ${data.reason}`)
  console.log('Open /admin/audit to confirm the console reports the chain as intact.')
}

main().catch(error => {
  console.error('re-chain crashed:', error)
  process.exit(1)
})
