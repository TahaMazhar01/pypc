'use client'


import { displayContent } from '@/lib/display-content'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { THEME_MODES, type ThemeMode } from '@/lib/theme'
import { useTheme } from '@/components/theme/theme-provider'

const OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun; hint: string }[] = [
  { id: 'light', label: 'Light', icon: Sun, hint: 'Always use the light theme' },
  { id: 'dark', label: 'Dark', icon: Moon, hint: 'Always use the dark theme' },
  { id: 'system', label: 'System', icon: Monitor, hint: 'Follow my device setting' }
]

/**
 * Three-way theme switcher: Light · Dark · System.
 *
 * A radiogroup rather than a toggle, because "follow my device" is a genuine
 * third choice — and it stays live: changing the OS preference updates the site
 * immediately while System is selected.
 */
export function ThemeToggle({
  variant = 'full',
  className
}: {
  variant?: 'full' | 'compact'
  className?: string
}) {
  const { mode, resolved, setMode, ready } = useTheme()

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = THEME_MODES.indexOf(mode)
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setMode(THEME_MODES[(index + 1) % THEME_MODES.length])
      ;(event.currentTarget.children[(index + 1) % THEME_MODES.length] as HTMLElement)?.focus()
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = (index - 1 + THEME_MODES.length) % THEME_MODES.length
      setMode(THEME_MODES[next])
      ;(event.currentTarget.children[next] as HTMLElement)?.focus()
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5',
        className
      )}
    >
      {OPTIONS.map(option => {
        const Icon = option.icon
        const active = ready && mode === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={displayContent(`${option.label} theme`)}
            title={displayContent(option.hint)}
            data-theme-option={option.id}
            tabIndex={active || !ready ? 0 : -1}
            onClick={() => setMode(option.id)}
            className={cn(
              'focus-ring flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition',
              active
                ? 'bg-white text-primary-900 shadow-card'
                : 'text-slate-500 hover:text-primary',
              variant === 'compact' && 'px-2 py-1.5'
            )}
          >
            <Icon size={variant === 'compact' ? 15 : 14} aria-hidden="true" />
            <span className={cn(variant === 'compact' && 'sr-only')}>{displayContent(option.label)}</span>
            {displayContent(!ready ? <span className="sr-only">Loading theme</span> : null)}
          </button>
        )
      })}
      <span className="sr-only" aria-live="polite">
        {displayContent(ready
          ? mode === 'system'
            ? `System theme selected — currently ${resolved}.`
            : `${mode} theme selected.`
          : '')}
      </span>
    </div>
  )
}

/** Compact single-button flipper for tight spots (mobile header, dashboard rail). */
export function ThemeQuickToggle({ className }: { className?: string }) {
  const { resolved, mode, toggle } = useTheme()
  const Icon = resolved === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggle}
      title={displayContent(mode === 'system' ? 'Following your device — click to override' : 'Switch theme')}
      aria-label={displayContent(resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme')}
      className={cn(
        'focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:text-primary',
        className
      )}
    >
      <Icon size={17} />
    </button>
  )
}
