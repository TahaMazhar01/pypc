import { z } from 'zod'
export const ENTITIES = ['homepage', 'event', 'programme', 'opportunity'] as const
export type ContentEntity = typeof ENTITIES[number]
export const RESOURCE = { homepage: 'homepage', event: 'events', programme: 'programmes', opportunity: 'opportunities' } as const
const title = z.string().trim().min(3).max(180)
const text = z.string().trim().max(20000)
const short = z.string().trim().max(500)
const slug = z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const date = z.string().datetime().nullable().default(null)
const integer = z.number().int().min(0).max(10000000)
const lines = z.string().max(12000).refine(s => { try { const a = JSON.parse(s); return Array.isArray(a) && a.length <= 100 && a.every(v => typeof v === 'string' && v.length <= 1000) } catch { return false } }, 'Enter a JSON list of text values.')
export const safeHref = z.string().max(300).regex(/^\/(?!\/)[a-zA-Z0-9\/_#?=&.~-]*$/, 'Use a local page path, such as /events.')
export const safeImage = z.string().max(200).regex(/^(\/images\/editorial\/[a-z0-9-]+\.(?:webp|png|jpg|jpeg)|\/api\/media\/[a-f0-9-]{36})$/, 'Select an uploaded image or a bundled editorial image.')
const event = z.object({ slug, title, description: text.min(10), eventType: z.enum(['Conference','Workshop','Bootcamp','Webinar','Ceremony','Summit','Training','Institutional visit']), mode: z.enum(['Onsite','Online','Hybrid']), venue: short.nullable().default(null), city: short.nullable().default(null), startsAt: z.string().datetime(), endsAt: date, registrationDeadline: date, capacity: integer.max(100000), isFeatured: z.boolean().default(false) }).strict()
const programme = z.object({ slug, title, category: short.min(1), summary: short.min(10), description: text.min(10), objectives: lines, outcomes: lines, structure: lines, mode: z.enum(['Onsite','Online','Hybrid']), durationWeeks: integer.nullable().default(null), seats: integer.nullable().default(null), feePkr: integer.nullable().default(0), feeUsd: integer.nullable().default(0), isFeatured: z.boolean().default(false), sortOrder: integer.default(0), startsAt: date, endsAt: date }).strict()
const opportunity = z.object({ slug, title, organisation: short.min(1), type: z.enum(['Fellowship','Scholarship','Internship','Job','Grant','Competition']), location: short.min(1), mode: z.enum(['Onsite','Online','Hybrid','Remote']), deadline: date, stipend: short.nullable().default(null), summary: short.min(10), description: text.min(10), requirements: lines, applyUrl: z.string().url().max(500).refine(v => new URL(v).protocol === 'https:', 'Use an HTTPS URL.').nullable().default(null), isFeatured: z.boolean().default(false) }).strict()
export const homepageSchema = z.object({ section: z.enum(['hero','carousel','card']), title, summary: short.min(3), image: safeImage, imageAlt: z.string().trim().min(3).max(300), href: safeHref, cta: short.default('Learn more'), sortOrder: integer.default(0), fullName: short.default(''), location: short.default(''), date: short.default(''), scale: short.default(''), category: z.enum(['Conference','Summit','Training','Institutional visit']).default('Conference'), status: short.default(''), featured: z.boolean().default(false) }).strict()
export const CONTENT_SCHEMAS = { event, programme, opportunity, homepage: homepageSchema }
export type ContentValues = Record<string, string | number | boolean | null>
export type EditorItem = { id: string; version: number; hasDraft: boolean; published: boolean; retained?: boolean; values: ContentValues }
export function validateContent(entity: ContentEntity, data: unknown): ContentValues {
  const value = CONTENT_SCHEMAS[entity].parse(data)
  if ('startsAt' in value && value.startsAt && value.endsAt && Date.parse(value.endsAt) < Date.parse(value.startsAt)) throw new Error('End time must follow start time.')
  if ('registrationDeadline' in value && value.registrationDeadline && Date.parse(value.registrationDeadline) > Date.parse(value.startsAt)) throw new Error('Registration deadline must not follow the event start.')
  return value
}
