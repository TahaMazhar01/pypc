import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { profileSchemaWithPhone } from '@/lib/validations'
import { recordAudit } from '@/lib/audit'
import { checkPhone } from '@/lib/validation/phone'
import { findCountry } from '@/lib/data/countries'
import { crossOriginResponse, isSameOrigin } from '@/lib/security/request'

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = profileSchemaWithPhone.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the profile fields.' },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Only overwrite the stored number when a valid E.164 value survives parsing;
  // clearing the field deliberately removes it.
  const phoneResult = data.phone ? checkPhone(data.phone, data.phoneCountry) : null
  if (phoneResult && !phoneResult.ok) {
    return NextResponse.json({ error: phoneResult.reason }, { status: 422 })
  }

  const country = data.country ? findCountry(data.country) : undefined

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: phoneResult?.ok ? phoneResult.e164 : null,
      phoneCountry: phoneResult?.ok ? phoneResult.countryIso : null,
      country: country?.iso2 ?? undefined,
      countryName: country?.name ?? undefined,
      city: data.city || null,
      province: data.province || null,
      institution: data.institution || null,
      fieldOfStudy: data.fieldOfStudy || null,
      profession: data.profession || null,
      bio: data.bio || null
    },
    select: { id: true, firstName: true, lastName: true, phone: true, city: true }
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'PROFILE_UPDATED',
    entityType: 'User',
    entityId: user.id,
    request
  })

  return NextResponse.json({ ok: true, user: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
