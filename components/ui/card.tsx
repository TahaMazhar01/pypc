
import { displayContent } from '@/lib/display-content'
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-slate-100 bg-white p-6 shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-extrabold text-slate-900', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-6 text-slate-600', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-5 flex items-center gap-3', className)} {...props} />
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'primary'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    gold: 'bg-gold-50 text-gold-700 border-gold-200',
    primary: 'bg-primary-50 text-primary border-primary-100'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
        tones[tone],
        className
      )}
      {...props}
    />
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary'
}: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ReactNode
  tone?: 'primary' | 'gold' | 'success' | 'danger'
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-50 text-primary',
    gold: 'bg-gold-50 text-gold-700',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-rose-50 text-rose-700'
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{displayContent(label)}</p>
        {displayContent(icon ? (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}>
            {displayContent(icon)}
          </span>
        ) : null)}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{displayContent(value)}</p>
      {displayContent(hint ? <p className="mt-1 text-xs text-slate-500">{displayContent(hint)}</p> : null)}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
      <h3 className="text-lg font-extrabold text-slate-900">{displayContent(title)}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{displayContent(description)}</p>
      {displayContent(action ? <div className="mt-5 flex justify-center">{displayContent(action)}</div> : null)}
    </div>
  )
}
