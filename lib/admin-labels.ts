import type { Permission } from '@/lib/permissions'
export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard.read': 'Open the admin dashboard', 'users.read': 'View member accounts', 'users.manage': 'Change member accounts and assign roles', 'roles.manage': 'Create and change team roles', 'sessions.revoke': 'Sign members out of their accounts',
  'homepage.read': 'View homepage content', 'homepage.write': 'Create and edit homepage content', 'homepage.publish': 'Make homepage changes visible on the website',
  'events.read': 'View events', 'events.write': 'Create and edit events', 'events.publish': 'Publish or unpublish events',
  'programmes.read': 'View programmes', 'programmes.write': 'Create and edit programmes', 'programmes.publish': 'Publish or unpublish programmes',
  'opportunities.read': 'View opportunities', 'opportunities.write': 'Create and edit opportunities', 'opportunities.publish': 'Publish or unpublish opportunities',
  'media.read': 'View uploaded images and files', 'media.upload': 'Upload images and files', 'media.delete': 'Delete uploaded files',
  'applications.read': 'View applications', 'applications.review': 'Review applications and update decisions', 'documents.read': 'Open supporting documents',
  'partnerships.read': 'View partnership requests', 'partnerships.review': 'Review partnership requests and update decisions', 'visa.read': 'View visa letter requests', 'visa.review': 'Review visa letter requests and update decisions',
  'certificates.read': 'View certificates', 'certificates.issue': 'Issue new certificates', 'certificates.manage': 'Manage or revoke certificates',
  'payments.read': 'View payment records', 'payments.settle': 'Confirm payments', 'messages.read': 'Read contact messages', 'messages.manage': 'Update contact message status', 'emails.read': 'View email delivery records', 'audit.read': 'View the history of admin changes'
}
export const PERMISSION_GROUPS: Record<string, string> = { dashboard: 'Dashboard', users: 'Member accounts', roles: 'Team roles', sessions: 'Account sign-ins', homepage: 'Website homepage', events: 'Events', programmes: 'Programmes', opportunities: 'Opportunities', media: 'Images & files', applications: 'Applications', documents: 'Supporting documents', partnerships: 'Partnership requests', visa: 'Visa letters', certificates: 'Certificates', payments: 'Payments', messages: 'Contact messages', emails: 'Email delivery', audit: 'History of changes' }
export function roleLabel(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }
