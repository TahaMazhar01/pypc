/**
 * Audit-chain tamper test.
 *
 * Proves the claim the admin console makes — that the audit log is
 * tamper-evident, not merely append-only — by breaking it on purpose and
 * watching the platform report the break.
 *
 * It never touches the real database: a copy is taken, a second server is
 * started against the copy, and everything happens there.
 *
 *   1. copy prisma/dev.db                  →  <tmp>/chain.db
 *   2. start `next start` on a free port   →  DATABASE_URL points at the copy
 *   3. sign in as admin, open /admin/audit →  expect "Chain verified"
 *   4. edit one audit row directly in SQL  →  the edit a database thief would make
 *   5. open /admin/audit again             →  expect "Chain broken at entry …"
 *   6. stop the server, delete the copy
 *
 * Run against a built app:  node scripts/check-audit-chain.mjs
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(import.meta.url), '..', '..')
let PORT = Number(process.env.AUDIT_CHAIN_PORT || 3900)
/** Kept in step with PORT once a free one has been chosen. */
function base() {
  return `http://127.0.0.1:${PORT}`
}

let passed = 0
let failed = 0
const failures = []

const startedAt = Date.now()
function elapsed() {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
}

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  [${elapsed()}] ${name}${detail ? `  — ${detail}` : ''}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`FAIL  [${elapsed()}] ${name}${detail ? `  — ${detail}` : ''}`)
  }
}

const sourceDb = join(projectRoot, 'prisma', 'dev.db')
if (!existsSync(sourceDb)) {
  console.error('prisma/dev.db not found — seed the database first (npm run db:seed).')
  process.exit(1)
}

const workDir = mkdtempSync(join(tmpdir(), 'pypc-chain-'))
const testDb = join(workDir, 'chain.db')
copyFileSync(sourceDb, testDb)

const env = {
  ...process.env,
  DATABASE_URL: `file:${testDb}`,
  NODE_ENV: 'production',
  PORT: String(PORT)
}

/** Every request is bounded, so a half-started server can never hang the test. */
async function timedFetch(url, options = {}, ms = 8000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`no response within ${ms} ms`)), ms))
  ])
}

/**
 * A raw TCP probe, not an HTTP one: a stuck or half-started server still holds
 * the port open, and that is exactly the case this guard exists to catch.
 */
function portInUse() {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port: PORT })
    const done = inUse => {
      socket.destroy()
      resolve(inUse)
    }
    socket.setTimeout(2000)
    socket.on('connect', () => done(true))
    socket.on('timeout', () => done(true))
    socket.on('error', () => done(false))
  })
}

async function waitForServer(timeoutMs = 60_000) {
  let lastError = ''
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await timedFetch(`${base()}/api/status`, {}, 6000)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise(resolve => setTimeout(resolve, 700))
  }
  if (lastError) console.log(`(last probe error: ${lastError})`)
  return false
}

/** Reads the audit console the way a member of staff would. */
async function readAuditConsole(cookie) {
  const res = await timedFetch(`${base()}/admin/audit`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual'
  }, 12_000)
  const html = await res.text()
  return { status: res.status, html }
}

