'use client'


import { displayContent } from '@/lib/display-content'
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CountryField } from '@/components/ui/country-field'
import { countries } from '@/lib/data/countries'
import { checkPhone, formatPhoneAsYouType } from '@/lib/validation/phone'

/**
 * Dial-code + phone number control.
 *
 * The country picker supplies the dialling code and, more importantly, the
 * numbering plan the number is validated against. Validation happens as the
 * visitor types, and the component reports both the E.164 value (what gets
 * stored) and the national formatting (what a human recognises).
 */
export function CountryPhoneField({
  country,
  onCountryChange,
  value,
  onChange,
  label,
  hint,
  error,
  required,
  id = 'phone',
  name = 'phone',
  autoComplete = 'tel-national',
  onValidityChange,
  allowEmpty = false
}: {
  country: string
  onCountryChange: (iso2: string) => void
  value: string
  onChange: (value: string) => void
  label?: string
  hint?: string
  error?: string
  required?: boolean
  id?: string
  name?: string
  autoComplete?: string
  onValidityChange?: (valid: boolean, e164?: string) => void
  /** Contact forms let people leave a number out entirely. */
  allowEmpty?: boolean
}) {
  const [touched, setTouched] = useState(false)

  const dialCode = useMemo(
    () => countries.find(item => item.iso2 === country)?.dial ?? '',
    [country]
  )

  const check = useMemo(() => {
    if (allowEmpty && !value.trim()) return { empty: true as const }
    return checkPhone(value, country)
  }, [value, country, allowEmpty])

  const isEmpty = 'empty' in check
  const isValid = !isEmpty && check.ok
  const message = isEmpty ? null : check.ok ? null : check.reason

  function handleChange(raw: string) {
    const formatted = formatPhoneAsYouType(raw, country)
    onChange(formatted)
    const result = allowEmpty && !formatted.trim() ? { ok: true as const } : checkPhone(formatted, country)
    onValidityChange?.(Boolean(result.ok), 'e164' in result ? result.e164 : undefined)
  }

  return (
    <div>
      {displayContent(label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
          {displayContent(label)} {displayContent(required ? <span className="text-rose-600">*</span> : null)}
        </label>
      ) : null)}

      <div className="flex gap-2">
        <CountryField
          value={country}
          onChange={iso2 => {
            onCountryChange(iso2)
            if (value) {
              const reformatted = formatPhoneAsYouType(value, iso2)
              onChange(reformatted)
              const result = checkPhone(reformatted, iso2)
              onValidityChange?.(result.ok, result.ok ? result.e164 : undefined)
            }
          }}
          showDial
          compact
          className="w-[112px] shrink-0"
          placeholder="Country"
          buttonClassName="!px-2"
          aria-describedby={`${id}-hint`}
        />

        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            name={name}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            value={value}
            required={required}
            aria-invalid={touched && !isValid && !isEmpty}
            aria-describedby={`${id}-hint`}
            onBlur={() => {
              setTouched(true)
              if (!isEmpty) onValidityChange?.(check.ok, check.ok ? check.e164 : undefined)
            }}
            onChange={event => handleChange(event.target.value)}
            placeholder="300 1234567"
            className={cn(
              'focus-ring h-11 w-full rounded-lg border bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400',
              touched && !isValid && !isEmpty ? 'border-rose-300' : 'border-slate-200'
            )}
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {displayContent(isEmpty || !touched ? null : isValid ? (
              <CheckCircle2 size={17} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={17} className="text-rose-500" />
            ))}
          </span>
        </div>
      </div>

      <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-500">
        {displayContent(touched && !isValid && !isEmpty ? (
          <span className="font-semibold text-rose-600">{displayContent(message)}</span>
        ) : isValid && check.ok ? (
          <span className="font-semibold text-emerald-700">
            {displayContent(check.international)}
          </span>
        ) : (
          hint ?? `Select your country, then enter the number without the country code (${dialCode}).`
        ))}
      </p>

      {displayContent(error ? <p className="mt-1.5 text-xs font-semibold text-rose-600">{displayContent(error)}</p> : null)}
    </div>
  )
}
