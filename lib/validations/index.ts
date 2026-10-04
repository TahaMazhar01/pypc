import { z } from 'zod'
import { PROVINCES } from '@/lib/constants'
import { DEFAULT_COUNTRY_ISO, findCountryByName, isValidCountryIso } from '@/lib/data/countries'
import { checkPhone } from '@/lib/validation/phone'
import { isDisposableEmail, isRoleMailbox, normaliseEmail } from '@/lib/validation/email'
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordByteLength,
  passwordContainsPersonalInfo,
  passwordLooksCommon
} from '@/lib/validation/password'

/**
 * Country field: any ISO 3166-1 alpha-2 code in the catalogue. Defaults to
 * Pakistan so existing records and forms keep working unchanged.
 */
export const countryIsoSchema = z
  .string()
  .trim()
  .transform(value => (value ? value.toUpperCase() : DEFAULT_COUNTRY_ISO))
  .refine(value => isValidCountryIso(value), 'Select a valid country from the list.')

/** Raw phone input. The real check happens at object level, where the matching
 * country code is available, so the error message can name the numbering plan. */
export const phoneField = z.string().trim().min(4, 'Enter your phone number').max(22)

/**
 * Object-level phone validation: compares the number against the national
 * numbering plan of the selected dialling country and reports the plan by name.
 */
export function refinePhone<T extends z.ZodTypeAny>(
  schema: T,
  options: { phoneKey?: string; countryKey?: string; optional?: boolean } = {}
): T {
  const phoneKey = options.phoneKey ?? 'phone'
  const countryKey = options.countryKey ?? 'phoneCountry'

  const refined = schema.superRefine((value, ctx) => {
    const data = value as Record<string, unknown>
    const phone = data[phoneKey]

    if (options.optional && (!phone || String(phone).trim() === '')) return
    if (typeof phone !== 'string') return

    const country = typeof data[countryKey] === 'string' ? (data[countryKey] as string) : undefined
    const result = checkPhone(phone, country)

    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [phoneKey], message: result.reason })
    }
  })

  // The refinement adds no new fields, so the original inferred type still holds.
  return refined as unknown as T
}

/**
 * Strong password policy.
 *
 * The rules themselves live in `lib/validation/password.ts`, which the
 * registration and dashboard forms also import — so the checklist a visitor
 * reads on screen is literally the rule the server enforces, and a password can
 * never be rejected here for a reason the form did not show.
 */
