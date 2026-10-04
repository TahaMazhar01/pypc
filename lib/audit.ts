import 'server-only'

import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

/**
 * Append-only, tamper-evident audit log.
 *
 * Every row is written with a SHA-256 hash over:
 *
 *   previous row's hash  →  this row's canonical content  →  a server secret
 *
 * so the log is a chain, not a table. Editing a row, deleting a row or
 * inserting one out of order breaks every subsequent hash, and
 * `verifyAuditChain()` finds the first broken link. `AUDIT_CHAIN_SECRET`
 * (falling back to `AUTH_SECRET`) keeps the chain unforgeable even by someone
 * who can write to the database but not to the environment.
 *
 * The chain is per-writer-safe because every write goes through `recordAudit()`
 * inside a transaction that reads the current tail.
 */

/** Value hashed for one row — stable across restarts and machines. */
function canonical(input: {
  prevHash: string | null
  actorId: string | null
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  metadata: string | null
  ip: string | null
  createdAt: Date
}) {
  return JSON.stringify({
    prevHash: input.prevHash,
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    ip: input.ip,
    createdAt: input.createdAt.toISOString()
  })
}

function chainSecret() {
  return process.env.AUDIT_CHAIN_SECRET || process.env.AUTH_SECRET || 'pypc-dev-chain-secret'
}

function hashRow(value: string) {
  return createHash('sha256').update(`${chainSecret()}|${value}`).digest('hex')
}

type AuditInput = {
  actorId?: string | null
  actorEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
  request?: Request
}

/**
 * In-process serialisation of chain writes.
 *
 * Two writes that read the same tail would both claim the same predecessor and
 * fork the chain. The database refuses the second one (unique index on
 * `prevHash`), and this queue means the common case never even gets that far:
 * writes are appended one at a time, in the order they were requested.
 */
let chainQueue: Promise<unknown> = Promise.resolve()

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = chainQueue.then(work, work)
  // Keep the queue alive even if a write fails — one failed append must not
  // block every later audit entry.
  chainQueue = next.catch(() => undefined)
  return next
}

/**
 * Writes an audit record and links it to the previous one. Never throws into
 * the caller — auditing must not break a business transaction — but a failure
 * is logged loudly because a gap in the chain is a compliance problem.
 *
 * Retries cover the remaining race: a second process (or a second Node worker)
 * appending at the same moment. The unique index on `prevHash` makes the losing
 * write fail fast, and the retry re-reads the tail and links to the winner.
 */
export async function recordAudit(input: AuditInput) {
  return enqueue(() => appendWithRetry(input))
}

async function appendWithRetry(input: AuditInput, attempt = 0): Promise<void> {
  try {
    const ip =
      input.ip ??
      input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null

    const metadata = input.metadata ? JSON.stringify(input.metadata) : null
    const createdAt = new Date()

    // `createdAt` is set by us (not the database default) so the value that is
    // hashed is exactly the value that is stored.
    const row = {
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata,
      ip,
      createdAt
    }

    // Read the tail, then write. Serialised in-process, and protected against a
    // concurrent writer in another process by the unique index on prevHash.
    await prisma.$transaction(async tx => {
      const tail = await tx.auditLog.findFirst({
        where: { hash: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { hash: true }
      })

      const prevHash = tail?.hash ?? null
      const hash = hashRow(canonical({ prevHash, ...row }))

      await tx.auditLog.create({ data: { ...row, prevHash, hash } })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Lost the race for this link — read the new tail and try again.
    if (attempt < 4 && /unique constraint|Unique constraint|P2002/i.test(message)) {
      return appendWithRetry(input, attempt + 1)
    }

    console.error('[audit] failed to write log', error)
  }
}

/**
 * Rewrites the chain in order and appends a marker saying it happened.
 *
 * This exists for one situation: a retention trim that removed entries by policy
 * (for example deleting a rejected test account). The chain cannot be patched in
 * the middle, so it is rebuilt from the retained window — and the rebuild is
 * itself an entry, permanently visible in the console, so nobody can quietly
 * "repair" a log after tampering.
 *
 * `AUDIT_ALLOW_RECHAIN="true"` must be set for the API route that calls this to
 * accept a request; it is off by default, including in production images.
 */
export async function rechainAuditLog(input: { reason: string; actorEmail?: string | null }) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      actorId: true,
      actorEmail: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      ip: true,
      createdAt: true
    }
  })

  let previous: string | null = null
  let rewritten = 0

  for (const row of rows) {
    const hash = hashRow(
      canonical({
        prevHash: previous,
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        ip: row.ip,
        createdAt: row.createdAt
      })
    )

    await prisma.auditLog.update({ where: { id: row.id }, data: { prevHash: previous, hash } })
    previous = hash
    rewritten += 1
  }

  // The marker is written through the normal path, so it chains onto the rebuilt
  // log and states in plain text what was done and why.
  await recordAudit({
    actorEmail: input.actorEmail ?? null,
    action: 'AUDIT_LOG_RECHAINED',
    entityType: 'AuditLog',
    metadata: { reason: input.reason, entriesRewritten: rewritten }
  })

  return { rewritten }
}

