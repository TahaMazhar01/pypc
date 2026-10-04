import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJazzCashHash } from '@/lib/payments/jazzcash'
import { fulfilOrder, markOrderFailed } from '@/lib/orders'
import { recordAudit } from '@/lib/audit'

/**
 * JazzCash return URL handler.
 *
 * JazzCash posts the transaction result back as form-encoded fields. We:
 *  1. Re-compute pp_SecureHash with the integrity salt and compare.
 *  2. Read pp_ResponseCode (000 = success) and pp_BillReference (our order ref).
 *  3. Activate the membership only after the signature and code both pass.
 */
export async function POST(request: Request) {
  const form = await request.formData()
  const payload: Record<string, string> = {}
  form.forEach((value, key) => {
    payload[key] = String(value)
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const reference = payload.pp_BillReference
  const responseCode = payload.pp_ResponseCode
  const signatureValid = verifyJazzCashHash(payload)

  await recordAudit({
    action: 'JAZZCASH_CALLBACK',
    entityType: 'Order',
    metadata: { reference, responseCode, signatureValid },
    request
  })

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/membership/checkout?error=missing_reference`, { status: 303 })
  }

  const order = await prisma.order.findUnique({ where: { reference } })
  if (!order) {
    return NextResponse.redirect(`${appUrl}/membership/checkout?error=unknown_order`, { status: 303 })
  }

  if (!signatureValid) {
    await markOrderFailed(reference, 'JazzCash secure hash mismatch')
    return NextResponse.redirect(`${appUrl}/membership/checkout?error=invalid_signature`, { status: 303 })
  }

  if (responseCode !== '000') {
    await markOrderFailed(reference, `JazzCash response code ${responseCode}`)
    return NextResponse.redirect(
      `${appUrl}/membership/checkout?error=payment_failed&reference=${reference}`,
      { status: 303 }
    )
  }

  await fulfilOrder({
    reference,
    providerRef: payload.pp_TxnRefNo ?? null,
    payload
  })

  return NextResponse.redirect(`${appUrl}/membership/success?reference=${reference}`, { status: 303 })
}

/**
 * Some JazzCash configurations return the user with GET instead of POST.
 * We handle both rather than silently failing.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const reference = url.searchParams.get('pp_BillReference') ?? url.searchParams.get('reference')

  const payload: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    payload[key] = value
  })

  if (!reference || !verifyJazzCashHash(payload) || payload.pp_ResponseCode !== '000') {
    return NextResponse.redirect(`${appUrl}/membership/checkout?error=payment_not_confirmed`, { status: 303 })
  }

  await fulfilOrder({ reference, providerRef: payload.pp_TxnRefNo ?? null, payload })
  return NextResponse.redirect(`${appUrl}/membership/success?reference=${reference}`, { status: 303 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
