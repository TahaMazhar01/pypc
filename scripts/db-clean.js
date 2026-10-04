/**
 * Removes test residue from the database, so what ships is exactly the seeded
 * content plus whatever real visitors have created.
 *
 * The suites in `scripts/` create accounts, orders, notifications, outbox rows and
 * audit entries while they run, and each of them cleans up after itself — but an
 * interrupted run, a manual probe or a crashed server can leave rows behind. This
 * script is the safety net: it keeps the three seeded accounts and their content,
 * and deletes everything that is recognisably test data.
 *
 *   node scripts/db-clean.js                     # report and delete
 *   node scripts/db-clean.js --dry-run           # report only
 *   node scripts/db-clean.js --trim-audit        # also clear legacy (unchained) audit rows
 *   node scripts/db-clean.js --trim-anonymous-ai # also clear anonymous AI conversations
 *   node scripts/db-clean.js --reset-chain       # also remove test-run audit rows and rebuild the chain
 *
 * For packaging, `npm run db:clean:ship` runs both trims — that is the state the
 * database ships in.
 *
 * By default the audit log is left alone (it is the system's own history).
 * `--trim-audit` removes only *legacy* rows written before the hash chain
 * existed: from round 7 the log is a SHA-256 chain (see lib/audit.ts), and
 * deleting a chained row would break every hash after it — destroying the
 * tamper-evidence the log exists to provide. Chained rows are therefore always
 * kept, which is why the shipped database can still pass `check:audit-chain`.
 *
 * Test data is recognised by the address patterns the suites use (pay.*, dbg.*,
 * check.*, test.*, *.example.com) plus any account that is neither a seeded
 * account nor referenced by real content. Rate-limit counters are always cleared:
 * they are per-window buckets and must not carry over into a live deployment.
 */
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.resolve(__dirname, '..', 'prisma', 'dev.db')}`

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry-run')
/**
 * Packaging mode. Removing a test account is not enough on its own: the suites
 * leave audit entries naming those throwaway addresses, and a hand-over database
 * should not read like a test log. Those rows are links in the hash chain, so
 * they can only be removed by rebuilding the chain afterwards — which is what
 * `--reset-chain` does, leaving an AUDIT_LOG_RECHAINED marker that says so.
 */
const RESET_CHAIN = process.argv.includes('--reset-chain')

/** The accounts the seed creates; everything else is judged on its own merits. */
const SEEDED_EMAILS = ['admin@pypc.org.pk', 'executive@pypc.org.pk', 'member@example.com']

/** Patterns the automated suites use for throwaway accounts. */
/**
 * Markers the suites leave in *content* (not addresses). Narrow on purpose: a
 * real enquiry must never be deleted, so these match the fixed wording the
 * audit-chain and human-check tests use.
 */
const TEST_CONTENT_MARKERS = [
  /auditable record/i,
  /chain test/i,
  /human[- ]check test/i
]

/** Names the suites give their throwaway accounts. */
const TEST_NAME_PATTERNS = [/\b(tester|test|probe|chain test|debug)\b/i]

const TEST_PATTERNS = [
  /^pay\./i, // payment chain suite
  /^dbg\./i, // ad-hoc debugging
  /^check\./i,
  /^test\./i,
  /^probe\./i,
  /^news\./i, // newsletter double opt-in suite
  /^burst/i, // registration rate-limit burst (burstnpn5v50@gmail.com — no dot)
  /^sec\./i,
  /@example\.com$/i
]

/**
 * The suites create their accounts with a recognisable first name ("Theme
 * Tester", "Payment Tester", "Connectivity Tester"). Names like these are not
 * addresses a real member would have, so they are treated as test data even when
 * the e-mail address itself looks ordinary.
 */
const TEST_FIRST_NAMES = ['theme', 'payment', 'connectivity', 'registration', 'security', 'probe', 'debug', 'test', 'check']

const isTestAccount = (email, firstName = '') =>
  !SEEDED_EMAILS.includes(email.toLowerCase()) &&
  (TEST_PATTERNS.some(re => re.test(email)) || TEST_FIRST_NAMES.includes(firstName.toLowerCase()))

/**
 * Addresses the patterns cannot recognise (a probe account that was created by
 * hand, for instance) can be named explicitly:
 *
 *   node scripts/db-clean.js --remove=someone@example.com,other@example.com
 */
const EXTRA = (process.argv.find(arg => arg.startsWith('--remove=')) || '')
  .replace('--remove=', '')
  .split(',')
  .map(value => value.trim().toLowerCase())
  .filter(Boolean)

const trimAudit = process.argv.includes('--trim-audit')

/**
 * Anonymous AI conversations (userId = null) are legitimate while the site is
 * live — the public assistant can be used without an account. For a hand-over
 * database they are residue from verification runs, so `--trim-anonymous-ai`
 * removes them.
 */
const trimAnonymousAi = process.argv.includes('--trim-anonymous-ai')

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, firstName: true } })

  const doomed = users.filter(
    user => isTestAccount(user.email, user.firstName) || EXTRA.includes(user.email.toLowerCase())
  )

  console.log(`\nDatabase cleanup${DRY ? ' (dry run — nothing will be deleted)' : ''}`)
  console.log('─'.repeat(68))
  console.log(`accounts inspected : ${users.length}`)
  console.log(`kept               : ${users.length - doomed.length} (seeded + real accounts)`)
  console.log(`test accounts      : ${doomed.length}${
    doomed.length ? ` → ${doomed.map(u => u.email).join(', ')}` : ''
  }`)

  if (doomed.length && !DRY) {
    const ids = doomed.map(u => u.id)
    const emails = doomed.map(u => u.email)

    // Order matters: dependents first, then the account itself.
    const removed = {}
    removed.memberships = (await prisma.membership.deleteMany({ where: { userId: { in: ids } } })).count
    removed.orders = (await prisma.order.deleteMany({ where: { userId: { in: ids } } })).count
    removed.applications = (await prisma.application.deleteMany({ where: { userId: { in: ids } } })).count
    removed.notifications = (await prisma.notification.deleteMany({ where: { userId: { in: ids } } })).count
    removed.certificates = (await prisma.certificate.deleteMany({ where: { userId: { in: ids } } })).count
    removed.visaLetters = (await prisma.visaLetterRequest.deleteMany({ where: { userId: { in: ids } } })).count
    removed.registrations = (await prisma.eventRegistration.deleteMany({ where: { userId: { in: ids } } })).count

    // AiMessage hangs off AiConversation, not off User directly.
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: { in: ids } },
      select: { id: true }
    })
    const conversationIds = conversations.map(c => c.id)
    removed.aiMessages = conversationIds.length
      ? (await prisma.aiMessage.deleteMany({ where: { conversationId: { in: conversationIds } } })).count
      : 0
    removed.aiConversations = conversationIds.length
      ? (await prisma.aiConversation.deleteMany({ where: { id: { in: conversationIds } } })).count
      : 0
    removed.tokens = (await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: ids } } })).count
    removed.outbox = (await prisma.emailOutbox.deleteMany({ where: { to: { in: emails } } })).count
    // Round 7: only legacy (pre-chain) rows may be deleted. A chained row is a
    // link in the tamper-evident log — removing one would break every hash that
    // follows it, which is exactly the property the log exists to provide.
    if (RESET_CHAIN) {
      // Packaging: the whole test trail goes, and the chain is rebuilt below.
      removed.audits = (
        await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } })
      ).count
      removed.auditsKept = 0
    } else {
      removed.audits = (
        await prisma.auditLog.deleteMany({ where: { actorId: { in: ids }, hash: null } })
      ).count
      removed.auditsKept = await prisma.auditLog.count({
        where: { actorId: { in: ids }, hash: { not: null } }
      })
    }
    removed.users = (await prisma.user.deleteMany({ where: { id: { in: ids } } })).count

    console.log('\nremoved')
    for (const [table, count] of Object.entries(removed)) {
      if (count) console.log(`  ${table.padEnd(16)} ${count}`)
    }
  }

  // Verification e-mails addressed to throwaway accounts are residue too.
  const outboxResidue = await prisma.emailOutbox.findMany({ select: { id: true, to: true } })
  const staleOutbox = outboxResidue.filter(row => isTestAccount(row.to))
  if (staleOutbox.length && !DRY) {
    await prisma.emailOutbox.deleteMany({ where: { id: { in: staleOutbox.map(r => r.id) } } })
  }
  if (staleOutbox.length) {
    console.log(`\nverification e-mails to test addresses removed : ${staleOutbox.length}`)
  }

  if (trimAnonymousAi) {
    const anonymous = await prisma.aiConversation.findMany({
      where: { userId: null },
      select: { id: true }
    })
    if (anonymous.length && !DRY) {
      const ids = anonymous.map(c => c.id)
      await prisma.aiMessage.deleteMany({ where: { conversationId: { in: ids } } })
      await prisma.aiConversation.deleteMany({ where: { id: { in: ids } } })
    }
    console.log(`\nanonymous AI conversations cleared (--trim-anonymous-ai) : ${anonymous.length}`)
  }

  if (trimAudit) {
    // ── Round 7: the audit log is a hash chain, so it cannot be trimmed in the
    // middle without breaking the very property it exists to provide. Deleting
    // only unhashed (pre-chain, legacy) rows keeps the chain verifiable; every
    // hashed entry is retained, and it is tiny — a few dozen rows.
    const legacy = await prisma.auditLog.count({ where: { hash: null } })
    const chained = await prisma.auditLog.count({ where: { hash: { not: null } } })

    if (DRY) {
      console.log(`\nlegacy audit rows that would be cleared : ${legacy}`)
      console.log(`chained audit rows kept (cannot be trimmed without breaking the chain) : ${chained}`)
    } else {
      const removedLegacy = (await prisma.auditLog.deleteMany({ where: { hash: null } })).count
      // Rows created by the verification suites themselves are removed with the
      // test accounts above; anything left is the hand-over history.
      console.log(`\nlegacy audit rows cleared (--trim-audit) : ${removedLegacy}`)
      console.log(`chain rebuild requested (--reset-chain)  : ${RESET_CHAIN ? 'yes' : 'no'}`)
      console.log(`chained audit rows kept intact          : ${chained}`)
    }
  }

  // ── Hand-over only: content and audit rows left by test runs ───────────────
  // Two rules, both narrow. A *contact message* goes only when it is recognisably
  // synthetic (a test address, a suite's account name, or the fixed wording the
  // suites send). An *audit row* goes only when it names an address that is not a
  // seeded account and that no surviving record references anywhere — i.e. the
  // account or enquiry it describes is gone, so the row is orphaned residue.
  // Genuine visitor enquiries are therefore never removed, with or without an
  // account. Both deletions happen before the chain rebuild below.
  if (RESET_CHAIN && !DRY) {
    const messages = await prisma.contactMessage.findMany({
      select: { id: true, email: true, name: true, subject: true, message: true }
    })
    const doomedMessages = messages.filter(m => {
      const address = (m.email || '').toLowerCase()
      const content = `${m.name || ''} ${m.subject || ''} ${m.message || ''}`
      return (
        isTestAccount(address) ||
        TEST_NAME_PATTERNS.some(re => re.test(m.name || '')) ||
        TEST_CONTENT_MARKERS.some(re => re.test(content))
      )
    })
    if (doomedMessages.length) {
      await prisma.contactMessage.deleteMany({ where: { id: { in: doomedMessages.map(m => m.id) } } })
      console.log(`\nsynthetic contact messages removed : ${doomedMessages.length}`)
    }
  }

  if (RESET_CHAIN && !DRY) {
    // Verification and confirmation mails addressed to an address that has since
    // disappeared (no account, no subscriber) are dead letters: nothing will ever
    // read them, and they are the last thing that would otherwise keep a
    // throwaway address "referenced". Seeded addresses are always kept.
    const accounts = new Set(
      (await prisma.user.findMany({ select: { email: true } })).map(u => u.email.toLowerCase())
    )
    const subscribers = new Set(
      (await prisma.newsletterSubscriber.findMany({ select: { email: true } })).map(s =>
        s.email.toLowerCase()
      )
    )
    const outboxRows = await prisma.emailOutbox.findMany({ select: { id: true, to: true } })
    const deadLetters = outboxRows.filter(row => {
      const address = (row.to || '').toLowerCase()
      return (
        !accounts.has(address) &&
        !subscribers.has(address) &&
        !SEEDED_EMAILS.map(e => e.toLowerCase()).includes(address)
      )
    })
    if (deadLetters.length) {
      await prisma.emailOutbox.deleteMany({ where: { id: { in: deadLetters.map(r => r.id) } } })
      console.log(`\ndead-letter outbox rows removed : ${deadLetters.length}`)
    }
  }

  if (RESET_CHAIN) {
    // Every address that still exists somewhere in the system.
    const live = new Set(SEEDED_EMAILS.map(e => e.toLowerCase()))
    const collect = async (rows, key) => rows.forEach(r => r[key] && live.add(String(r[key]).toLowerCase()))
    await collect(await prisma.user.findMany({ select: { email: true } }), 'email')
    await collect(await prisma.contactMessage.findMany({ select: { email: true } }), 'email')
    await collect(await prisma.newsletterSubscriber.findMany({ select: { email: true } }), 'email')
    await collect(await prisma.emailOutbox.findMany({ select: { to: true } }), 'to')

    const named = await prisma.auditLog.findMany({
      where: { actorEmail: { not: null } },
      select: { actorEmail: true },
      distinct: ['actorEmail']
    })
    const orphans = named
      .map(r => r.actorEmail)
      .filter(Boolean)
      .filter(email => !live.has(String(email).toLowerCase()))

    if (DRY) {
      const wouldGo = await prisma.auditLog.count({
        where: { actorEmail: { in: orphans } }
      })
      console.log(`\norphaned audit rows that would be removed : ${wouldGo}`)
    } else if (orphans.length) {
      const removedOrphans = (
        await prisma.auditLog.deleteMany({ where: { actorEmail: { in: orphans } } })
      ).count
      console.log(`\norphaned audit rows removed (account or enquiry gone) : ${removedOrphans}`)
      console.log(`  addresses : ${orphans.slice(0, 8).join(', ')}${orphans.length > 8 ? ', …' : ''}`)
    } else {
      console.log('\nno orphaned audit rows to remove — the log names live accounts only')
    }
  }

  const counters = DRY ? await prisma.rateLimitCounter.count() : (await prisma.rateLimitCounter.deleteMany({})).count
  if (counters) console.log(`\nrate-limit buckets cleared : ${counters}`)

  if (RESET_CHAIN && !DRY) {
    console.log('\n== rebuilding the audit hash chain ==\n')
    const { execFileSync } = require('node:child_process')
    try {
      const output = execFileSync(
        process.execPath,
        [
          path.resolve(__dirname, 'audit-rechain-local.mjs'),
          '--reason',
          'packaged database: throwaway test accounts and their audit trail were removed before hand-over; chain rebuilt'
        ],
        { encoding: 'utf8' }
      )
      console.log(output.trim())
    } catch (error) {
      console.error(error.stdout || error.message)
      console.error('\nThe chain could not be rebuilt — do not ship this database.')
      await prisma.$disconnect()
      process.exit(1)
    }
  }

  // Sanity report on what remains.
  const remaining = {
    users: await prisma.user.count(),
    plans: await prisma.membershipPlan.count(),
    programmes: await prisma.programme.count(),
    events: await prisma.event.count(),
    opportunities: await prisma.opportunity.count(),
    certificates: await prisma.certificate.count()
  }
  console.log('\nremaining content')
  for (const [table, count] of Object.entries(remaining)) console.log(`  ${table.padEnd(16)} ${count}`)

  const residue = await prisma.user.findMany({ select: { email: true, firstName: true } })
  const unexpected = residue.filter(u => isTestAccount(u.email, u.firstName))
  console.log(
    unexpected.length
      ? `\n⚠ test accounts remain: ${unexpected.map(u => u.email).join(', ')}\n`
      : '\nClean — the database holds seeded content and real data only.\n'
  )

  await prisma.$disconnect()
  process.exit(unexpected.length ? 1 : 0)
}

main().catch(async error => {
  console.error('cleanup failed:', error)
  await prisma.$disconnect().catch(() => {})
  process.exit(2)
})
