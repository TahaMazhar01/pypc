import { ContentEditor } from '@/components/admin/content-editor'
import { requirePermissionPage } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { contentItems } from '@/lib/content'
import { RESOURCE, type ContentEntity } from '@/lib/content-schema'
import { prisma } from '@/lib/prisma'
export async function ContentPage({ entity }: { entity: ContentEntity }) {
  const resource = RESOURCE[entity]
  const user = await requirePermissionPage(`${resource}.read`)
  const items = await contentItems(entity)
  const media = entity === 'homepage' && hasPermission(user, 'media.read') ? await prisma.mediaAsset.findMany({ select: { id: true, alt: true }, orderBy: { createdAt: 'desc' }, take: 200 }) : []
  return <ContentEditor entity={entity} initialItems={items} canWrite={hasPermission(user, `${resource}.write`)} canPublish={hasPermission(user, `${resource}.publish`)} media={media} />
}
