import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_HINT,
  storeDocument
} from '@/lib/uploads'

/**
 * POST /api/uploads/resume
 * Accepts a multipart form with a `file` field, validates the real file
 * signature and stores it privately. Returns the authenticated URL to store on
 * the application, profile or visa-letter request.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in before uploading a document.' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: `No file received. ${UPLOAD_HINT}` }, { status: 422 })
  }

  try {
    const stored = await storeDocument(file, user.id)

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Upload',
      entityId: stored.storedName,
      metadata: { size: stored.size, mime: stored.mime, originalName: stored.originalName },
      request
    })

    return NextResponse.json({
      ok: true,
      url: stored.url,
      originalName: stored.originalName,
      size: stored.size,
      maxBytes: MAX_UPLOAD_BYTES,
      accepted: Object.values(ALLOWED_UPLOAD_TYPES).map(item => item.label)
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'The document could not be stored. Please try again.'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
