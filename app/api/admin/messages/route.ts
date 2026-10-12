import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiError, apiError, authorize, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
const schema = z.object({ id: z.string().min(1).max(100), status: z.enum(['NEW','IN_PROGRESS','RESOLVED','ARCHIVED']) }).strict()
export async function PATCH(request: Request) {
  try {
    const actor = await authorize(request, 'messages.manage')
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(422, 'Select a message and valid status.')
    await transaction(async tx => {
      await assertActor(tx, actor, 'messages.manage')
      const existing = await tx.contactMessage.findUnique({ where: { id: parsed.data.id }, select: { status: true } })
      if (!existing) throw new ApiError(404, 'Message not found.')
      await tx.contactMessage.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } })
      await auditMutation(tx, actor, request, 'MESSAGE_STATUS_UPDATED', 'ContactMessage', parsed.data.id, { beforeStatus: existing.status, status: parsed.data.status })
    })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
export const runtime = 'nodejs'
