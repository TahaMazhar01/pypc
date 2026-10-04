
import { displayContent } from '@/lib/display-content'
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'focus-ring w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-6 text-slate-900 placeholder:text-slate-400',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900',
      className
    )}
    {...props}
  >
    {displayContent(children)}
  </select>
))
Select.displayName = 'Select'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  required
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {displayContent(label)}
        {displayContent(required ? <span className="ml-1 text-rose-600">*</span> : null)}
      </label>
      {displayContent(children)}
      {displayContent(hint && !error ? <p className="text-xs text-slate-500">{displayContent(hint)}</p> : null)}
      {displayContent(error ? (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {displayContent(error)}
        </p>
      ) : null)}
    </div>
  )
}
