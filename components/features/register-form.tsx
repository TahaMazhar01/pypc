'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { AuthField } from '@/components/auth/auth-field'
import { CountryField } from '@/components/ui/country-field'
import { CountryPhoneField } from '@/components/ui/country-phone-field'
import { PasswordField } from '@/components/ui/password-field'
import { HumanCheck } from '@/components/forms/human-check'
import { VerificationCodeForm } from '@/components/features/verification-code-form'
import { checkPhone } from '@/lib/validation/phone'

type PendingState = { email: string; expiresMinutes: number; delivery: string; devCode?: string; devLink?: string }
const detailFields: FieldPath<RegisterInput>[] = ['firstName', 'lastName', 'email', 'country', 'phoneCountry', 'phone']

export function RegisterForm({ localPreview = false }: { localPreview?: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingState | null>(null)
  const [country, setCountry] = useState('PK')
  const [locations, setLocations] = useState<{ name: string; cities: string[] }[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [humanCheck, setHumanCheck] = useState<{ token: string; answer: string } | null>(null)
  const formOpenedAt = useRef(Date.now())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { register, handleSubmit, setValue, setError, getValues, trigger, watch, formState: { errors, isSubmitting } } =
    useForm<RegisterInput>({
      resolver: zodResolver(registerSchema),
      mode: 'onTouched',
      defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', country: 'PK', phoneCountry: 'PK', phone: '', province: '', city: '', institution: '', profession: '', companyWebsite: '', formOpenedAt: Date.now() }
    })

  const province = watch('province') ?? ''
  const phoneCountry = watch('phoneCountry') ?? country
  const phoneValue = watch('phone') ?? ''
  const passwordValue = watch('password') ?? ''
  const confirmValue = watch('confirmPassword') ?? ''
  const citySuggestions = locations.find(region => region.name === province)?.cities ?? []

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

  function changeCountry(next: string) {
    setCountry(next)
    setValue('country', next, { shouldValidate: true })
    setValue('phoneCountry', next, { shouldValidate: false })
    setValue('province', '')
    setValue('city', '')
  }
  function changeStep(next: number) {
    setStep(next)
    setServerError(null)
    requestAnimationFrame(() => headingRef.current?.focus())
  }
  async function continueToSecurity() {
    const valid = await trigger(detailFields, { shouldFocus: true })
    const phone = checkPhone(getValues('phone'), getValues('phoneCountry'))
    if (!phone.ok) setError('phone', { type: 'validate', message: phone.reason })
    if (valid && phone.ok) changeStep(1)
  }
  const fieldDescription = (name: keyof RegisterInput) => errors[name] ? 'register-' + name + '-error' : undefined

  if (pending) return <div className="space-y-5">
    <div className="auth-message auth-message-neutral" role="status"><Mail size={21} aria-hidden="true" /><div>
      <h2 className="font-bold">{localPreview ? 'Your preview account is created.' : 'You’re nearly there. Check your email.'}</h2>
      <p className="mt-2">{localPreview ? 'No verification email was sent. Your account stays pending while outgoing email is disabled in this local preview.' : 'Enter the six-digit code sent to ' + pending.email + ' to activate your account.'}</p>
      {pending.delivery && <p className="mt-2 text-xs">{pending.delivery}</p>}
    </div></div>
    <VerificationCodeForm email={pending.email} localPreview={localPreview} devCode={pending.devCode} devLink={pending.devLink} onVerified={() => { router.push('/dashboard'); router.refresh() }} />
    <p className="auth-switch">Already have a verified account? <Link href="/login">Sign in</Link></p>
  </div>

  return <form className="auth-form" method="post" action="/api/auth/register" data-ready={ready} noValidate aria-busy={isSubmitting} onSubmit={event => {
    if (step === 0) { event.preventDefault(); void continueToSecurity(); return }
    void handleSubmit(async values => {
      setServerError(null)
      if (!humanCheck?.answer) { setServerError('Please answer the security question before creating your account.'); document.getElementById('human-answer')?.focus(); return }
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, formOpenedAt: formOpenedAt.current, humanToken: humanCheck.token, humanAnswer: humanCheck.answer })
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          const fieldErrors = data?.fieldErrors as Record<string, string[]> | undefined
          if (fieldErrors) {
            for (const [key, messages] of Object.entries(fieldErrors)) if (messages?.[0]) setError(key as FieldPath<RegisterInput>, { type: 'server', message: messages[0] })
            if (detailFields.some(key => fieldErrors[key])) setStep(0)
          }
          setServerError(data?.error ?? 'We could not create your account. Please check the details and try again.')
          return
        }
        if (data?.requiresVerification) {
          setPending({ email: data.email, expiresMinutes: data.expiresMinutes ?? 30, devCode: data.devCode, devLink: data.devLink, delivery: data.delivery ?? '' })
          return
        }
        router.push('/dashboard'); router.refresh()
      } catch { setServerError('We could not connect. Your details are still here; please try again.') }
    }, formErrors => {
      if (detailFields.some(key => formErrors[key])) setStep(0)
      setServerError('Please check the highlighted fields.')
    })(event)
  }}>
    <ol className="auth-steps" aria-label="Create account progress">
      <li aria-current={step === 0 ? 'step' : undefined}><span>{step > 0 ? <Check size={14} aria-hidden="true" /> : '1'}</span>Your details</li>
      <li aria-current={step === 1 ? 'step' : undefined}><span>2</span>Account security</li>
    </ol>
    <div className="auth-step-heading"><h2 tabIndex={-1} ref={headingRef}>{step === 0 ? 'Let’s get to know you.' : 'Keep your account secure.'}</h2><p>{step === 0 ? 'Your name, email and contact details. Fields marked * are required.' : 'Choose a strong password, then complete one quick check.'}</p></div>
    <noscript><p role="alert">Enable JavaScript to create your account securely.</p></noscript>
    <fieldset disabled={!ready || isSubmitting} className="auth-fieldset">
      <legend className="sr-only">Create account details</legend>
      <div hidden aria-hidden="true"><label htmlFor="companyWebsite">Company website</label><input id="companyWebsite" tabIndex={-1} autoComplete="off" {...register('companyWebsite')} /></div>
      <div hidden={step !== 0} className="auth-step-fields">
        <div className="auth-two-columns">
          <AuthField id="register-firstName" label="First name" required error={errors.firstName?.message}>
            <input className="auth-input" id="register-firstName" autoComplete="given-name" placeholder="First name" {...register('firstName')} aria-required="true" aria-invalid={Boolean(errors.firstName)} aria-describedby={fieldDescription('firstName')} />
          </AuthField>
          <AuthField id="register-lastName" label="Last name" required error={errors.lastName?.message}>
            <input className="auth-input" id="register-lastName" autoComplete="family-name" placeholder="Last name" {...register('lastName')} aria-required="true" aria-invalid={Boolean(errors.lastName)} aria-describedby={fieldDescription('lastName')} />
          </AuthField>
        </div>
        <AuthField id="register-email" label="Email address" required error={errors.email?.message} hint={localPreview ? 'Email delivery is off in this local preview.' : 'Use your own email address. We’ll send a code to verify it.'}>
          <input className="auth-input" id="register-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" {...register('email')} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={fieldDescription('email') ?? 'register-email-hint'} />
        </AuthField>
        <div className="auth-field">
          <label htmlFor="register-country">Country of residence <span aria-hidden="true">*</span></label>
          <CountryField id="register-country" label="Country of residence" value={country} onChange={changeCountry} disabled={isSubmitting} aria-describedby={errors.country ? 'register-country-error' : undefined} />
          {errors.country && <p role="alert" id="register-country-error" className="auth-field-error">{errors.country.message}</p>}
        </div>
        <CountryPhoneField id="register-phone" country={phoneCountry} onCountryChange={iso2 => setValue('phoneCountry', iso2, { shouldValidate: true })} value={phoneValue} onChange={next => setValue('phone', next, { shouldValidate: Boolean(errors.phone) })} label="Mobile number" required hint="Choose your dialling code, then enter your mobile number." error={errors.phone?.message} />
        <details className="auth-optional-details">
          <summary>Location & background <span>Optional</span><ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="auth-two-columns">
            <AuthField id="register-province" label="Province / region" error={errors.province?.message}>
              {locations.length || locationsLoading ? <select className="auth-input" id="register-province" disabled={locationsLoading || isSubmitting} autoComplete="address-level1" {...register('province', { onChange: () => setValue('city', '') })}><option value="">{locationsLoading ? 'Loading regions…' : 'Select region'}</option>{locations.map(region => <option key={region.name} value={region.name}>{region.name}</option>)}</select> : <input className="auth-input" id="register-province" autoComplete="address-level1" {...register('province')} />}
            </AuthField>
            <AuthField id="register-city" label="City" error={errors.city?.message}>
              <input className="auth-input" id="register-city" autoComplete="address-level2" list="registration-cities" placeholder="Your city" {...register('city')} /><datalist id="registration-cities">{citySuggestions.map(city => <option key={city} value={city} />)}</datalist>
            </AuthField>
            <AuthField id="register-institution" label="Institution / university" error={errors.institution?.message}><input className="auth-input" id="register-institution" autoComplete="organization" {...register('institution')} /></AuthField>
            <AuthField id="register-profession" label="Profession" error={errors.profession?.message}><input className="auth-input" id="register-profession" placeholder="Student, engineer…" {...register('profession')} /></AuthField>
          </div>
        </details>
      </div>
      <div hidden={step !== 1} className="auth-step-fields">
        <div className="auth-password"><PasswordField id="register-password" label="Password" required registration={register('password')} value={passwordValue} error={errors.password?.message} placeholder="Create a strong password" disabled={isSubmitting} personalTerms={[watch('firstName'), watch('lastName'), (watch('firstName') ?? '') + (watch('lastName') ?? ''), watch('email'), (watch('email') ?? '').split('@')[0], watch('institution')]} /></div>
        <div className="auth-password"><PasswordField id="register-confirmPassword" label="Confirm password" required registration={register('confirmPassword')} value={confirmValue} error={errors.confirmPassword?.message} hint={confirmValue && confirmValue === passwordValue ? 'Your passwords match.' : 'Enter the same password again.'} showRequirements={false} showMeter={false} placeholder="Re-enter your password" disabled={isSubmitting} /></div>
        {step === 1 && <HumanCheck onChange={setHumanCheck} label="A quick security check" />}
        <div>
          <label className="auth-terms"><input type="checkbox" {...register('acceptTerms')} aria-invalid={Boolean(errors.acceptTerms)} aria-describedby={errors.acceptTerms ? 'register-terms-error' : undefined} /><span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</Link> and <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>, and confirm these details are mine.</span></label>
          {errors.acceptTerms && <p id="register-terms-error" role="alert" className="auth-field-error">{errors.acceptTerms.message}</p>}
        </div>
      </div>
      {serverError && <div role="alert" className="auth-message auth-message-error"><AlertCircle size={18} aria-hidden="true" /><p>{serverError}</p></div>}
      <div className="auth-form-actions">
        {step === 1 && <button type="button" className="auth-previous" onClick={() => changeStep(0)} disabled={isSubmitting}><ArrowLeft size={17} aria-hidden="true" /> Back</button>}
        <button type="submit" className="auth-submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Creating account…</> : step === 0 ? <>Continue <ArrowRight size={18} aria-hidden="true" /></> : <>Create {localPreview ? 'preview ' : ''}account <ArrowRight size={18} aria-hidden="true" /></>}</button>
      </div>
    </fieldset>
    <p className="auth-switch">Already part of PYPC? <Link href="/login">Sign in</Link></p>
    <p className="auth-security-note"><LockKeyhole size={14} aria-hidden="true" /> A free account. Membership plans are optional.</p>
  </form>
}