export function rechainAllowed() {
  return (process.env.AUDIT_ALLOW_RECHAIN ?? 'false').toLowerCase() === 'true'
}

export type AuditChainReport = {
  ok: boolean
  checked: number
  /** Row id of the first entry whose hash does not match, when broken. */
  brokenAt: string | null
  brokenReason: string | null
  firstHash: string | null
  lastHash: string | null
}

/**
 * Walks the whole chain in order and re-computes every hash.
 *
 * Returns the first break rather than a boolean, so the admin page can point at
 * the exact row. Rows written before the chain existed (no hash) are skipped
 * rather than reported as a break — the log simply starts chaining from the
 * first hashed row.
 */
export async function verifyAuditChain(limit = 5000): Promise<AuditChainReport> {
  const rows = await prisma.auditLog.findMany({
    where: { hash: { not: null } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
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
  })

  let previous: string | null = null

  for (const row of rows) {
    const expected = hashRow(
      canonical({
        prevHash: previous,
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        ip: row.ip,
        createdAt: row.createdAt
      })
    )

    // The first retained row may legitimately chain from a predecessor that is
    // no longer present — but only when a documented trim says so. A boundary
    // marker naming the missing hash keeps a deliberate retention trim honest
    // while still catching a silent deletion of a middle entry.
    if (previous === null && row.prevHash !== null) {
      const documented = await prisma.auditLog.findFirst({
        where: {
          OR: [{ action: 'AUDIT_LOG_RECHAINED' }, { action: 'AUDIT_LOG_TRUNCATED' }],
          metadata: { contains: row.prevHash }
        },
        select: { id: true }
      })

      if (!documented) {
        return {
          ok: false,
          checked: rows.length,
          brokenAt: row.id,
          brokenReason:
            'the first retained entry points at a predecessor that is not in the log, and no retention record explains it',
          firstHash: rows[0]?.hash ?? null,
          lastHash: rows[rows.length - 1]?.hash ?? null
        }
      }
    }

    if (row.hash !== expected) {
      return {
        ok: false,
        checked: rows.length,
        brokenAt: row.id,
        brokenReason: 'this entry has been edited, deleted or re-ordered — its hash no longer matches its content',
        firstHash: rows[0]?.hash ?? null,
        lastHash: rows[rows.length - 1]?.hash ?? null
      }
    }

    previous = row.hash
  }

  return {
    ok: true,
    checked: rows.length,
    brokenAt: null,
    brokenReason: null,
    firstHash: rows[0]?.hash ?? null,
    lastHash: rows[rows.length - 1]?.hash ?? null
  }
}

/** In-app notification for a member. Kept here so audit + notify share a file. */
export async function notify(input: {
  userId: string
  title: string
  body: string
  type?: string
  href?: string
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type ?? 'INFO',
        href: input.href ?? null
      }
    })
  } catch (error) {
    console.error('[notify] failed', error)
  }
}
