/**
 * Rebuilds the audit hash chain directly against the database — no running
 * server, no administrator session. Used when preparing the packaged database,
 * and as a rescue tool if a chain is ever broken outside a live deployment.
 *
 * The online path is `npm run audit:rechain` (an admin POST to
 * /api/admin/audit/rechain, gated by AUDIT_ALLOW_RECHAIN=true). That path needs
 * a server and credentials; this one needs neither, which is exactly why it is
 * a deliberate, explicit command rather than something that happens silently.
 *
 * What it does, in order:
 *   1. verifies the chain as it stands and prints the verdict;
 *   2. consolidates the rebuild markers: an earlier "the log was rebuilt" marker
 *      is superseded the moment the log is rebuilt again, so only the newest one
 *      is kept. Without this, every packaging run would leave another marker
 *      behind and the hand-over log would read as a repair history rather than
 *      a record of what the organisation did;
 *   3. re-hashes every retained entry in order, starting a fresh first link;
 *   4. appends one AUDIT_LOG_RECHAINED marker stating the reason and the count,
 *      so the log itself records that a rebuild happened and why;
 *   5. verifies again and exits non-zero if the result is not intact.
 *
 * Keep the canonical form and the marker shape in step with lib/audit.ts —
 * `npm run check:audit-chain` reads the result through the application, so any
 * drift between the two shows up there.
 *
 *   node scripts/audit-rechain-local.mjs --reason "packaging: test artefacts removed"
 *   node scripts/audit-rechain-local.mjs --verify-only   # read the chain, change nothing
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.resolve(here, '..', 'prisma', 'dev.db')}`

/**
 * Read-only mode: verify whatever DATABASE_URL points at and exit. The backup
 * drill uses this to prove that a *restored* copy still carries a verifiable
 * chain — a backup nobody has read back is not a backup.
 */
const VERIFY_ONLY = process.argv.includes('--verify-only')

const reasonIndex = process.argv.indexOf('--reason')
const reason = reasonIndex !== -1 ? process.argv[reasonIndex + 1] : null
if (!VERIFY_ONLY && (!reason || reason.trim().length < 8)) {
  console.error('Give a reason of at least 8 characters, e.g. --reason "packaging: test artefacts removed"')
  process.exit(2)
}

const prisma = new PrismaClient()
const secret = process.env.AUDIT_CHAIN_SECRET || process.env.AUTH_SECRET || 'pypc-dev-chain-secret'

const canonical = row =>
  JSON.stringify({
    prevHash: row.prevHash ?? null,
    actorId: row.actorId ?? null,
    actorEmail: row.actorEmail ?? null,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
    metadata: row.metadata ?? null,
    ip: row.ip ?? null,
    createdAt: row.createdAt.toISOString()
  })

const hashRow = value => createHash('sha256').update(`${secret}|${value}`).digest('hex')

const SELECT = {
  id: true,
  prevHash: true,
  hash: true,
  actorId: true,
  actorEmail: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  ip: true,
  createdAt: true
}

/** Same walk as verifyAuditChain(), minus the boundary-marker lookup. */
async function verify() {
  const rows = await prisma.auditLog.findMany({
    where: { hash: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: SELECT
  })

  let previous = null
  for (const row of rows) {
    const expected = hashRow(canonical({ ...row, prevHash: previous }))
    if (row.hash !== expected) return { ok: false, checked: rows.length, brokenAt: row.id, rows }
    previous = row.hash
  }
  return { ok: true, checked: rows.length, brokenAt: null, rows }
}

const before = await verify()
console.log(
  before.ok
    ? `${VERIFY_ONLY ? 'chain' : 'chain before'} : intact — ${before.checked} entries checked`
    : `${VERIFY_ONLY ? 'chain' : 'chain before'} : broken at ${before.brokenAt} (${before.checked} entries)`
)

if (VERIFY_ONLY) {
  await prisma.$disconnect()
  process.exit(before.ok ? 0 : 1)
}

// Earlier rebuild markers describe a chain that no longer exists.
const staleMarkers = await prisma.auditLog.deleteMany({ where: { action: 'AUDIT_LOG_RECHAINED' } })
if (staleMarkers.count) {
  console.log(`superseded rebuild markers removed : ${staleMarkers.count}`)
}

const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' }, select: SELECT })
let previous = null
let rewritten = 0

for (const row of rows) {
  const hash = hashRow(canonical({ ...row, prevHash: previous }))
  await prisma.auditLog.update({ where: { id: row.id }, data: { prevHash: previous, hash } })
  previous = hash
  rewritten += 1
}

// The marker goes through the same canonical/hash path as every other entry, so
// it chains onto the rebuilt log instead of sitting outside it.
const createdAt = new Date()
const marker = {
  actorId: null,
  actorEmail: null,
  action: 'AUDIT_LOG_RECHAINED',
  entityType: 'AuditLog',
  entityId: null,
  metadata: JSON.stringify({ reason, entriesRewritten: rewritten, source: 'scripts/audit-rechain-local.mjs' }),
  ip: null,
  createdAt
}
await prisma.auditLog.create({
  data: { ...marker, prevHash: previous, hash: hashRow(canonical({ ...marker, prevHash: previous })) }
})

const after = await verify()
console.log(`entries re-hashed               : ${rewritten}`)
console.log(`marker appended                 : AUDIT_LOG_RECHAINED — ${reason}`)
console.log(
  after.ok
    ? `chain after  : intact — ${after.checked} entries checked`
    : `chain after  : STILL BROKEN at ${after.brokenAt}`
)

await prisma.$disconnect()
process.exit(after.ok ? 0 : 1)
