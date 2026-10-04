import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { easypaisaDecrypt } from '@/lib/payments/easypaisa'
import { fulfilOrder, markOrderFailed } from '@/lib/orders'
import { recordAudit } from '@/lib/audit'

/**
 * Easypaisa return URL handler.
 *
 * Easypaisa posts back either plain fields or an `encryptedPayload` /
 * `postBack` blob depending on the activated product. This route supports both:
 * decrypt when an encrypted payload is present, otherwise read the fields.
 */
export async function POST(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  const contentType = request.headers.get('content-type') ?? ''
  let payload: Record<string, string> = {}

  if (contentType.includes('application/json')) {
    payload = (await request.json().catch(() => ({}))) as Record<string, string>
  } else {
    const form = await request.formData()
    form.forEach((value, key) => {
      payload[key] = String(value)
    })
  }

  // Decrypt when the gateway sent an encrypted blob.
  const encrypted = payload.encryptedPayload ?? payload.postBack ?? payload.auth_token
  if (encrypted) {
    try {
      payload = { ...payload, ...(JSON.parse(easypaisaDecrypt(encrypted)) as Record<string, string>) }
    } catch (error) {
      console.error('[easypaisa] decryption failed', error)
      await recordAudit({
        action: 'EASYPAISA_CALLBACK_DECRYPT_FAILED',
        entityType: 'Order',
        metadata: { keys: Object.keys(payload) },
        request
      })
      return NextResponse.redirect(`${appUrl}/membership/checkout?error=invalid_payload`, { status: 303 })
    }
  }

  const reference = payload.orderReference ?? payload.orderId
  const status = (payload.status ?? payload.transactionStatus ?? '').toUpperCase()
  const success = ['SUCCESS', 'PAID', 'COMPLETED', '000'].includes(status)

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/membership/checkout?error=missing_reference`, { status: 303 })
  }

  const order = await prisma.order.findUnique({ where: { reference } })
  if (!order) {
    await recordAudit({
      action: 'EASYPAISA_CALLBACK_UNKNOWN_ORDER',
      entityType: 'Order',
      metadata: { reference },
      request
    })
    return NextResponse.redirect(`${appUrl}/membership/checkout?error=unknown_order`, { status: 303 })
  }

  if (!success) {
    await markOrderFailed(reference, `Easypaisa status ${status || 'unknown'}`)
    return NextResponse.redirect(
      `${appUrl}/membership/checkout?error=payment_failed&reference=${reference}`,
      { status: 303 }
    )
  }

  await fulfilOrder({
    reference,
    providerRef: payload.transactionId ?? payload.orderId ?? null,
    payload
  })

  return NextResponse.redirect(`${appUrl}/membership/success?reference=${reference}`, { status: 303 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
