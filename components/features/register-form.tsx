'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HumanCheck } from '@/components/forms/human-check'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus
} from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { CountryField } from '@/components/ui/country-field'
import { CountryPhoneField } from '@/components/ui/country-phone-field'
import { PasswordField } from '@/components/ui/password-field'
import { passwordMeetsAll } from '@/lib/validation/password'
import { checkPhone } from '@/lib/validation/phone'
import { VerificationCodeForm } from '@/components/features/verification-code-form'

/**
 * Two-step registration.
 *
 * Step 1 collects real, checkable details: a deliverable email address, a country
 * of residence and a phone number validated against that country's numbering
 * plan. Step 2 proves the email address with a six-digit code before the account
 * is activated — no session is issued until the code is confirmed.
 */

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/

const BLOCKED_DOMAINS = ['mailinator.com', 'yopmail.com', 'guerrillamail.com', 'tempmail.com', 'trashmail.com', 'sharklasers.com']

const ROLE_PREFIXES = ['info', 'admin', 'support', 'sales', 'contact', 'noreply', 'no-reply', 'postmaster', 'webmaster', 'billing']

function emailFeedback(value: string) {
  const email = value.trim().toLowerCase()
  if (!email) return { state: 'empty' as const, message: '' }
  if (!EMAIL_PATTERN.test(email)) return { state: 'invalid' as const, message: 'Enter a complete address, e.g. name@university.edu' }
  const [local, domain] = email.split('@')
  if (email.includes('..')) return { state: 'invalid' as const, message: 'Two dots in a row are not allowed.' }
  if (BLOCKED_DOMAINS.includes(domain)) return { state: 'invalid' as const, message: 'Disposable email domains are not accepted.' }
  if (ROLE_PREFIXES.includes(local)) return { state: 'invalid' as const, message: 'Use your personal mailbox — role addresses cannot receive the verification code.' }
  return { state: 'valid' as const, message: 'Looks like a deliverable address — we will send a code to confirm it.' }
}

type PendingState = {
  email: string
  expiresMinutes: number
  devCode?: string
  devLink?: string
  delivery: string
}

