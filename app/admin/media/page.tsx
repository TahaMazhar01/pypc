import { requirePermissionPage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { MediaManager } from '@/components/admin/media-manager'
export const dynamic = 'force-dynamic'
export default async function MediaPage() {
  const user = await requirePermissionPage('media.read')
  const media = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, alt: true, width: true, height: true, bytes: true } })
  return <MediaManager initialMedia={media} canUpload={hasPermission(user, 'media.upload')} canDelete={hasPermission(user, 'media.delete')} />
}
