'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Save } from 'lucide-react'
import { profileSchemaWithPhone, type ProfileInputWithPhone } from '@/lib/validations'
import { PROVINCES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { CountryField } from '@/components/ui/country-field'
import { CountryPhoneField } from '@/components/ui/country-phone-field'

export function ProfileForm({ initial }: { initial: Partial<ProfileInputWithPhone> }) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch
  } = useForm<ProfileInputWithPhone>({
    resolver: zodResolver(profileSchemaWithPhone),
    defaultValues: {
      firstName: initial.firstName ?? '',
      lastName: initial.lastName ?? '',
      country: initial.country ?? 'PK',
      phoneCountry: initial.phoneCountry ?? 'PK',
      phone: initial.phone ?? '',
      city: initial.city ?? '',
      province: initial.province ?? '',
      institution: initial.institution ?? '',
      fieldOfStudy: initial.fieldOfStudy ?? '',
      profession: initial.profession ?? '',
      bio: initial.bio ?? ''
    }
  })

  const phoneCountry = watch('phoneCountry') ?? 'PK'
  const phoneValue = watch('phone') ?? ''
  const countryValue = watch('country') ?? 'PK'

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        const response = await fetch('/api/dashboard/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          setServerError(data?.error ?? 'Profile could not be saved.')
          return
        }

        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 4000)
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.firstName?.message}>
          <Input {...register('firstName')} />
        </Field>
        <Field label="Last name" required error={errors.lastName?.message}>
          <Input {...register('lastName')} />
        </Field>
        <CountryPhoneField
          country={phoneCountry}
          onCountryChange={iso2 => setValue('phoneCountry', iso2, { shouldValidate: true })}
          value={phoneValue}
          onChange={next => setValue('phone', next, { shouldDirty: true })}
          label="Mobile number"
          allowEmpty
          error={errors.phone?.message}
        />
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Country of residence</label>
          <CountryField
            value={countryValue}
            onChange={iso2 => setValue('country', iso2, { shouldDirty: true })}
          />
        </div>
        <Field label="City" error={errors.city?.message}>
          <Input {...register('city')} />
        </Field>
        <Field label="Province / Region" error={errors.province?.message}>
          <Select {...register('province')}>
            <option value="">Select region</option>
            {PROVINCES.map(province => (
              <option key={province} value={province}>
                {displayContent(province)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Profession" error={errors.profession?.message}>
          <Input {...register('profession')} />
        </Field>
        <Field label="Institution / University" error={errors.institution?.message}>
          <Input {...register('institution')} />
        </Field>
        <Field label="Field of study" error={errors.fieldOfStudy?.message}>
          <Input {...register('fieldOfStudy')} />
        </Field>
      </div>

      <Field
        label="Short biography"
        error={errors.bio?.message}
        hint="Up to 600 characters. Used internally for committee and mentorship matching."
      >
        <Textarea rows={5} {...register('bio')} />
      </Field>

      {displayContent(serverError ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {displayContent(serverError)}
        </p>
      ) : null)}

      {displayContent(saved ? (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={17} /> Profile updated.
        </p>
      ) : null)}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
          {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />)}
          {displayContent(isSubmitting ? 'Saving…' : 'Save changes')}
        </Button>
        {displayContent(!isDirty ? <span className="text-xs text-slate-500">No unsaved changes.</span> : null)}
      </div>
    </form>
  )
}
