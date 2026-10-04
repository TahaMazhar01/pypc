'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react'
import { applicationSchemaWithPhone, type ApplicationInput } from '@/lib/validations'
import { Field, Input, Textarea } from '@/components/ui/field'
import { FileUpload } from '@/components/ui/file-upload'
import { CountryPhoneField } from '@/components/ui/country-phone-field'
import { Button } from '@/components/ui/button'

type Props = {
  type: 'PROGRAMME' | 'OPPORTUNITY' | 'EVENT' | 'MEMBERSHIP'
  programmeId?: string
  opportunityId?: string
  eventId?: string
  defaultName?: string
  defaultEmail?: string
  defaultPhone?: string
  defaultCity?: string
  signedIn: boolean
}

export function ApplicationForm({
  type,
  programmeId,
  opportunityId,
  eventId,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
  defaultCity = '',
  signedIn
}: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ reference: string } | null>(null)
  const [phoneCountry, setPhoneCountry] = useState('PK')

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchemaWithPhone),
    defaultValues: {
      type,
      programmeId,
      opportunityId,
      eventId,
      fullName: defaultName,
      email: defaultEmail,
      phone: defaultPhone,
      city: defaultCity,
      motivation: '',
      experience: ''
    }
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = form

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="flex items-center gap-2 font-bold text-amber-800">
          <AlertTriangle size={18} /> Sign in required
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Applications are linked to your PYPC member account so you can track their status. Please
          sign in or create a free account to continue.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => router.push('/login?next=/programmes')} size="md">
            Sign in
          </Button>
          <Button variant="outline" size="md" onClick={() => router.push('/register')}>
            Create account
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="flex items-center gap-2 font-bold text-emerald-800">
          <CheckCircle2 size={18} /> Application submitted
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          Your reference number is <span className="font-mono font-bold">{displayContent(success.reference)}</span>.
          Track progress any time from your dashboard.
        </p>
        <div className="mt-4 flex gap-3">
          <Button size="md" onClick={() => router.push('/dashboard/applications')}>
            View my applications
          </Button>
          <Button variant="outline" size="md" onClick={() => setSuccess(null)}>
            Submit another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        try {
          const response = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values)
          })
          const data = await response.json()

          if (!response.ok) {
            setServerError(data?.error ?? 'We could not submit your application. Please try again.')
            return
          }

          setSuccess({ reference: data.reference })
          router.refresh()
        } catch {
          setServerError('Network error. Please check your connection and try again.')
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.fullName?.message}>
          <Input {...register('fullName')} placeholder="Your full name" />
        </Field>

        <Field label="Email" required error={errors.email?.message}>
          <Input {...register('email')} type="email" placeholder="you@example.com" />
        </Field>

        <CountryPhoneField
          country={phoneCountry}
          onCountryChange={iso2 => {
            setPhoneCountry(iso2)
            form.setValue('phoneCountry', iso2, { shouldValidate: true })
          }}
          value={form.watch('phone') ?? ''}
          onChange={next => form.setValue('phone', next, { shouldValidate: false })}
          label="Mobile number"
          required
          error={errors.phone?.message}
        />

        <Field label="City" error={errors.city?.message}>
          <Input {...register('city')} placeholder="Rawalpindi" />
        </Field>
      </div>

      <Field
        label="Why do you want to join?"
        required
        error={errors.motivation?.message}
        hint="Minimum 50 characters. Be specific about your interest and what you hope to contribute."
      >
        <Textarea rows={6} {...register('motivation')} placeholder="Tell us about your motivation…" />
      </Field>

      <Field
        label="Relevant experience (optional)"
        error={errors.experience?.message}
        hint="Leadership roles, volunteering, projects, research or debate experience."
      >
        <Textarea rows={4} {...register('experience')} placeholder="Optional" />
      </Field>

      <Field
        label="CV / resume (optional but recommended)"
        hint="Upload your CV so reviewers can assess your experience. Stored privately — only the secretariat can open it."
      >
        <FileUpload
          label="Attach CV or resume"
          onUploaded={url => form.setValue('resumeUrl', url ?? '')}
        />
      </Field>

      {displayContent(serverError ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {displayContent(serverError)}
        </p>
      ) : null)}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />)}
        {displayContent(isSubmitting ? 'Submitting…' : 'Submit application')}
      </Button>

      <p className="text-xs text-slate-500">
        By submitting you agree that PYPC may store this information to process your application.
      </p>
    </form>
  )
}
