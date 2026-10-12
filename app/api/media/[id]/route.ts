import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { mediaIds } from '@/lib/content'
export async function GET(request: Request, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  if (!/^[a-f0-9-]{36}$/.test(params.id)) return new NextResponse(null, { status: 404 })
  const published = await prisma.homepageItem.findMany({ where: { isPublished: true, data: { contains: '/api/media/' + params.id } }, select: { data: true } })
  const visible = published.some(item => mediaIds(item.data).includes(params.id))
  if (!visible) {
    const user = await getCurrentUser()
    if (!user || (!hasPermission(user, 'media.read') && !hasPermission(user, 'homepage.read'))) return new NextResponse(null, { status: 404 })
  }
  const asset = await prisma.mediaAsset.findUnique({ where: { id: params.id } })
  if (!asset) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(asset.data), { headers: { 'Content-Type': 'image/webp', 'Content-Length': String(asset.bytes), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox" } })
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
