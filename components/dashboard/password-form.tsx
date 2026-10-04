'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { passwordSchema } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/password-field'

type PasswordInput = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function PasswordForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) })

  const newPasswordValue = watch('newPassword') ?? ''
  const confirmPasswordValue = watch('confirmPassword') ?? ''

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="font-bold text-emerald-800">Password updated</p>
        <p className="mt-2 text-sm text-emerald-800">
          For security, all sessions (including this one) were signed out. Please sign in again with your
          new password.
        </p>
        <Button className="mt-4" size="md" onClick={() => router.push('/login')}>
          Go to sign in
        </Button>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        const response = await fetch('/api/dashboard/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          setServerError(data?.error ?? 'Password could not be updated.')
          return
        }

        reset()
        setDone(true)
        router.refresh()
      })}
    >
      <Field label="Current password" required error={errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
      </Field>

      <PasswordField
        label="New password"
        required
        registration={register('newPassword')}
        value={newPasswordValue}
        error={errors.newPassword?.message}
      />

      <PasswordField
        label="Confirm new password"
        required
        registration={register('confirmPassword')}
        value={confirmPasswordValue}
        error={errors.confirmPassword?.message}
        hint={
          confirmPasswordValue && confirmPasswordValue === newPasswordValue
            ? 'Both passwords match.'
            : 'Type the new password again.'
        }
        showRequirements={false}
        showMeter={false}
      />

      {displayContent(serverError ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {displayContent(serverError)}
        </p>
      ) : null)}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />)}
        {displayContent(isSubmitting ? 'Updating…' : 'Update password')}
      </Button>
    </form>
  )
}
