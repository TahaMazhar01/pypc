'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { contactSchemaWithPhone, type ContactInput } from '@/lib/validations'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { CountryPhoneField } from '@/components/ui/country-phone-field'
import { CONTACT_EMAIL } from '@/lib/constants'
import { HumanCheck } from '@/components/forms/human-check'

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [humanCheck, setHumanCheck] = useState<{ token: string; answer: string } | null>(null)

  const [phoneCountry, setPhoneCountry] = useState('PK')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchemaWithPhone),
    defaultValues: { country: 'PK', phoneCountry: 'PK', phone: '', companyWebsite: '' }
  })

  const phoneValue = watch('phone') ?? ''

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="flex items-center gap-2 font-bold text-emerald-800">
          <CheckCircle2 size={18} /> Message received
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          Thank you. The PYPC secretariat usually responds within two working days. For urgent matters
          email{displayContent(' ')}
          <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
            {displayContent(CONTACT_EMAIL)}
          </a>{displayContent(' ')}
          directly.
        </p>
        <Button
          variant="outline"
          size="md"
          className="mt-4"
          onClick={() => {
            reset()
            setSent(false)
          }}
        >
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...values,
            humanToken: humanCheck?.token ?? '',
            humanAnswer: humanCheck?.answer ?? ''
          })
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          setServerError(data?.error ?? `Message could not be sent. Please email ${CONTACT_EMAIL}.`)
          return
        }

        setSent(true)
      })}
    >
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company website</label>
        <input id="contact-company" tabIndex={-1} autoComplete="off" {...register('companyWebsite')} />
      </div>

      <HumanCheck onChange={setHumanCheck} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name?.message}>
          <Input {...register('name')} placeholder="Your name" />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" {...register('email')} placeholder="you@example.com" />
        </Field>
        <CountryPhoneField
          country={phoneCountry}
          onCountryChange={iso2 => {
            setPhoneCountry(iso2)
            setValue('phoneCountry', iso2)
          }}
          value={phoneValue}
          onChange={next => setValue('phone', next)}
          label="Phone (optional)"
          autoComplete="tel"
          allowEmpty
          error={errors.phone?.message}
        />
        <Field label="Subject" required error={errors.subject?.message}>
          <Input {...register('subject')} placeholder="Membership, events, partnership…" />
        </Field>
      </div>

      <Field label="Message" required error={errors.message?.message}>
        <Textarea rows={6} {...register('message')} placeholder="How can the secretariat help?" />
      </Field>

      {displayContent(serverError ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {displayContent(serverError)}
        </p>
      ) : null)}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />)}
        {displayContent(isSubmitting ? 'Sending…' : 'Send message')}
      </Button>
    </form>
  )
}