export function RegisterForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState<PendingState | null>(null)
  const [emailState, setEmailState] = useState(emailFeedback(''))
  const [country, setCountry] = useState('PK')
  const [locations, setLocations] = useState<{ name: string; cities: string[] }[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const formOpenedAt = useRef<number>(Date.now())
  const [humanCheck, setHumanCheck] = useState<{ token: string; answer: string } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'PK',
      phoneCountry: 'PK',
      phone: '',
      companyWebsite: '',
      formOpenedAt: Date.now()
    }
  })

  const province = watch('province') ?? ''
  const citySuggestions = locations.find(region => region.name === province)?.cities ?? []
  function changeCountry(next: string) {
    if (next === country) return
    setCountry(next)
    setLocations([])
    setValue('province', '')
    setValue('city', '')
    setValue('phoneCountry', next)
  }
  useEffect(() => {
    const controller = new AbortController()
    setLocationsLoading(true)
    fetch('/data/locations/' + country + '.json', { signal: controller.signal })
      .then(response => response.ok ? response.json() : { regions: [] })
      .then(data => { if (!controller.signal.aborted) setLocations(data.regions ?? []) })
      .catch(() => { if (!controller.signal.aborted) setLocations([]) })
      .finally(() => { if (!controller.signal.aborted) setLocationsLoading(false) })
    return () => controller.abort()
  }, [country])
  const phoneCountry = watch('phoneCountry') ?? country
  const phoneValue = watch('phone') ?? ''
  const passwordValue = watch('password') ?? ''
  const confirmValue = watch('confirmPassword') ?? ''
  const emailValue = watch('email') ?? ''

  // A friendly "what is left" list. The submit button stays enabled on purpose:
  // a disabled button with no explanation is exactly the dead end we are avoiding.
  const liveEmail = emailFeedback(emailValue)
  const livePhone = checkPhone(phoneValue, phoneCountry)
  const missingForSubmit = [
    !(watch('firstName') ?? '').trim() ? 'your first name' : '',
    !(watch('lastName') ?? '').trim() ? 'your last name' : '',
    liveEmail.state !== 'valid' ? 'a deliverable email address' : '',
    !livePhone.ok ? 'a valid mobile number' : '',
    !country ? 'your country of residence' : '',
    !passwordMeetsAll(passwordValue) ? 'a strong password' : '',
    !confirmValue || confirmValue !== passwordValue ? 'matching passwords' : '',
    !watch('acceptTerms') ? 'accepting the Terms and Privacy Policy' : ''
  ].filter(Boolean)

  const formReady = missingForSubmit.length === 0

  useEffect(() => {
    setValue('country', country)
  }, [country, setValue])

  useEffect(() => {
    const timer = window.setTimeout(() => setEmailState(emailFeedback(emailValue)), 350)
    return () => window.clearTimeout(timer)
  }, [emailValue])


  if (pending) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="flex items-center gap-2 font-bold text-emerald-800">
            <Mail size={18} /> Check your inbox, verification required
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            We sent a six digit code to <strong>{displayContent(pending.email)}</strong>. Your account stays locked until the
            code is confirmed, and it expires in {displayContent(pending.expiresMinutes)} minutes.
          </p>
          <p className="mt-2 text-xs leading-5 text-emerald-800">{displayContent(pending.delivery)}</p>
        </div>

        <VerificationCodeForm
          email={pending.email}
          devCode={pending.devCode}
          devLink={pending.devLink}
          onVerified={() => {
            router.push('/dashboard')
            router.refresh()
          }}
        />
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        setFieldErrors({})
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...values,
              formOpenedAt: formOpenedAt.current,
              humanToken: humanCheck?.token ?? '',
              humanAnswer: humanCheck?.answer ?? ''
            })
          })
          const data = await response.json().catch(() => null)

          if (!response.ok) {
            setServerError(data?.error ?? 'Registration failed. Please try again.')
            if (data?.fieldErrors) setFieldErrors(data.fieldErrors)
            return
          }

          if (data?.requiresVerification) {
            setPending({
              email: data.email,
              expiresMinutes: data.expiresMinutes ?? 30,
              devCode: data.devCode,
              devLink: data.devLink,
              delivery: data.delivery ?? ''
            })
            return
          }

          router.push('/dashboard')
          router.refresh()
        } catch {
          setServerError('Network error. Please check your connection and try again.')
        }
      })}
    >
      {/* Honeypot: hidden from humans, irresistible to bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="companyWebsite">Company website</label>
        <input id="companyWebsite" tabIndex={-1} autoComplete="off" {...register('companyWebsite')} />
      </div>

      <HumanCheck onChange={setHumanCheck} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.firstName?.message ?? fieldErrors.firstName?.[0]}>
          <Input {...register('firstName')} placeholder="Ayesha" autoComplete="given-name" />
        </Field>
        <Field label="Last name" required error={errors.lastName?.message ?? fieldErrors.lastName?.[0]}>
          <Input {...register('lastName')} placeholder="Khan" autoComplete="family-name" />
        </Field>
      </div>

      <Field
        label="Email address"
        required
        error={errors.email?.message ?? fieldErrors.email?.[0]}
        hint="We send a six-digit code here. The account cannot be activated without it."
      >
        <div className="relative">
          <Input
            type="email"
            {...register('email')}
            placeholder="you@university.edu"
            autoComplete="email"
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {displayContent(emailState.state === 'valid' ? (
              <CheckCircle2 size={17} className="text-emerald-600" />
            ) : emailState.state === 'invalid' ? (
              <AlertTriangle size={17} className="text-rose-500" />
            ) : (
              <Mail size={16} className="text-slate-500" />
            ))}
          </span>
        </div>
        {displayContent(emailState.message && !errors.email ? (
          <p
            className={`mt-1.5 text-xs font-semibold ${
              emailState.state === 'valid' ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {displayContent(emailState.message)}
          </p>
        ) : null)}
      </Field>

      <div className="grid gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">
            Country of residence <span className="text-rose-600">*</span>
          </label>
          <CountryField
            value={country}
            onChange={changeCountry}
            placeholder="Select your country"
            aria-describedby="country-hint"
          />
          <p id="country-hint" className="mt-1.5 text-xs leading-5 text-slate-500">
            Every country is listed, this sets your timezone context and, for international members, your USD
            billing region.
          </p>
        </div>

        <CountryPhoneField
          country={phoneCountry}
          onCountryChange={iso2 => setValue('phoneCountry', iso2, { shouldValidate: true })}
          value={phoneValue}
          onChange={next => setValue('phone', next, { shouldValidate: false })}
          label="Mobile number"
          required
          hint="Chosen automatically from your country — change it if you use a different SIM."
          error={errors.phone?.message ?? fieldErrors.phone?.[0]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Province / Region" htmlFor="province" error={errors.province?.message}>
          {locationsLoading || locations.length ? (
            <Select id="province" autoComplete="address-level1" disabled={locationsLoading}
              {...register('province', { onChange: () => setValue('city', '') })}>
              <option value="">{locationsLoading ? 'Loading regions…' : 'Select region'}</option>
              {locations.map(region => <option key={region.name} value={region.name}>{region.name}</option>)}
            </Select>
          ) : <Input id="province" {...register('province')} placeholder="Enter your region" autoComplete="address-level1" />}
        </Field>
        <Field label="City" htmlFor="city" error={errors.city?.message}>
          <Input id="city" {...register('city')} list="registration-cities" placeholder="Enter or choose your city" autoComplete="address-level2" />
          <datalist id="registration-cities">
            {citySuggestions.map(city => <option key={city} value={city} />)}
          </datalist>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institution / University" error={errors.institution?.message}>
          <Input {...register('institution')} placeholder="Optional" autoComplete="organization" />
        </Field>
        <Field label="Profession" error={errors.profession?.message}>
          <Input {...register('profession')} placeholder="Student, engineer, entrepreneur…" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="Password"
          required
          registration={register('password')}
          value={passwordValue}
          error={errors.password?.message ?? fieldErrors.password?.[0]}
          hint="Choose something only you would know — the checklist below fills in as you type."
          personalTerms={[
            watch('firstName'),
            watch('lastName'),
            `${watch('firstName') ?? ''}${watch('lastName') ?? ''}`,
            watch('email'),
            (watch('email') ?? '').split('@')[0],
            watch('institution')
          ]}
        />

        <PasswordField
          label="Confirm password"
          required
          registration={register('confirmPassword')}
          value={confirmValue}
          error={errors.confirmPassword?.message ?? fieldErrors.confirmPassword?.[0]}
          hint={
            confirmValue && confirmValue === passwordValue
              ? 'Both passwords match.'
              : 'Type the same password again.'
          }
          showRequirements={false}
          showMeter={false}
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
        <input type="checkbox" {...register('acceptTerms')} className="mt-1" />
        <span>
          I accept the{displayContent(' ')}
          <Link href="/terms" className="font-bold text-primary underline decoration-gold-300">
            Terms of Use
          </Link>{displayContent(' ')}
          and{displayContent(' ')}
          <Link href="/privacy" className="font-bold text-primary underline decoration-gold-300">
            Privacy Policy
          </Link>
          , and I confirm the details above are mine.
        </span>
      </label>
      {displayContent(errors.acceptTerms ? (
        <p className="text-xs font-semibold text-rose-600">{displayContent(errors.acceptTerms.message)}</p>
      ) : null)}

      {displayContent(serverError ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {displayContent(serverError)}
        </p>
      ) : null)}

      {displayContent(!formReady && !isSubmitting ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <span className="font-bold">Still needed:</span> {displayContent(missingForSubmit.join(' · '))}. Nothing is sent to
          the server until these are correct, and no account exists until the code below is verified.
        </p>
      ) : null)}

      <Button type="submit" size="lg" variant="gold" disabled={isSubmitting}>
        {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />)}
        {displayContent(isSubmitting ? 'Creating your account…' : 'Create account & send code')}
      </Button>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-gold-600" /> Email verified before activation
        </span>
        <span className="flex items-center gap-1.5">
          <BadgeCheck size={14} className="text-gold-600" /> Phone checked against its numbering plan
        </span>
        <span className="flex items-center gap-1.5">
          <RefreshCw size={14} className="text-gold-600" /> Rate limited &amp; abuse protected
        </span>
      </div>
    </form>
  )
}
