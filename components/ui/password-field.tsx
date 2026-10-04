'use client'


import { displayContent } from '@/lib/display-content'
import { useId, useState } from 'react'
import { AlertTriangle, Check, Eye, EyeOff, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { passwordContainsPersonalInfo, passwordRequirements, passwordStrength } from '@/lib/validation/password'

type Registration = {
  name?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onBlur?: React.ChangeEventHandler<HTMLInputElement>
  ref?: React.Ref<HTMLInputElement>
}

/**
 * Password input used by every form that asks for one.
 *
 * Why it exists: a password box should never answer "invalid input" without
 * saying what is wrong. This field shows the rules up front, ticks them off as
 * they are met, scores the strength, warns about Caps Lock, and lets the
 * visitor reveal what they typed — so a strong password is accepted first time
 * and a weak one is corrected before the form is even submitted.
 */
export function PasswordField({
  label,
  registration,
  value,
  error,
  hint,
  required,
  autoComplete = 'new-password',
  placeholder = '••••••••••',
  showRequirements = true,
  showMeter = true,
  id,
  autoFocus,
  personalTerms
}: {
  label: string
  /** The object returned by react-hook-form's `register('…')`. */
  registration: Registration
  /** Current value — the caller watches it so the meter can respond live. */
  value: string
  error?: string
  hint?: string
  required?: boolean
  autoComplete?: string
  placeholder?: string
  showRequirements?: boolean
  showMeter?: boolean
  id?: string
  autoFocus?: boolean
  /** Name / email / organisation: the password may not restate any of them. */
  personalTerms?: (string | null | undefined)[]
}) {
  const generatedId = useId()
  const fieldId = id ?? `password-${generatedId.replace(/[^a-zA-Z0-9-]/g, '')}`
  const helpId = `${fieldId}-help`
  const rulesId = `${fieldId}-rules`
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const personalHit = personalTerms?.length ? passwordContainsPersonalInfo(value, personalTerms) : null
  const rules = [
    ...passwordRequirements(value),
    ...(personalTerms?.length
      ? [
          {
            id: 'personal',
            label: 'Does not contain your name or email',
            met: value.length > 0 && !personalHit
          }
        ]
      : [])
  ]
  const strength = passwordStrength(value)
    // The personal-info rule is contextual, so it refines rather than replaces the score.
    const adjusted = personalHit ? { ...strength, score: (Math.min(strength.score, 2) as typeof strength.score), label: 'Weak' as const } : strength
  const metCount = rules.filter(rule => rule.met).length
  const showChecklist = showRequirements && (!error || value.length > 0)

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {displayContent(label)} {displayContent(required ? <span className="text-rose-600">*</span> : null)}
      </label>

      <div className="relative">
        <input
          {...registration}
          id={fieldId}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={displayContent(placeholder)}
          aria-invalid={Boolean(error)}
          aria-describedby={showChecklist ? rulesId : hint ? helpId : undefined}
          autoFocus={autoFocus}
          onKeyUp={event => {
            try {
              setCapsLock(event.getModifierState?.('CapsLock') ?? false)
            } catch {
              setCapsLock(false)
            }
          }}
          className={cn(
            'focus-ring h-11 w-full rounded-lg border bg-white px-3.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400',
            error ? 'border-rose-300' : 'border-slate-200'
          )}
        />

        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={displayContent(visible ? 'Hide password' : 'Show password')}
          aria-pressed={visible}
          className="focus-ring absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 transition hover:text-primary"
        >
          {displayContent(visible ? <EyeOff size={16} /> : <Eye size={16} />)}
        </button>
      </div>

      {displayContent(error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-rose-600">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{displayContent(error)}</span>
        </p>
      ) : capsLock ? (
        <p className="mt-1.5 text-xs font-semibold text-amber-800">
          Caps Lock is on, passwords are case sensitive.
        </p>
      ) : hint ? (
        <p id={helpId} className="mt-1.5 text-xs leading-5 text-slate-500">
          {displayContent(hint)}
        </p>
      ) : null)}

      {displayContent(showMeter && !showChecklist ? (
        <div className="mt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map(step => (
                <span
                  key={step}
                  className={cn(
                    'h-full flex-1 rounded-full transition-colors',
                    adjusted.score >= step
                      ? adjusted.score >= 4
                        ? 'bg-emerald-500'
                        : adjusted.score === 3
                          ? 'bg-gold-400'
                          : 'bg-rose-400'
                      : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
            <span
              className={cn(
                'w-20 text-right text-[11px] font-bold uppercase tracking-[0.08em]',
                adjusted.score >= 4 ? 'text-emerald-700' : adjusted.score === 3 ? 'text-gold-700' : 'text-rose-600'
              )}
              aria-live="polite"
            >
              {displayContent(strength.label)}
            </span>
          </div>
        </div>
      ) : null)}

      {displayContent(showChecklist ? (
        <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {displayContent(value.length === 0 ? 'A strong password needs' : `${metCount} of ${rules.length} rules met`)}
            </p>
            <span
              className={cn(
                'text-[11px] font-bold uppercase tracking-[0.08em]',
                adjusted.score >= 4
                  ? 'text-emerald-700'
                  : adjusted.score === 3
                    ? 'text-gold-700'
                    : 'text-slate-500'
              )}
              aria-live="polite"
            >
              {displayContent(adjusted.label)}
            </span>
          </div>

          <div className="mt-1.5 flex h-1.5 gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map(step => (
              <span
                key={step}
                className={cn(
                  'h-full flex-1 rounded-full transition-colors',
                  strength.score >= step
                    ? strength.score >= 4
                      ? 'bg-emerald-500'
                      : strength.score === 3
                        ? 'bg-gold-400'
                        : 'bg-rose-400'
                    : 'bg-slate-200'
                )}
              />
            ))}
          </div>

          <ul id={rulesId} className="mt-2 grid gap-1 sm:grid-cols-2">
            {rules.map(rule => (
              <li
                key={rule.id}
                className={cn(
                  'flex items-start gap-1.5 text-[11.5px] leading-5',
                  rule.met ? 'font-semibold text-emerald-700' : 'text-slate-500'
                )}
              >
                {displayContent(rule.met ? (
                  <Check size={13} className="mt-0.5 shrink-0" />
                ) : (
                  <X size={13} className="mt-0.5 shrink-0 text-slate-500" />
                ))}
                <span>{displayContent(rule.label)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null)}
    </div>
  )
}