async function signInAsAdmin() {
  const res = await timedFetch(`${base()}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base() },
    body: JSON.stringify({ email: 'admin@pypc.org.pk', password: 'Pypc@2026' })
  }, 12_000)
  if (!res.ok) return null
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  const session = cookies.find(cookie => cookie.startsWith('pypc_session'))
  return session ? session.split(';')[0] : null
}

/** The edit an attacker with database access would make. */
async function tamperWithOneEntry() {
  process.env.DATABASE_URL = `file:${testDb}`
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  const rows = await prisma.auditLog.findMany({
    where: { hash: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, metadata: true, action: true }
  })

  if (rows.length === 0) {
    await prisma.$disconnect()
    return null
  }

  // Edit a middle row if the chain has more than one link; otherwise the only one.
  const target = rows[Math.floor(rows.length / 2)]
  await prisma.auditLog.update({
    where: { id: target.id },
    data: {
      metadata: JSON.stringify({ tampered: true, note: 'This edit was made by the audit-chain test.' })
    }
  })

  await prisma.$disconnect()
  return { id: target.id, action: target.action, total: rows.length }
}

// Never run against somebody else's server: a stray process on this port would
// make the test read the wrong database and report nonsense. So walk up from the
// preferred port until one is free — a reviewer should never be blocked by a
// forgotten dev server.
const preferred = PORT
while (await portInUse()) {
  PORT += 1
  if (PORT > preferred + 20) {
    console.error(
      `No free port between ${preferred} and ${PORT}. Stop the servers listening there and run again.`
    )
    rmSync(workDir, { recursive: true, force: true })
    process.exit(1)
  }
}
if (PORT !== preferred) {
  console.log(`port ${preferred} is busy — using ${PORT} instead`)
}

// `next start` runs as a grandchild of this npx wrapper, so the process group is
// what has to be signalled — killing the wrapper alone leaves an orphaned server
// holding the port (that is how earlier runs left :3900 busy).
const server = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
  cwd: projectRoot,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
})

function stopServer() {
  try {
    process.kill(-server.pid, 'SIGKILL')
  } catch {
    try {
      server.kill('SIGKILL')
    } catch {
      /* already gone */
    }
  }
}
// Safety net: however this script ends, the test server must not outlive it.
process.on('exit', stopServer)
process.on('SIGINT', () => {
  stopServer()
  process.exit(130)
})

let serverLog = ''
server.stdout.on('data', chunk => (serverLog += chunk.toString()))
server.stderr.on('data', chunk => (serverLog += chunk.toString()))

try {
  console.log(`\n== audit chain tamper test ==\n`)
  console.log(`copy      ${testDb}`)
  console.log(`server    ${base()}\n`)

  const up = await waitForServer()
  check('a second server starts against a copy of the database', up, up ? `${base()} answering` : 'timed out')
  if (!up) throw new Error('server did not start')

  const cookie = await signInAsAdmin()
  check('an administrator can sign in on the copy', Boolean(cookie))

  const first = await readAuditConsole(cookie)
  check('the audit console renders for an administrator', first.status === 200, `status ${first.status}`)
  check(
    'the console reports the chain as intact',
    /Chain verified/i.test(first.html),
    /Chain verified[^<]{0,60}/.exec(first.html)?.[0] ?? 'no verification banner'
  )
  check(
    'the page states what the chain means, not just that it passed',
    /cryptographically chained/i.test(first.html)
  )

  const tampered = await tamperWithOneEntry()
  check('an entry can be edited directly in the database (simulating tampering)', Boolean(tampered), tampered ? tampered.action : 'no hashed rows to edit')

  const second = await readAuditConsole(cookie)
  check(
    'the console now reports a broken chain',
    /Chain broken/i.test(second.html),
    /Chain broken[^<]{0,80}/.exec(second.html)?.[0] ?? 'no break reported'
  )
  check(
    'the break is attributed to the edited entry',
    tampered ? second.html.includes(tampered.id) : false,
    tampered ? `entry ${tampered.id}` : '—'
  )
  check(
    'the reason given names editing, deletion or re-ordering',
    /edited, deleted or re-ordered/i.test(second.html)
  )

  console.log(`\naudit chain: ${passed} passed, ${failed} failed`)
  if (failed) {
    console.log('Failures:')
    for (const name of failures) console.log(`  - ${name}`)
    console.log('\nserver log tail:\n' + serverLog.split('\n').slice(-12).join('\n'))
  }
} catch (error) {
  console.error('audit-chain test crashed:', error)
  console.log('\nserver log tail:\n' + serverLog.split('\n').slice(-20).join('\n'))
  failures.push('crashed')
  failed += 1
} finally {
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {
    server.kill('SIGTERM')
  }
  await new Promise(resolve => setTimeout(resolve, 600))
  stopServer()
  rmSync(workDir, { recursive: true, force: true })

  // Exit explicitly: the keep-alive HTTP sockets and the child process would
  // otherwise hold the event loop open for minutes after the work is done.
  process.exit(failed > 0 ? 1 : 0)
}
