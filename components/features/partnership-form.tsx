'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Handshake, Loader2 } from 'lucide-react'
import { partnershipRequestSchema, type PartnershipRequestInput } from '@/lib/validations'
import { PARTNERSHIP_INTERESTS } from '@/lib/validations'
import {
  PARTNERSHIP_INTEREST_LABELS,
  PARTNERSHIP_STATUS_MEANINGS
} from '@/lib/partnerships'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { CountryField } from '@/components/ui/country-field'
import { CountryPhoneField } from '@/components/ui/country-phone-field'
import { HumanCheck } from '@/components/forms/human-check'
import { CONTACT_EMAIL } from '@/lib/constants'

const INSTITUTION_TYPES: { value: PartnershipRequestInput['institutionType']; label: string }[] = [
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'SCHOOL', label: 'School' },
  { value: 'NGO', label: 'NGO or civil-society organisation' },
  { value: 'GOVERNMENT', label: 'Government office or public body' },
  { value: 'CORPORATE', label: 'Company or foundation' },
  { value: 'OTHER', label: 'Other' }
]

/**
 * Partnership / MoU request form — the client half of
 * `app/api/partnerships/request/route.ts`.
 *
 * Validation runs twice on purpose: react-hook-form gives the visitor an answer
 * as they type, and the server re-checks everything because a browser is not a
 * security boundary.
 */
