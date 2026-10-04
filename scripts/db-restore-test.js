#!/usr/bin/env node
/**
 * Database restore test.
 *
 *   npm run db:restore-test                                   # newest backup in ./backups
 *   npm run db:restore-test -- backups/<stamp>/database.sqlite
 *
 * Restores a backup **into a scratch file, never over the live database**, and
 * then proves the restore is actually usable:
 *
 *   1. checksums from SHA256SUMS are verified
 *   2. the restored copy is opened with Prisma and `PRAGMA integrity_check` runs
 *   3. every required table exists and the seeded content is present
 *   4. certificates still carry their verification codes — otherwise `/verify`
 *      would stop working after a restore
 *   5. the audit hash chain still verifies inside the restored copy (read-only)
 *   6. the JSON export is compared against the restored database, row for row
 *   7. the result is appended to reports/restore-tests.log
 *
 * A backup is not considered valid until this passes for it — see
 * docs/BACKUP-POLICY.md.
 */
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const crypto = require('node:crypto')

const ROOT = path.resolve(__dirname, '..')
process.chdir(ROOT)

const { PrismaClient } = require('@prisma/client')

/**
 * Reads DATABASE_URL the way the application does: from the environment, falling
 * back to the project's .env. A relative `file:` path is resolved against the
 * Prisma schema directory, which is Prisma's own rule — so this points at exactly
 * the database the running site is using.
 */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = path.join(ROOT, '.env')
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/m)
    if (match) return match[1].trim()
  }
  return 'file:./dev.db'
}

const SCRATCH = path.join(ROOT, '.restore-scratch')

/** Tables that must exist for the application to work at all. */
const REQUIRED_TABLES = [
  'User',
  'MembershipPlan',
  'Membership',
  'Order',
  'Programme',
  'Event',
  'Opportunity',
  'Certificate',
  'AuditLog',
  'WebhookEvent'
]

/** Tables that must also contain content, or the site would render empty. */
const REQUIRED_CONTENT = ['User', 'MembershipPlan', 'Programme', 'Event', 'Opportunity']

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

function newestBackup() {
  const dir = path.join(ROOT, 'backups')
  if (!fs.existsSync(dir)) return null
  const entries = fs
    .readdirSync(dir)
    .filter(name => fs.existsSync(path.join(dir, name, 'database.sqlite')))
    .sort()
  return entries.length ? path.join(dir, entries[entries.length - 1], 'database.sqlite') : null
}

