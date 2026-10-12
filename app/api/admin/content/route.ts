import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiError, apiError, authorize, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
import { ENTITIES, RESOURCE, CONTENT_SCHEMAS, validateContent, type ContentEntity } from '@/lib/content-schema'
import { contentItems, nativeItem, mediaIds } from '@/lib/content'

const saveSchema = z.object({ entity: z.enum(ENTITIES), id: z.string().min(1).max(120).optional(), version: z.number().int().nonnegative(), data: z.unknown() }).strict()
const publishSchema = z.object({ entity: z.enum(ENTITIES), id: z.string().min(1).max(120), version: z.number().int().nonnegative(), action: z.enum(['publish','unpublish','discard','restore']) }).strict()
export async function GET(request: Request) {
  try {
    const parsed = z.enum(ENTITIES).safeParse(new URL(request.url).searchParams.get('entity'))
    if (!parsed.success) throw new ApiError(422, 'Select a content type.')
    await authorize(request, `${RESOURCE[parsed.data]}.read`)
    return NextResponse.json({ items: await contentItems(parsed.data) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
export async function POST(request: Request) {
  try {
    const body = saveSchema.safeParse(await readJson(request))
    if (!body.success) throw new ApiError(422, 'Provide a content type, draft version and content.')
    const { entity, id: suppliedId, version } = body.data
    const permission = `${RESOURCE[entity]}.write` as const
    const actor = await authorize(request, permission)
    let values
    try { values = validateContent(entity, body.data.data) }
    catch (error) { throw new ApiError(422, error instanceof z.ZodError ? error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ') : error instanceof Error ? error.message : 'Invalid content.') }
    const id = suppliedId ?? randomUUID()
    const draft = await transaction(async tx => {
      await assertActor(tx, actor, permission)
      const previous = await tx.contentDraft.findUnique({ where: { entity_targetId: { entity, targetId: id } } })
      if ((previous?.version ?? 0) !== version) throw new ApiError(409, 'This draft changed. Reload it before saving.')
      if (suppliedId && !previous && !(await nativeItem(tx, entity, id))) throw new ApiError(404, 'Content not found.')
      for (const mediaId of mediaIds(JSON.stringify(values))) {
        if (!(await tx.mediaAsset.findUnique({ where: { id: mediaId }, select: { id: true } }))) throw new ApiError(422, 'An image no longer exists.')
      }
      const data = { data: JSON.stringify(values), publishedAt: null, updatedById: actor.id }
      const result = previous
        ? await tx.contentDraft.update({ where: { id: previous.id }, data: { ...data, version: { increment: 1 } } })
        : await tx.contentDraft.create({ data: { ...data, id: entity + ':' + id, entity, targetId: id } })
      await auditMutation(tx, actor, request, 'CONTENT_DRAFT_SAVED', entity, id, { version: result.version })
      return result
    })
    return NextResponse.json({ ok: true, id, version: draft.version }, { status: suppliedId ? 200 : 201 })
  } catch (error) { return apiError(error) }
}
export async function PATCH(request: Request) {
  try {
    const parsed = publishSchema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(422, 'Provide a content revision and publish, unpublish or discard action.')
    const { entity, id, version, action } = parsed.data
    const permission = `${RESOURCE[entity]}.${action === 'discard' ? 'write' : 'publish'}` as const
    const actor = await authorize(request, permission)
    await transaction(async tx => {
      await assertActor(tx, actor, permission)
      const draft = await tx.contentDraft.findUnique({ where: { entity_targetId: { entity, targetId: id } } })
      if ((draft?.version ?? 0) !== version) throw new ApiError(409, 'This draft changed. Reload it before publishing.')
      const existing = await nativeItem(tx, entity, id)
      if (!draft && !existing) throw new ApiError(404, 'Content not found.')
      if (action === 'discard') {
        if (draft) await tx.contentDraft.delete({ where: { id: draft.id } })
      } else if (action === 'unpublish' || action === 'restore') {
        if (!existing) throw new ApiError(409, 'This item has not been published.')
        const visible = action === 'restore'
        if (entity === 'homepage') {
          const original = 'data' in existing ? String(existing.data) : JSON.stringify(CONTENT_SCHEMAS.homepage.parse(Object.fromEntries(Object.entries(existing).filter(([key]) => key !== 'id'))))
          if (visible) for (const mediaId of mediaIds(original)) if (!(await tx.mediaAsset.findUnique({ where: { id: mediaId }, select: { id: true } }))) throw new ApiError(422, 'An image no longer exists.')
          await tx.homepageItem.upsert({ where: { id }, create: { id, data: original, isPublished: visible }, update: { isPublished: visible } })
        } else if (entity === 'event') await tx.event.update({ where: { id }, data: { isPublished: visible } })
        else if (entity === 'programme') await tx.programme.update({ where: { id }, data: { isActive: visible } })
        else await tx.opportunity.update({ where: { id }, data: { isActive: visible } })
        if (draft) await tx.contentDraft.update({ where: { id: draft.id }, data: { version: { increment: 1 } } })
      } else {
        if (!draft) throw new ApiError(409, 'Save a draft before publishing.')
        const raw = JSON.parse(draft.data)
        validateContent(entity, raw)
        for (const mediaId of mediaIds(draft.data)) if (!(await tx.mediaAsset.findUnique({ where: { id: mediaId }, select: { id: true } }))) throw new ApiError(422, 'An image no longer exists.')
        if (entity === 'homepage') await tx.homepageItem.upsert({ where: { id }, create: { id, data: draft.data, isPublished: true }, update: { data: draft.data, isPublished: true } })
        else if (entity === 'event') {
          const data = { ...CONTENT_SCHEMAS.event.parse(raw), isPublished: true }
          await tx.event.upsert({ where: { id }, create: { id, ...data }, update: data })
        } else if (entity === 'programme') {
          const data = { ...CONTENT_SCHEMAS.programme.parse(raw), isActive: true }
          await tx.programme.upsert({ where: { id }, create: { id, ...data }, update: data })
        } else {
          const data = { ...CONTENT_SCHEMAS.opportunity.parse(raw), isActive: true }
          await tx.opportunity.upsert({ where: { id }, create: { id, ...data }, update: data })
        }
        await tx.contentDraft.update({ where: { id: draft.id }, data: { version: { increment: 1 }, publishedAt: new Date() } })
      }
      await auditMutation(tx, actor, request, 'CONTENT_' + action.toUpperCase(), entity, id, { version })
    })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
