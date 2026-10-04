'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { Field, Input, Textarea, Select } from '@/components/ui/field'
import { countries } from '@/lib/data/countries'
import { Button } from '@/components/ui/button'
import { FileUpload } from '@/components/ui/file-upload'
import { CountryField } from '@/components/ui/country-field'
import { CountryPhoneField } from '@/components/ui/country-phone-field'
import { visaLetterSchema, type VisaLetterInput } from '@/lib/validations'

const LETTER_TYPES = [
  { value: 'CONFERENCE_INVITATION', label: 'Conference / IMUN 2027 invitation letter' },
  { value: 'ACADEMIC_VISIT', label: 'Academic or institutional visit' },
  { value: 'VISITOR_VISA', label: 'General visitor visa support letter' }
]

export function VisaLetterForm({
  defaultName = '',
  defaultEmail = '',
  defaultNationality = '',
  defaultCountry = 'PK',
  defaultPhone = ''
}: {
  defaultName?: string
  defaultEmail?: string
  defaultNationality?: string
  defaultCountry?: string
  defaultPhone?: string
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ reference: string } | null>(null)
  const [nationalityIso, setNationalityIso] = useState(defaultCountry)
  const [phoneCountry, setPhoneCountry] = useState(defaultCountry)

  const form = useForm<VisaLetterInput>({
    resolver: zodResolver(visaLetterSchema),
    defaultValues: {
      fullName: defaultName,
      email: defaultEmail,
      nationality: defaultNationality,
      phone: defaultPhone,
      phoneCountry: defaultCountry,
      passportNumber: '',
      letterType: 'CONFERENCE_INVITATION',
      purpose: '',
      eventName: 'IMUN 2027 — International Model United Nations',
      embassyCity: '',
      travelFrom: '',
      travelTo: '',
      documentUrl: ''
    }
  })

  const { register, handleSubmit, setValue, watch, formState } = form
  const phoneValue = watch('phone') ?? ''
  const { errors, isSubmitting } = formState

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
          <CheckCircle2 size={18} /> Request received, {displayContent(success.reference)}
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          The secretariat issues letters on PYPC letterhead within 5 working days. You will see the status
          in your dashboard, and the letter will be emailed to you as a signed PDF. An invitation letter
          supports a visa application; the visa decision itself rests with the relevant authority.
        </p>
        <Link
          href="/dashboard/visa-letters"
          className="mt-4 inline-flex text-sm font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
        >
          Track this request →
        </Link>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        try {
          const response = await fetch('/api/international/visa-letter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values)
          })
          const data = await response.json()

          if (!response.ok) {
            setServerError(data?.error ?? 'We could not submit the request. Please try again.')
            return
          }

          setSuccess({ reference: data.reference })
        } catch {
          setServerError('Network error. Please check your connection and try again.')
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name as in passport" required error={errors.fullName?.message}>
          <Input {...register('fullName')} placeholder="As printed in your passport" />
        </Field>

        <Field label="Email address" required error={errors.email?.message}>
          <Input {...register('email')} type="email" placeholder="you@university.edu" />
        </Field>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">
            Nationality <span className="text-rose-600">*</span>
          </label>
          <CountryField
            value={nationalityIso}
            onChange={iso2 => {
              setNationalityIso(iso2)
              const name = countries.find(item => item.iso2 === iso2)?.name ?? ''
              setValue('nationality', name, { shouldValidate: true })
            }}
          />
          {displayContent(errors.nationality?.message ? (
            <p className="mt-1.5 text-xs font-semibold text-rose-600">{displayContent(errors.nationality.message)}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">
              Every country is listed, pick the one in your passport.
            </p>
          ))}
        </div>

        <Field
          label="Passport number (optional)"
          error={errors.passportNumber?.message}
          hint="Included in the letter only if provided."
        >
          <Input {...register('passportNumber')} placeholder="Optional" />
        </Field>
      </div>

      <CountryPhoneField
        country={phoneCountry}
        onCountryChange={iso2 => {
          setPhoneCountry(iso2)
          setValue('phoneCountry', iso2)
        }}
        value={phoneValue}
        onChange={next => setValue('phone', next)}
        label="Contact number"
        required
        error={errors.phone?.message}
      />

      <Field label="Letter type" required error={errors.letterType?.message}>
        <Select {...register('letterType')}>
          {LETTER_TYPES.map(item => (
            <option key={item.value} value={item.value}>
              {displayContent(item.label)}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Purpose of visit / participation"
        required
        error={errors.purpose?.message}
        hint="Minimum 30 characters. State the programme, your role and your institution."
      >
        <Textarea
          rows={5}
          {...register('purpose')}
          placeholder="I have registered as an international delegate for IMUN 2027 and need an invitation letter for my visa application…"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Event / programme" error={errors.eventName?.message}>
          <Input {...register('eventName')} placeholder="IMUN 2027" />
        </Field>

        <Field label="Nearest embassy / consulate" error={errors.embassyCity?.message}>
          <Input {...register('embassyCity')} placeholder="Nairobi" />
        </Field>

        <Field label="Planned travel from" error={errors.travelFrom?.message}>
          <Input {...register('travelFrom')} type="date" />
        </Field>
      </div>

      <Field
        label="Supporting document (optional)"
        hint="CV, acceptance email or passport bio page — stored privately and visible only to you and the secretariat."
      >
        <FileUpload
          label="Attach supporting document"
          onUploaded={url => setValue('documentUrl', url ?? '')}
        />
      </Field>

      {displayContent(serverError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {displayContent(serverError)}
        </p>
      ) : null)}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />)}
          {displayContent(isSubmitting ? 'Submitting request…' : 'Request invitation letter')}
        </Button>
        <span className="text-xs text-slate-500">
          Letters are issued to registered participants only. PYPC cannot influence a visa decision.
        </span>
      </div>
    </form>
  )
}