export function PartnershipForm() {
  const router = useRouter()
  const [sent, setSent] = useState<{ reference: string; alreadyReceived?: boolean } | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [humanCheck, setHumanCheck] = useState<{ token: string; answer: string } | null>(null)
  const [phoneCountry, setPhoneCountry] = useState('PK')
  const [interests, setInterests] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<PartnershipRequestInput>({
    resolver: zodResolver(partnershipRequestSchema),
    defaultValues: {
      institutionType: 'UNIVERSITY',
      country: 'PK',
      phoneCountry: 'PK',
      phone: '',
      city: '',
      website: '',
      studentsReached: '',
      interests: [],
      consent: false,
      companyWebsite: ''
    }
  })

  const countryValue = watch('country') ?? 'PK'
  const phoneValue = watch('phone') ?? ''

  function toggleInterest(value: string) {
    const next = interests.includes(value)
      ? interests.filter(item => item !== value)
      : [...interests, value]
    setInterests(next)
    setValue('interests', next as PartnershipRequestInput['interests'], { shouldValidate: true })
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6" role="status">
        <p className="flex items-center gap-2 font-bold text-emerald-800">
          <CheckCircle2 size={18} />
          {displayContent(sent.alreadyReceived ? 'This request is already with us' : 'Request received')}
        </p>
        <p className="mt-2 text-sm text-emerald-900">
          Your reference is{displayContent(' ')}
          <span className="font-mono font-bold">{displayContent(sent.reference)}</span>. Quote it in any correspondence.
          A confirmation is on its way to your inbox.
        </p>
        <p className="mt-2 text-sm text-emerald-900">{displayContent(PARTNERSHIP_STATUS_MEANINGS.SUBMITTED)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" size="md" onClick={() => window.print()}>
            Print this reference
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              reset()
              setInterests([])
              setSent(null)
              router.refresh()
            }}
          >
            Submit another institution
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={handleSubmit(async values => {
        setServerError(null)

        const response = await fetch('/api/partnerships/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            interests: interests.length ? interests : values.interests,
            humanToken: humanCheck?.token ?? '',
            humanAnswer: humanCheck?.answer ?? ''
          })
        })

        const data = (await response.json().catch(() => null)) as
          | { ok?: boolean; reference?: string; alreadyReceived?: boolean; error?: string }
          | null

        if (!response.ok || !data?.reference) {
          setServerError(
            data?.error ??
              `The request could not be sent. Please try again, or email ${CONTACT_EMAIL}.`
          )
          return
        }

        setSent({ reference: data.reference, alreadyReceived: data.alreadyReceived })
      })}
    >
      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="companyWebsite">Company website</label>
        <input id="companyWebsite" tabIndex={-1} autoComplete="off" {...register('companyWebsite')} />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-base font-extrabold text-slate-900">The institution</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Institution name"
            htmlFor="institutionName"
            error={errors.institutionName?.message}
            required
          >
            <Input
              id="institutionName"
              autoComplete="organization"
              placeholder="University of Engineering and Technology, Lahore"
              {...register('institutionName')}
            />
          </Field>

          <Field
            label="Type of institution"
            htmlFor="institutionType"
            error={errors.institutionType?.message}
            required
          >
            <Select id="institutionType" {...register('institutionType')}>
              {INSTITUTION_TYPES.map(option => (
                <option key={option.value} value={option.value}>
                  {displayContent(option.label)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country" htmlFor="country" hint="All countries are listed." required>
            <CountryField
              id="country"
              value={countryValue}
              onChange={iso2 => setValue('country', iso2, { shouldValidate: true })}
            />
          </Field>

          <Field label="City" htmlFor="city" error={errors.city?.message}>
            <Input id="city" placeholder="Lahore" {...register('city')} />
          </Field>
        </div>

        <Field
          label="Website"
          htmlFor="website"
          error={errors.website?.message}
          hint="Optional. Include https:// if you have it."
        >
          <Input id="website" placeholder="https://example.edu.pk" {...register('website')} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="text-base font-extrabold text-slate-900">
          The person accountable for this partnership
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="contactName" error={errors.contactName?.message} required>
            <Input
              id="contactName"
              autoComplete="name"
              placeholder="Dr Ayesha Khan"
              {...register('contactName')}
            />
          </Field>

          <Field
            label="Role at the institution"
            htmlFor="contactRole"
            error={errors.contactRole?.message}
            hint="For example Registrar, Dean, or Head of the debating society."
            required
          >
            <Input id="contactRole" placeholder="Registrar" {...register('contactRole')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            htmlFor="contactEmail"
            error={errors.contactEmail?.message}
            hint="An institutional address is preferred."
            required
          >
            <Input
              id="contactEmail"
              type="email"
              autoComplete="email"
              placeholder="registrar@example.edu.pk"
              {...register('contactEmail')}
            />
          </Field>

          <CountryPhoneField
            country={phoneCountry}
            onCountryChange={iso2 => {
              setPhoneCountry(iso2)
              setValue('phoneCountry', iso2)
            }}
            value={phoneValue}
            onChange={value => setValue('phone', value, { shouldValidate: true })}
            label="Phone (optional)"
            error={errors.phone?.message}
            allowEmpty
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 border-t border-slate-200 pt-6">
        <legend className="text-base font-extrabold text-slate-900">
          What would you like to do together?
        </legend>
        <p className="text-sm text-slate-600">Choose at least one. You can change scope later.</p>

        <div className="grid gap-2 sm:grid-cols-2">
          {PARTNERSHIP_INTERESTS.map(value => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-800 transition hover:border-primary hover:bg-primary-50/40"
            >
              <input
                type="checkbox"
                className="focus-ring mt-0.5 h-4 w-4 rounded border-slate-300"
                checked={interests.includes(value)}
                onChange={() => toggleInterest(value)}
              />
              <span className="font-semibold">{displayContent(PARTNERSHIP_INTEREST_LABELS[value])}</span>
            </label>
          ))}
        </div>
        {errors.interests?.message && (
          <p className="text-xs font-semibold text-rose-600" role="alert">
            {displayContent(errors.interests.message)}
          </p>
        )}

        <Field
          label="Students or members this would reach"
          htmlFor="studentsReached"
          error={errors.studentsReached?.message}
          hint="Optional. An estimate is fine."
        >
          <Input id="studentsReached" placeholder="about 1,200" {...register('studentsReached')} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="text-base font-extrabold text-slate-900">The proposal</legend>

        <Field
          label="What you have in mind"
          htmlFor="message"
          error={errors.message?.message}
          hint="Activities, dates, who would coordinate on your side, and anything you need from PYPC."
          required
        >
          <Textarea id="message" rows={6} placeholder="We would like to…" {...register('message')} />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="focus-ring mt-0.5 h-4 w-4 rounded border-slate-300"
            {...register('consent')}
          />
          <span>
            I am authorised to speak for this institution about the proposal, and PYPC may contact me
            about it.
          </span>
        </label>
        {errors.consent?.message && (
          <p className="text-xs font-semibold text-rose-600" role="alert">
            {displayContent(errors.consent.message)}
          </p>
        )}
      </fieldset>

      <HumanCheck onChange={setHumanCheck} label="Security check" />

      {serverError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">
          {displayContent(serverError)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting || !humanCheck}>
          {displayContent(isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Handshake size={16} /> Submit partnership request
            </>
          ))}
        </Button>
        <p className="text-xs text-slate-500">
          You will get a reference number immediately. Nothing is published until an agreement is
          countersigned.
        </p>
      </div>
    </form>
  )
}
