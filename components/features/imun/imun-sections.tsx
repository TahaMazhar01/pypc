
import { displayContent } from '@/lib/display-content'
/**
 * IMUN 2027 — section components.
 *
 * All six are presentational and take their content as props from
 * `lib/data/imun-2027.ts`, so the page file stays readable and the data can be
 * edited (or later moved into the database) without touching markup.
 *
 * Responsive rules they all follow: fluid type from the global utilities, grids
 * that start at one column, tables only where a `<caption>` makes them readable to
 * a screen reader, and no fixed widths.
 */

import Link from 'next/link'
import {
  Award,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Flag,
  Globe2,
  GraduationCap,
  Info,
  Leaf,
  MapPin,
  Minus,
  Mountain,
  Music,
  Palette,
  Users,
  type LucideIcon
} from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import {
  STATUS_LABEL,
  atAGlance,
  budgetLines,
  culturalProgramme,
  participation,
  timeline,
  venues,
  whyDifferent,
  workstreams,
  type ItemStatus
} from '@/lib/data/imun-2027'
import { countries } from '@/lib/data/countries'

/* -------------------------------------------------------------------------- */
/* Status chip                                                                */
/* -------------------------------------------------------------------------- */

const PAGE_ICONS: Record<string, LucideIcon> = {
  Award,
  CalendarDays,
  FileText,
  Flag,
  Globe2,
  GraduationCap,
  Leaf,
  MapPin,
  Mountain,
  Music,
  Palette,
  Users
}

function PageIcon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const Component = PAGE_ICONS[name] ?? Globe2
  return <Component size={size} className={className} aria-hidden />
}

const STATUS_STYLE: Record<ItemStatus, string> = {
  confirmed: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  'in-progress': 'border-sky-300 bg-sky-50 text-sky-900',
  planned: 'border-amber-300 bg-amber-50 text-amber-900'
}

