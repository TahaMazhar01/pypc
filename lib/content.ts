import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Prisma as PrismaErrors } from '@prisma/client'
import { CONTENT_SCHEMAS, homepageSchema, type ContentEntity, type ContentValues, type EditorItem } from '@/lib/content-schema'
import { homepageDefaults } from '@/lib/homepage-defaults'

export async function publishedHomepage() {
  // Preserve the existing public homepage until the additive CMS migration is
  // installed. Other database errors still surface instead of hiding failures.
  const overrides = await prisma.homepageItem.findMany().catch(error => {
    if (error instanceof PrismaErrors.PrismaClientKnownRequestError && error.code === 'P2021') return []
    throw error
  })
  const items = new Map(homepageDefaults.map(({ id, ...value }) => [id, { id, ...homepageSchema.parse(value) }]))
  for (const row of overrides) {
    if (!row.isPublished) { items.delete(row.id); continue }
    const parsed = homepageSchema.safeParse(JSON.parse(row.data))
    if (parsed.success) items.set(row.id, { id: row.id, ...parsed.data })
  }
  return [...items.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}
export async function nativeItem(tx: Prisma.TransactionClient, entity: ContentEntity, id: string) {
  if (entity === 'event') return tx.event.findUnique({ where: { id } })
  if (entity === 'programme') return tx.programme.findUnique({ where: { id } })
  if (entity === 'opportunity') return tx.opportunity.findUnique({ where: { id } })
  return await tx.homepageItem.findUnique({ where: { id } }) ?? homepageDefaults.find(x => x.id === id) ?? null
}
export async function contentItems(entity: ContentEntity): Promise<EditorItem[]> {
  const drafts = await prisma.contentDraft.findMany({ where: { entity }, orderBy: { updatedAt: 'desc' } })
  const result = new Map<string, EditorItem>()
  if (entity === 'homepage') {
    for (const { id, ...value } of homepageDefaults) result.set(id, { id, version: 0, hasDraft: false, published: true, values: homepageSchema.parse(value) })
    for (const row of await prisma.homepageItem.findMany()) result.set(row.id, { id: row.id, version: 0, hasDraft: false, published: row.isPublished, values: JSON.parse(row.data) })
  } else {
    const rows = entity === 'event' ? await prisma.event.findMany({ orderBy: { startsAt: 'desc' } }) : entity === 'programme' ? await prisma.programme.findMany({ orderBy: { sortOrder: 'asc' } }) : await prisma.opportunity.findMany({ orderBy: { createdAt: 'desc' } })
    const keys = Object.keys(CONTENT_SCHEMAS[entity].shape)
    for (const row of rows) {
      const record = row as unknown as Record<string, unknown>
      const values = Object.fromEntries(keys.map(key => [key, record[key] instanceof Date ? (record[key] as Date).toISOString() : record[key]])) as ContentValues
      result.set(row.id, { id: row.id, version: 0, hasDraft: false, published: Boolean(record.isPublished ?? record.isActive), values })
    }
  }
  for (const item of result.values()) item.retained = true
  for (const row of drafts) result.set(row.targetId, { id: row.targetId, version: row.version, hasDraft: !row.publishedAt, published: result.get(row.targetId)?.published ?? false, retained: result.get(row.targetId)?.retained ?? false, values: JSON.parse(row.data) })
  return [...result.values()]
}
export function mediaIds(data: string): string[] {
  return [...data.matchAll(/\/api\/media\/([a-f0-9-]{36})/g)].map(m => m[1])
}
