import { NextResponse } from 'next/server'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { contentTypeFor, documentBelongsTo, readStoredDocument } from '@/lib/uploads'

/**
 * GET /api/uploads/resume/<storedName>
 * Serves a privately stored document. Access is limited to the owner and to
 * staff, so a leaked URL alone cannot expose someone's CV.
 */
export async function GET(_request: Request, { params }: { params: { file: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to view this document.' }, { status: 401 })
  }

  const storedName = decodeURIComponent(params.file)
  const allowed = documentBelongsTo(storedName, user.id) || isStaff(user.role)

  if (!allowed) {
    return NextResponse.json({ error: 'You do not have access to this document.' }, { status: 403 })
  }

  const document = await readStoredDocument(storedName)
  if (!document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  }

  return new NextResponse(document.bytes, {
    status: 200,
    headers: {
      'Content-Type': contentTypeFor(storedName),
      'Content-Disposition': `inline; filename="${storedName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
