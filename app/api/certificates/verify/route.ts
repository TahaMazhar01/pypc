import { NextResponse } from 'next/server'
import { verifyCertificate } from '@/lib/certificates'
import { recordAudit } from '@/lib/audit'

/** GET /api/certificates/verify?code=PYPC-XXXX-XXXX-XXXX */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code') ?? ''

  if (!code) {
    return NextResponse.json({ found: false, error: 'Provide a certificate code.' }, { status: 400 })
  }

  const result = await verifyCertificate(code)

  await recordAudit({
    action: 'CERTIFICATE_VERIFICATION_LOOKUP',
    entityType: 'Certificate',
    metadata: { code: result.code, found: result.found },
    request
  })

  return NextResponse.json(result)
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
