'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { countries, type Country } from '@/lib/data/countries'

/**
 * Searchable country picker covering every country in the world.
 *
 * A native <select> with ~250 options is painful on desktop and unusable on
 * mobile, so this is a combobox: type to filter by name, ISO code or dialling
 * code; arrow keys and Enter work; Escape closes. The underlying form field is a
 * real <input type="hidden"> so existing form code keeps working.
 */

export type CountryFieldProps = {
  /** ISO alpha-2 code, e.g. "PK". */
  value: string
  onChange: (iso2: string) => void
  label?: string
  id?: string
  placeholder?: string
  className?: string
  buttonClassName?: string
  /** Show the dialling code next to the name (used by the phone field). */
  showDial?: boolean
  disabled?: boolean
  'aria-describedby'?: string
}

function filterCountries(query: string, showDial: boolean) {
  const needle = query.trim().toLowerCase()
  if (!needle) return countries

  return countries.filter(country => {
    if (country.name.toLowerCase().includes(needle)) return true
    if (country.iso2.toLowerCase() === needle) return true
    if (showDial && country.dialCode.includes(needle.replace('+', ''))) return true
    return country.region.toLowerCase().includes(needle)
  })
}

export function CountryField({
  value,
  onChange,
  label,
  id,
  placeholder = 'Select country',
  className,
  buttonClassName,
  showDial = false,
  disabled,
  'aria-describedby': ariaDescribedBy
}: CountryFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const selected = useMemo(
    () => countries.find(country => country.iso2 === value) ?? countries[0],
    [value]
  )

  const results = useMemo(() => filterCountries(query, showDial), [query, showDial])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(Math.max(0, results.findIndex(country => country.iso2 === selected?.iso2)))
      window.setTimeout(() => searchRef.current?.focus(), 20)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const node = listRef.current?.querySelectorAll('li')[highlight] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  function choose(country: Country) {
    onChange(country.iso2)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight(current => Math.min(current + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight(current => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const country = results[highlight]
      if (country) choose(country)
    } else if (event.key === 'Home') {
      setHighlight(0)
    } else if (event.key === 'End') {
      setHighlight(results.length - 1)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input type="hidden" name="countryIso" value={value} readOnly />

      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={displayContent(label ?? placeholder)}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'focus-ring flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 disabled:bg-slate-50 disabled:opacity-70',
          buttonClassName
        )}
      >
        <span className="text-base leading-none">{displayContent(selected?.flag)}</span>
        <span className="min-w-0 flex-1 truncate">
          {displayContent(selected?.name)}
          {displayContent(showDial && selected ? <span className="ml-1 text-slate-500">{displayContent(selected.dial)}</span> : null)}
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-slate-500 transition', open && 'rotate-180')} />
      </button>

      {displayContent(open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-elevated">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={15} className="shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setHighlight(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Search by country, code or +dial…"
              aria-label="Search countries"
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {displayContent(query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="rounded p-1 text-slate-500 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            ) : null)}
          </div>

          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {displayContent(results.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">
                No matching country. <button type="button" onClick={() => setQuery('')} className="font-bold text-primary">Clear search</button>
              </li>
            ) : (
              results.map((country, index) => {
                const isSelected = country.iso2 === selected?.iso2
                return (
                  <li key={country.iso2} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => choose(country)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
                        index === highlight ? 'bg-primary-50 text-primary' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span className="text-base leading-none">{displayContent(country.flag)}</span>
                      <span className="min-w-0 flex-1 truncate">{displayContent(country.name)}</span>
                      {displayContent(showDial ? <span className="font-mono text-xs text-slate-500">{displayContent(country.dial)}</span> : null)}
                      <span className="font-mono text-[10px] uppercase text-slate-500">{displayContent(country.iso2)}</span>
                      {displayContent(isSelected ? <Check size={15} className="text-gold-600" /> : null)}
                    </button>
                  </li>
                )
              })
            ))}
          </ul>

          <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
            {displayContent(results.length)} of {displayContent(countries.length)} countries
          </p>
        </div>
      ) : null)}
    </div>
  )
}
