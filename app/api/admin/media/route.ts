import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, apiError, authorize, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
import { mediaIds } from '@/lib/content'
const MAX_UPLOAD = 4 * 1024 * 1024
const publicSelect = { id: true, alt: true, mimeType: true, bytes: true, width: true, height: true, createdAt: true } as const
export async function GET(request: Request) {
  try { await authorize(request, 'media.read'); return NextResponse.json({ media: await prisma.mediaAsset.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' }, take: 200 }) }) }
  catch (error) { return apiError(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await authorize(request, 'media.upload')
    let alt = ''
    try { alt = decodeURIComponent(request.headers.get('x-image-alt') ?? '').trim() } catch { throw new ApiError(422, 'Invalid image description.') }
    if (alt.length < 3 || alt.length > 300) throw new ApiError(422, 'Supply descriptive image text (3–300 characters).')
    const mime = request.headers.get('content-type')?.split(';')[0]
    if (!['image/jpeg','image/png','image/webp'].includes(mime ?? '')) throw new ApiError(415, 'Only JPEG, PNG and WebP images are accepted.')
    const reader = request.body?.getReader()
    if (!reader) throw new ApiError(422, 'Image required.')
    let size = 0; const parts: Uint8Array[] = []
    while (true) {
      const { value, done } = await reader.read(); if (done) break
      size += value.length
      if (size > MAX_UPLOAD) { await reader.cancel(); throw new ApiError(413, 'Images must be 4 MB or smaller.') }
      parts.push(value)
    }
    let data: Buffer; let width: number; let height: number
    try {
      const bytes = Buffer.concat(parts)
      const input = sharp(bytes, { limitInputPixels: 25000000, animated: false, failOn: 'warning' })
      const metadata = await input.metadata()
      const expected = mime === 'image/jpeg' ? 'jpeg' : mime === 'image/png' ? 'png' : 'webp'
      if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error('Invalid format')
      const encoded = await input.rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true })
      data = encoded.data; width = encoded.info.width; height = encoded.info.height
    } catch { throw new ApiError(422, 'The file is not a valid supported raster image.') }
    const id = randomUUID()
    const media = await transaction(async tx => {
      await assertActor(tx, actor, 'media.upload')
      const result = await tx.mediaAsset.create({ data: { id, data, alt, width, height, bytes: data.length, mimeType: 'image/webp', createdById: actor.id }, select: publicSelect })
      await auditMutation(tx, actor, request, 'MEDIA_UPLOADED', 'MediaAsset', id, { bytes: data.length, width, height })
      return result
    })
    return NextResponse.json({ ok: true, media, url: '/api/media/' + id }, { status: 201 })
  } catch (error) { return apiError(error) }
}
export async function DELETE(request: Request) {
  try {
    const actor = await authorize(request, 'media.delete')
    const body = z.object({ id: z.string().uuid() }).strict().safeParse(await readJson(request))
    if (!body.success) throw new ApiError(422, 'Select an image.')
    await transaction(async tx => {
      await assertActor(tx, actor, 'media.delete')
      const records = [...await tx.homepageItem.findMany({ select: { data: true } }), ...await tx.contentDraft.findMany({ select: { data: true } })]
      if (records.some(x => mediaIds(x.data).includes(body.data.id))) throw new ApiError(409, 'This image is referenced by content. Replace it there before deleting.')
      await tx.mediaAsset.delete({ where: { id: body.data.id } })
      await auditMutation(tx, actor, request, 'MEDIA_DELETED', 'MediaAsset', body.data.id)
    })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
export async function PATCH(request: Request) {
  try {
    const actor = await authorize(request, 'media.upload')
    const parsed = z.object({ id: z.string().uuid(), alt: z.string().trim().min(3).max(300), expectedAlt: z.string().max(300) }).strict().safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(422, 'Provide an image and a description of 3–300 characters.')
    const media = await transaction(async tx => {
      await assertActor(tx, actor, 'media.upload')
      const current = await tx.mediaAsset.findUnique({ where: { id: parsed.data.id }, select: { alt: true } })
      if (!current) throw new ApiError(404, 'Image not found.')
      if (current.alt !== parsed.data.expectedAlt) throw new ApiError(409, 'This image description changed. Refresh before saving.')
      const updated = await tx.mediaAsset.update({ where: { id: parsed.data.id }, data: { alt: parsed.data.alt }, select: publicSelect })
      await auditMutation(tx, actor, request, 'MEDIA_DESCRIPTION_UPDATED', 'MediaAsset', parsed.data.id)
      return updated
    })
    return NextResponse.json({ ok: true, media })
  } catch (error) { return apiError(error) }
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