export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be under ${PASSWORD_MAX_LENGTH} characters`)
  .refine(
    value => passwordByteLength(value) <= PASSWORD_MAX_BYTES,
    'That password is too long — keep it under 72 characters.'
  )
  .refine(value => /[a-z]/.test(value), 'Include at least one lowercase letter')
  .refine(value => /[A-Z]/.test(value), 'Include at least one uppercase letter')
  .refine(value => /\d/.test(value), 'Include at least one number')
  .refine(value => /[^A-Za-z0-9]/.test(value), 'Include at least one symbol (e.g. ! ? # @)')
  .refine(value => !passwordLooksCommon(value), 'That password is too common — choose another')
  .refine(value => !/^(.)\1+$/.test(value), 'A password of a single repeated character is not allowed')

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name is required')
      .max(60)
      .regex(/^[\p{L}\p{M}' .-]+$/u, 'Use letters only (no digits or symbols)'),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name is required')
      .max(60)
      .regex(/^[\p{L}\p{M}' .-]+$/u, 'Use letters only (no digits or symbols)'),
    email: z
      .string()
      .trim()
      .transform(normaliseEmail)
      .refine(value => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value), 'Enter a valid email address')
      .refine(value => !isDisposableEmail(value), 'Disposable email addresses are not accepted')
      .refine(
        value => !isRoleMailbox(value),
        'Use a personal mailbox, not a shared role address (info@, admin@ …)'
      ),
    country: countryIsoSchema,
    phoneCountry: countryIsoSchema,
    phone: phoneField,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    province: z.enum([...PROVINCES] as [string, ...string[]]).optional(),
    city: z.string().trim().max(80).optional(),
    institution: z.string().trim().max(140).optional(),
    profession: z.string().trim().max(120).optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Use and Privacy Policy' })
    }),
    // Bot defences. The honeypot is *not* rejected here on purpose: an empty
    // 422 would tell a script it was detected. It is accepted by the schema and
    // silently discarded in the route, which responds 201 exactly as it would
    // for a real signup.
    companyWebsite: z.string().max(200).optional().or(z.literal('')),
    formOpenedAt: z.number().optional()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })
  .superRefine((data, ctx) => {
    const result = checkPhone(data.phone, data.phoneCountry)
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: result.reason })
    }

    // The password must not simply be the person's own name or email address.
    const personal = passwordContainsPersonalInfo(data.password, [
      data.firstName,
      data.lastName,
      `${data.firstName}${data.lastName}`,
      `${data.firstName}.${data.lastName}`,
      data.email,
      data.email.split('@')[0],
      data.institution
    ])
    if (personal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: `Your password must not contain "${personal}" — that would be the first thing anyone guesses.`
      })
    }
  })

export const loginSchema = z.object({
  email: z.string().trim().transform(normaliseEmail).refine(value => /.+@.+\..+/.test(value), 'Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  // See registerSchema: accepted here, discarded silently in the route.
  companyWebsite: z.string().max(200).optional().or(z.literal(''))
})

export const verifyEmailSchema = z
  .object({
    email: z.string().trim().transform(normaliseEmail),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the six-digit code from the email')
      .optional(),
    token: z.string().min(10).max(200).optional()
  })
  .refine(data => Boolean(data.code) || Boolean(data.token), {
    message: 'Enter the six-digit code from your email.',
    path: ['code']
  })

export const resendVerificationSchema = z.object({
  email: z.string().trim().transform(normaliseEmail).refine(value => /.+@.+\..+/.test(value), 'Enter a valid email address')
})

export const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name is required')
    .max(60)
    .regex(/^[\p{L}\p{M}' .-]+$/u, 'Use letters only'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name is required')
    .max(60)
    .regex(/^[\p{L}\p{M}' .-]+$/u, 'Use letters only'),
  country: countryIsoSchema.optional(),
  phoneCountry: countryIsoSchema.optional(),
  phone: z.string().optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
  province: z.string().max(60).optional().or(z.literal('')),
  institution: z.string().max(140).optional().or(z.literal('')),
  fieldOfStudy: z.string().max(140).optional().or(z.literal('')),
  profession: z.string().max(140).optional().or(z.literal('')),
  bio: z.string().max(600).optional().or(z.literal(''))
})

/** Profile updates accept an empty phone (members can clear it) but validate when present. */
export const profileSchemaWithPhone = refinePhone(profileSchema, { optional: true })

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string()
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

export const applicationSchema = z.object({
  type: z.enum(['PROGRAMME', 'OPPORTUNITY', 'EVENT', 'MEMBERSHIP']),
  programmeId: z.string().cuid().optional(),
  opportunityId: z.string().cuid().optional(),
  eventId: z.string().cuid().optional(),
  fullName: z.string().min(3, 'Full name is required').max(120),
  email: z.string().email(),
  country: countryIsoSchema.optional(),
  phoneCountry: countryIsoSchema.optional(),
  phone: z.string().trim().min(4, 'Enter your phone number').max(22),
  city: z.string().max(80).optional().or(z.literal('')),
  motivation: z.string().min(50, 'Please write at least 50 characters').max(2500),
  experience: z.string().max(2500).optional().or(z.literal('')),
  resumeUrl: z.string().max(300).optional().or(z.literal(''))
})

export const applicationSchemaWithPhone = refinePhone(applicationSchema)

export const VISA_LETTER_TYPES = [
  'VISITOR_VISA',
  'CONFERENCE_INVITATION',
  'ACADEMIC_VISIT'
] as const

export const VISA_LETTER_STATUSES = ['PENDING', 'NEED_INFO', 'ISSUED', 'REJECTED'] as const

export const visaLetterSchema = refinePhone(
  z.object({
  fullName: z.string().trim().min(3, 'Full name is required').max(120),
  email: z
    .string()
    .trim()
    .transform(normaliseEmail)
    .refine(value => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value), 'Enter a valid email address')
    .refine(value => !isDisposableEmail(value), 'Disposable email addresses are not accepted'),
  nationality: z
    .string()
    .trim()
    .min(2, 'Nationality is required')
    .max(80)
    .refine(value => Boolean(findCountryByName(value)), 'Select your nationality from the list'),
  phoneCountry: countryIsoSchema.optional(),
  phone: z.string().trim().min(4, 'Enter a contact number').max(22),
  passportNumber: z.string().max(40).optional().or(z.literal('')),
  letterType: z.enum(VISA_LETTER_TYPES),
  purpose: z.string().min(30, 'Please describe the purpose in at least 30 characters').max(1200),
  eventName: z.string().max(160).optional().or(z.literal('')),
  embassyCity: z.string().max(120).optional().or(z.literal('')),
  travelFrom: z.string().optional().or(z.literal('')),
  travelTo: z.string().optional().or(z.literal('')),
  documentUrl: z.string().max(300).optional().or(z.literal(''))
  })
)

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z
    .string()
    .trim()
    .transform(normaliseEmail)
    .refine(value => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value), 'Enter a valid email address')
    .refine(value => !isDisposableEmail(value), 'Disposable email addresses are not accepted'),
  country: countryIsoSchema.optional(),
  phoneCountry: countryIsoSchema.optional(),
  phone: z.string().optional().or(z.literal('')),
  subject: z.string().trim().min(4, 'Subject is required').max(160),
  message: z.string().trim().min(20, 'Please write at least 20 characters').max(3000),
  companyWebsite: z.string().max(200).optional().or(z.literal(''))
})

export const contactSchemaWithPhone = refinePhone(contactSchema, { optional: true })


/* -------------------------------------------------------------------------- */
/* Partnerships and MoU requests (round 7, third pass)                        */
/* -------------------------------------------------------------------------- */

/**
 * Who is asking. Kept in step with the tiles on /partnerships so the form the
 * visitor fills and the report the secretariat reads use the same vocabulary.
 */
export const PARTNERSHIP_TYPES = [
  'UNIVERSITY',
  'COLLEGE',
  'SCHOOL',
  'NGO',
  'GOVERNMENT',
  'CORPORATE',
  'OTHER'
] as const

/** What they want to do together. At least one is required. */
export const PARTNERSHIP_INTERESTS = [
  'STUDENT_CHAPTER',
  'MOU',
  'JOINT_EVENTS',
  'RESEARCH',
  'FACULTY_EXCHANGE',
  'INTERNSHIPS',
  'SCHOLARSHIPS'
] as const

/** SUBMITTED → UNDER_REVIEW → APPROVED | DECLINED; WITHDRAWN is institution-side. */
export const PARTNERSHIP_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'DECLINED',
  'WITHDRAWN'
] as const

export const partnershipRequestSchema = refinePhone(
  z.object({
    institutionName: z
      .string()
      .trim()
      .min(2, 'Enter the institution’s name')
      .max(180, 'Keep the name under 180 characters'),
    institutionType: z.enum(PARTNERSHIP_TYPES, {
      errorMap: () => ({ message: 'Choose the type of institution' })
    }),
    country: countryIsoSchema.optional(),
    city: z.string().trim().max(90).optional().or(z.literal('')),
    website: z
      .string()
      .trim()
      .max(200, 'Keep the address under 200 characters')
      .refine(
        value =>
          value === '' ||
          /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(value),
        'Enter an address such as https://example.edu.pk'
      )
      .optional()
      .or(z.literal('')),
    contactName: z.string().trim().min(2, 'Enter your name').max(120),
    contactRole: z
      .string()
      .trim()
      .min(2, 'Enter your role, for example Registrar or Head of Society')
      .max(120),
    contactEmail: z
      .string()
      .trim()
      .transform(normaliseEmail)
      .refine(value => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value), 'Enter a valid email address'),
    phoneCountry: countryIsoSchema.optional(),
    phone: phoneField.optional().or(z.literal('')),
    interests: z
      .array(z.enum(PARTNERSHIP_INTERESTS))
      .min(1, 'Choose at least one area of collaboration')
      .max(PARTNERSHIP_INTERESTS.length),
    studentsReached: z
      .string()
      .trim()
      .max(40, 'Keep this short, for example "about 1,200"')
      .optional()
      .or(z.literal('')),
    message: z
      .string()
      .trim()
      .min(40, 'Please describe the proposal in at least 40 characters')
      .max(2500, 'Keep the proposal under 2,500 characters'),
    consent: z
      .boolean()
      .refine(value => value === true, {
        message: 'Please confirm that PYPC may contact you about this request'
      }),
    companyWebsite: z.string().max(200).optional().or(z.literal(''))
  })
)

export type PartnershipRequestInput = z.infer<typeof partnershipRequestSchema>

export const checkoutSchema = z.object({
  planCode: z.string().min(2),
  // FREE is the zero-price community tier: it is activated without a payment.
  // SIMULATED is accepted by the schema but the checkout route only honours it
  // when paymentsSimulationEnabled() is true (never in production).
  provider: z.enum(['STRIPE', 'JAZZCASH', 'EASYPAISA', 'FREE', 'SIMULATED']),
  currency: z.enum(['PKR', 'USD']).default('PKR')
})

export const certificateIssueSchema = z.object({
  title: z.string().min(4).max(160),
  recipientName: z.string().min(3).max(120),
  description: z.string().min(10).max(600),
  grade: z.string().max(40).optional().or(z.literal('')),
  userId: z.string().cuid().optional(),
  programmeId: z.string().cuid().optional(),
  eventId: z.string().cuid().optional(),
  issueDate: z.string().optional()
})

export const aiChatSchema = z.object({
  message: z.string().min(2, 'Please type a question').max(1200),
  sessionKey: z.string().min(6).max(80).optional()
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type ApplicationInput = z.infer<typeof applicationSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type ProfileInputWithPhone = z.infer<typeof profileSchema>
export type ContactInputWithPhone = z.infer<typeof contactSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type CertificateIssueInput = z.infer<typeof certificateIssueSchema>
export type VisaLetterInput = z.infer<typeof visaLetterSchema>