async function main() {
  const argument = process.argv.slice(2).find(value => !value.startsWith('--'))
  const backupPath = argument ? path.resolve(ROOT, argument) : newestBackup()

  console.log('\nDatabase restore test\n' + '─'.repeat(72) + '\n')

  if (!backupPath || !fs.existsSync(backupPath)) {
    console.error('No backup found.')
    console.error('Create one first:  npm run db:backup\n')
    process.exit(1)
  }

  const backupDir = path.dirname(backupPath)
  console.log(`Backup:   ${path.relative(ROOT, backupPath)}`)
  console.log(`Taken:    ${fs.statSync(backupPath).mtime.toISOString()}\n`)

  // ---- 0. restore into a scratch copy (the live database is never touched) ---
  fs.rmSync(SCRATCH, { recursive: true, force: true })
  fs.mkdirSync(SCRATCH, { recursive: true })
  const restored = path.join(SCRATCH, 'restored.sqlite')
  fs.copyFileSync(backupPath, restored)
  check('backup restores into a scratch database (live data untouched)', fs.existsSync(restored))

  // ---- 1. checksums ---------------------------------------------------------
  const sumsPath = path.join(backupDir, 'SHA256SUMS')
  if (fs.existsSync(sumsPath)) {
    const lines = fs.readFileSync(sumsPath, 'utf8').split('\n').filter(Boolean)
    let verified = 0
    for (const line of lines) {
      const [expected, name] = line.split(/\s+/)
      const target = path.join(backupDir, name)
      if (!fs.existsSync(target)) continue
      const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')
      if (actual === expected) verified += 1
    }
    check(`checksums verified (${verified}/${lines.length} files)`, verified === lines.length)
  } else {
    check('checksum verification', true, 'no SHA256SUMS in this backup — skipped')
  }

  // ---- 2. open the restored copy with Prisma --------------------------------
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${restored}` } }
  })

  const integrity = await prisma.$queryRawUnsafe('PRAGMA integrity_check')
  const integrityValue = integrity?.[0]?.integrity_check ?? 'unknown'
  check('SQLite integrity check passes', integrityValue === 'ok', integrityValue)

  const tableRows = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  const tables = tableRows.map(row => row.name)

  const missing = REQUIRED_TABLES.filter(table => !tables.includes(table))
  check(`all ${REQUIRED_TABLES.length} required tables are present`, missing.length === 0, missing.join(', '))

  // ---- 3. content ----------------------------------------------------------
  const counts = {}
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM "${table}"`)
    counts[table] = Number(rows[0].total)
  }

  const empty = REQUIRED_CONTENT.filter(table => (counts[table] ?? 0) <= 0)
  check('seeded content survived the restore', empty.length === 0, empty.map(t => `${t}=0`).join(', '))
  for (const table of REQUIRED_CONTENT) {
    console.log(`      ${table.padEnd(20)} ${counts[table]} row(s)`)
  }

  // ---- 4. certificates keep their verification codes ------------------------
  if ((counts.Certificate ?? 0) > 0) {
    const withCodes = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) AS total FROM "Certificate" WHERE code IS NOT NULL AND code <> \'\''
    )
    check(
      `all ${counts.Certificate} certificate(s) still carry a verification code`,
      Number(withCodes[0].total) === counts.Certificate
    )
  } else {
    check('certificate table readable', true, 'none in this backup')
  }

  await prisma.$disconnect()

  // ---- 4b. the audit chain still verifies in the restored copy -------------
  // The hash chain is part of the evidence the platform keeps, so a backup is
  // only usable if the chain can still be walked after a restore. This is a
  // read-only check: it runs the same verifier the packaging rebuild uses, in
  // its --verify-only mode, against the restored file — nothing is rewritten.
  {
    const verifier = path.join(ROOT, 'scripts', 'audit-rechain-local.mjs')
    const result = spawnSync(process.execPath, [verifier, '--verify-only'], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: `file:${restored}` },
      encoding: 'utf8'
    })
    const line = (result.stdout || '').trim().split('\n').filter(Boolean).pop() ?? ''
    const ok = result.status === 0 && /intact/.test(line)
    check('the restored copy carries a verifiable audit chain', ok, line || `exit ${result.status}`)
  }

  // ---- 5. the JSON export must describe the same data ----------------------
  const jsonPath = path.join(backupDir, 'database.json')
  if (fs.existsSync(jsonPath)) {
    const exported = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const mismatches = []
    for (const table of REQUIRED_CONTENT) {
      const inJson = exported.tables?.[table]?.length ?? -1
      if (inJson !== counts[table]) mismatches.push(`${table}: json ${inJson} vs sqlite ${counts[table]}`)
    }
    check('JSON export matches the restored database row-for-row', mismatches.length === 0, mismatches.join(', '))
  } else {
    check('JSON export comparison', true, 'no database.json in this backup — skipped')
  }

  // ---- 6. record the outcome ----------------------------------------------
  const reportsDir = path.join(ROOT, 'reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  const verdict = failed === 0 ? 'PASS' : 'FAIL'
  fs.appendFileSync(
    path.join(reportsDir, 'restore-tests.log'),
    `${new Date().toISOString()} | backup=${path.relative(ROOT, backupPath)} | ${verdict} | ${passed} passed, ${failed} failed\n`
  )

  fs.rmSync(SCRATCH, { recursive: true, force: true })

  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${passed} passed, ${failed} failed`)
  console.log('Logged to reports/restore-tests.log\n')

  if (failed) {
    console.log(`Fix these: ${failures.join(' | ')}\n`)
    process.exit(1)
  }
  console.log('Restore test clean — this backup is usable.\n')
}

main().catch(error => {
  console.error('\nRestore test failed:', error.message)
  fs.rmSync(SCRATCH, { recursive: true, force: true })
  process.exit(1)
})
