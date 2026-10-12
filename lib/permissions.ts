/** Shared permission vocabulary. Authority always comes from the database user. */
export const PERMISSIONS = [
  'dashboard.read', 'users.read', 'users.manage', 'roles.manage', 'sessions.revoke',
  'homepage.read', 'homepage.write', 'homepage.publish',
  'events.read', 'events.write', 'events.publish',
  'programmes.read', 'programmes.write', 'programmes.publish',
  'opportunities.read', 'opportunities.write', 'opportunities.publish',
  'media.read', 'media.upload', 'media.delete',
  'applications.read', 'applications.review', 'documents.read',
  'partnerships.read', 'partnerships.review', 'visa.read', 'visa.review',
  'certificates.read', 'certificates.issue', 'certificates.manage',
  'payments.read', 'payments.settle', 'messages.read', 'messages.manage', 'emails.read', 'audit.read'
] as const
export type Permission = typeof PERMISSIONS[number]
const editorial: Permission[] = ['dashboard.read', 'homepage.read', 'homepage.write', 'events.read', 'events.write', 'programmes.read', 'programmes.write', 'opportunities.read', 'opportunities.write', 'media.read', 'media.upload']
const review: Permission[] = ['dashboard.read', 'applications.read', 'applications.review', 'documents.read', 'partnerships.read', 'partnerships.review', 'visa.read', 'visa.review', 'messages.read', 'messages.manage']
export const BUILTIN_ROLES: Record<string, readonly Permission[]> = {
  MEMBER: [], ADMIN: PERMISSIONS, SUPER_ADMIN: PERMISSIONS,
  DIRECTOR: [...editorial, 'homepage.publish', 'events.publish', 'programmes.publish', 'opportunities.publish'],
  AMBASSADOR: ['dashboard.read', 'events.read'],
  GRAPHIC_DESIGNER: ['dashboard.read', 'homepage.read', 'homepage.write', 'media.read', 'media.upload'],
  DEVELOPER: ['dashboard.read'], EMPLOYEE: ['dashboard.read'],
  MODERATOR: [...editorial, ...review], EXECUTIVE: ['dashboard.read']
}
export const GOVERNANCE_PERMISSIONS: readonly Permission[] = ['users.manage', 'roles.manage', 'sessions.revoke']
export type PermissionSubject = { role: string; customRole?: { permissions: string } | null }
export function permissionsFor(subject: PermissionSubject): readonly Permission[] {
  if (subject.role !== 'CUSTOM') return Object.hasOwn(BUILTIN_ROLES, subject.role) ? BUILTIN_ROLES[subject.role] : []
  try {
    const value: unknown = JSON.parse(subject.customRole?.permissions ?? '[]')
    return Array.isArray(value) ? PERMISSIONS.filter(p => value.includes(p) && !GOVERNANCE_PERMISSIONS.includes(p)) : []
  } catch { return [] }
}
export function hasPermission(subject: PermissionSubject, permission: Permission) {
  return permissionsFor(subject).includes(permission)
}
export const PAGE_PERMISSIONS: Record<string, Permission> = {
  '/admin': 'dashboard.read', '/admin/users': 'users.read', '/admin/roles': 'roles.manage',
  '/admin/content': 'homepage.read', '/admin/media': 'media.read', '/admin/events': 'events.read',
  '/admin/programmes': 'programmes.read', '/admin/opportunities': 'opportunities.read',
  '/admin/applications': 'applications.read', '/admin/partnerships': 'partnerships.read',
  '/admin/payments': 'payments.read', '/admin/certificates': 'certificates.read',
  '/admin/messages': 'messages.read', '/admin/emails': 'emails.read',
  '/admin/visa-letters': 'visa.read', '/admin/audit': 'audit.read'
}