export function StatusChip({ status, className = '' }: { status: ItemStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${STATUS_STYLE[status]} ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {displayContent(STATUS_LABEL[status])}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* At a glance                                                                */
/* -------------------------------------------------------------------------- */

export function AtAGlance() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {atAGlance.map((fact, index) => (
        <Reveal key={fact.label} delay={index * 40}>
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-5">
            <PageIcon name={fact.icon} size={18} className="text-gold-700" />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {displayContent(fact.label)}
            </p>
            <p className="mt-1 text-sm font-bold leading-6 text-primary-900">{displayContent(fact.value)}</p>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Flag parade — real country data, live delegation count                     */
/* -------------------------------------------------------------------------- */

const PARADE_REGIONS = [
  'South Asia',
  'Middle East & Central Asia',
  'Europe',
  'Americas',
  'Africa',
  'Asia & Pacific',
  'Oceania'
]

/**
 * The parade shows the countries PYPC actively recruits from, grouped by region,
 * using the same country catalogue that powers the phone field — so the flags,
 * names and codes are real and cannot drift from the rest of the site.
 *
 * `delegations` is read from the database at request time. When it is zero the
 * component says so instead of implying interest that has not been recorded.
 */
export function FlagParade({ delegations, countriesTarget }: { delegations: number; countriesTarget: number }) {
  const byRegion = PARADE_REGIONS.map(region => ({
    region,
    list: countries.filter(country => country.region === region).slice(0, 18)
  })).filter(group => group.list.length)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700">
          <Flag size={14} className="text-gold-700" />
          {displayContent(countriesTarget)} target
        </span>
        <span
          className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-900"
          data-live-delegations={delegations}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          {displayContent(delegations > 0
            ? `${delegations} delegation${delegations === 1 ? '' : 's'} registered`
            : 'Registration opens end October 2026')}
        </span>
      </div>

      <div className="mt-7 space-y-6">
        {byRegion.map(group => (
          <div key={group.region}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{displayContent(group.region)}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.list.map(country => (
                <li
                  key={country.iso2}
                  title={displayContent(`${country.name} (${country.dial})`)}
                  className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-gold-300 hover:bg-gold-50"
                >
                  <span aria-hidden className="text-base leading-none">
                    {displayContent(country.flag)}
                  </span>
                  <span className="max-w-[9rem] truncate">{displayContent(country.name)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-slate-600">
        <Info size={14} className="mt-1 shrink-0 text-slate-500" />
        These are the countries PYPC recruits from; the list is not a limit and any country can register.
        Names and flags come from the same catalogue that powers the registration phone field.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Venue comparison                                                           */
/* -------------------------------------------------------------------------- */

export function VenueCompare() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {venues.map((venue, index) => (
        <Reveal key={venue.name} delay={index * 60}>
          <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold leading-6 text-primary-900">{displayContent(venue.name)}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {displayContent(venue.location)} · {displayContent(venue.capacity)}
                </p>
              </div>
              <StatusChip status={venue.status} />
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Strengths</p>
            <ul className="mt-2 space-y-2">
              {venue.strengths.map(point => (
                <li key={point} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <Check size={15} className="mt-1 shrink-0 text-emerald-700" />
                  <span>{displayContent(point)}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">
              Still to confirm
            </p>
            <ul className="mt-2 space-y-2">
              {venue.considerations.map(point => (
                <li key={point} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <Minus size={15} className="mt-1 shrink-0 text-amber-700" />
                  <span>{displayContent(point)}</span>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Cultural programme                                                         */
/* -------------------------------------------------------------------------- */

export function CulturalProgramme() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {culturalProgramme.map((item, index) => (
        <Reveal key={item.title} delay={index * 50}>
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-800">
              <PageIcon name={item.icon} size={18} />
            </span>
            <h3 className="type-card-title mt-4 font-extrabold text-primary-900">{displayContent(item.title)}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">{displayContent(item.detail)}</p>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Budget breakdown                                                           */
/* -------------------------------------------------------------------------- */

export function BudgetBreakdown({ note }: { note: string }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        {/* Accessible bar chart: every bar carries its value as text, and the same
            figures are repeated in the table below for screen readers. */}
        <ul className="space-y-4">
          {budgetLines.map(line => (
            <li key={line.category}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">{displayContent(line.category)}</span>
                <span className="text-sm font-extrabold text-gold-800">{displayContent(line.share)}%</span>
              </div>
              <div
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
                role="img"
                aria-label={displayContent(`${line.category}: ${line.share} percent of the planning budget`)}
              >
                <div
                  className="h-full rounded-full bg-primary-700"
                  style={{ width: `${line.share}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{displayContent(line.detail)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-700">
          The figures, in words
        </h3>
        <div className="table-scroll">
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">
            Planned allocation of the IMUN 2027 budget by category, as percentages
          </caption>
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="pb-2">Category</th>
              <th scope="col" className="pb-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {budgetLines.map(line => (
              <tr key={line.category}>
                <th scope="row" className="py-2 pr-3 text-left font-semibold text-slate-800">
                  {displayContent(line.category)}
                </th>
                <td className="py-2 text-right font-bold text-slate-900">{displayContent(line.share)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300">
              <th scope="row" className="pt-2 text-left font-extrabold text-slate-900">Total</th>
              <td className="pt-2 text-right font-extrabold text-slate-900">
                {displayContent(budgetLines.reduce((sum, line) => sum + line.share, 0))}%
              </td>
            </tr>
          </tfoot>
        </table>
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-slate-700">
          <Info size={14} className="mt-0.5 shrink-0 text-slate-500" />
          {displayContent(note)}
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

export function Timeline() {
  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {timeline.map((entry, index) => (
        <li key={entry.milestone} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
              entry.status === 'confirmed'
                ? 'bg-emerald-600'
                : entry.status === 'in-progress'
                  ? 'bg-sky-600'
                  : 'bg-slate-400'
            }`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-800">{displayContent(entry.period)}</p>
            <StatusChip status={entry.status} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-800">{displayContent(entry.milestone)}</p>
          {displayContent(index === timeline.length - 1 ? null : <span className="sr-only">Next milestone</span>)}
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/* Workstreams — what is actually in flight                                   */
/* -------------------------------------------------------------------------- */

export function Workstreams() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workstreams.map((stream, index) => (
        <Reveal key={stream.name} delay={index * 30}>
          <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-extrabold leading-6 text-primary-900">{displayContent(stream.name)}</h3>
              <StatusChip status={stream.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{displayContent(stream.detail)}</p>
            <div className="mt-auto pt-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} /> Progress
                </span>
                <span>{displayContent(stream.progress)}%</span>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
                role="img"
                aria-label={displayContent(`${stream.name} is ${stream.progress} percent through its current phase`)}
              >
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${stream.progress}%` }} />
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Why IMUN 2027 is different                                                 */
/* -------------------------------------------------------------------------- */

export function WhyDifferent() {
  return (
    <>
      {/* Comparison table on wide screens, stacked cards on phones — same markup,
          so there is nothing to keep in sync. */}
      <div className="hidden lg:block">
        <div className="table-scroll">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 text-left text-sm">
          <caption className="sr-only">
            Dimension by dimension comparison of a standard Model UN conference and IMUN 2027
          </caption>
          <thead className="bg-primary-900 text-white">
            <tr>
              <th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.14em]">Dimension</th>
              <th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.14em]">Standard conference</th>
              <th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-[0.14em]">IMUN 2027</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {whyDifferent.map(row => (
              <tr key={row.dimension}>
                <th scope="row" className="px-5 py-4 align-top font-extrabold text-primary-900">
                  {displayContent(row.dimension)}
                </th>
                <td className="px-5 py-4 align-top text-slate-600">{displayContent(row.standard)}</td>
                <td className="px-5 py-4 align-top font-semibold text-slate-900">{displayContent(row.imun)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {whyDifferent.map(row => (
          <div key={row.dimension} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-800">{displayContent(row.dimension)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-bold text-slate-700">Standard: </span>
              {displayContent(row.standard)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-900">
              <span className="font-bold text-primary-900">IMUN 2027: </span>
              {displayContent(row.imun)}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Participation FAQ (shared with the page's own accordion)                   */
/* -------------------------------------------------------------------------- */

export function ParticipationList() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {participation.map((entry, index) => (
        <Reveal key={entry.question} delay={index * 40}>
          <details className="group h-full rounded-2xl border border-slate-200 bg-white p-5 open:border-gold-300">
            <summary className="focus-ring cursor-pointer list-none text-sm font-extrabold text-primary-900">
              <span className="flex items-start justify-between gap-4">
                {displayContent(entry.question)}
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 text-gold-700 transition group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-700">{displayContent(entry.answer)}</p>
          </details>
        </Reveal>
      ))}

      <div className="lg:col-span-2">
        <Link
          href="/contact"
          className="focus-ring inline-flex text-sm font-bold text-primary hover:underline"
        >
          Still have a question? Contact the IMUN 2027 secretariat →
        </Link>
      </div>
    </div>
  )
}
