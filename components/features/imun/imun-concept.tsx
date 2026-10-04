
import { displayContent } from '@/lib/display-content'
/**
 * IMUN 2027 — concept-note sections.
 *
 * These components render the concept note itself, in order, from
 * `lib/data/imun-2027.ts`. Nothing is paraphrased: the paragraphs on the page are
 * the paragraphs in the document, so there is exactly one place to edit and no way
 * for the page and the note to disagree.
 */

import { Check, FileText, Quote } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import {
  agendaTopics,
  atAGlanceFull,
  climateFrameworks,
  closingVision,
  conceptSections,
  currentStatus,
  organiserPhilosophy,
  organiserVision,
  participantGroups,
  programmeDays,
  signatories
} from '@/lib/data/imun-2027'
import { StatusChip } from './imun-sections'

/* -------------------------------------------------------------------------- */
/* The ten headline facts                                                     */
/* -------------------------------------------------------------------------- */

export function AtAGlanceFull() {
  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {atAGlanceFull.map((fact, index) => (
        <Reveal key={fact.label} delay={index * 30}>
          <div className="border-l-2 border-gold-400 pl-4">
            <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{displayContent(fact.label)}</dt>
            <dd className="mt-1 text-sm font-bold leading-6 text-primary-900 sm:text-base">{displayContent(fact.value)}</dd>
          </div>
        </Reveal>
      ))}
    </dl>
  )
}

/* -------------------------------------------------------------------------- */
/* Who can take part + the agenda topics                                      */
/* -------------------------------------------------------------------------- */

export function ParticipantGroups() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {participantGroups.map(group => (
        <li key={group} className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
          <Check size={16} className="mt-0.5 shrink-0 text-emerald-700" />
          <span className="text-sm font-semibold leading-6 text-slate-800">{displayContent(group)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AgendaTopics() {
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {agendaTopics.map(topic => (
          <li
            key={topic}
            className="rounded-full border border-azure-200 bg-azure-50 px-3.5 py-1.5 text-xs font-semibold text-azure-800"
          >
            {displayContent(topic)}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {climateFrameworks.map(framework => (
          <div key={framework.code} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-extrabold text-navy-900">{displayContent(framework.code)}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{displayContent(framework.name)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Programme — the three days                                                 */
/* -------------------------------------------------------------------------- */

export function ProgrammeDays() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {programmeDays.map((day, index) => (
        <Reveal key={day.day} delay={index * 60}>
          <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-navy-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              {displayContent(day.day)}
            </p>
            <h3 className="type-card-title mt-4 font-extrabold text-primary-900">{displayContent(day.title)}</h3>

            <ul className="mt-4 space-y-2">
              {day.items.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <Check size={15} className="mt-1 shrink-0 text-gold-700" />
                  <span>{displayContent(item)}</span>
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
/* The concept note, section by section                                       */
/* -------------------------------------------------------------------------- */

export function ConceptNote() {
  return (
    <div className="space-y-10">
      {conceptSections.map((section, index) => (
        <Reveal key={section.id} delay={index * 30}>
          <article id={section.id} className="scroll-mt-24 border-l-2 border-slate-200 pl-5 sm:pl-7">
            <div className="flex flex-wrap items-center gap-3">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-sm font-extrabold text-white"
              >
                {displayContent(section.number)}
              </span>
              <h3 className="type-card-title font-extrabold text-primary-900">{displayContent(section.title)}</h3>
              <StatusChip status={section.status} />
            </div>

            {section.paragraphs.map(paragraph => (
              <p key={paragraph.slice(0, 40)} className="type-body mt-4 text-slate-700">
                {displayContent(paragraph)}
              </p>
            ))}

            {displayContent(section.bullets?.length ? (
              <ul className="mt-4 space-y-2">
                {section.bullets.map(bullet => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm leading-7 text-slate-700">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                    <span>{displayContent(bullet)}</span>
                  </li>
                ))}
              </ul>
            ) : null)}
          </article>
        </Reveal>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Current status — the workstreams already under way                         */
/* -------------------------------------------------------------------------- */

export function CurrentStatusList() {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {currentStatus.map(item => (
        <li
          key={item}
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5"
        >
          <Check size={15} className="mt-0.5 shrink-0 text-emerald-800" />
          <span className="text-sm font-semibold leading-6 text-emerald-950">{displayContent(item)}</span>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Vision, closing statement and signatures                                   */
/* -------------------------------------------------------------------------- */

export function VisionAndSignatories() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <div className="rounded-3xl border border-gold-300 bg-gold-50 p-6">
          <Quote size={20} className="text-gold-700" />
          <p className="mt-3 font-display text-xl leading-9 text-primary-900 sm:text-2xl">{displayContent(closingVision)}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700">
            Vision: “{displayContent(organiserVision)}”
          </span>
          <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700">
            Philosophy: “{displayContent(organiserPhilosophy)}”
          </span>
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-slate-600">
          <FileText size={14} className="mt-1 shrink-0 text-slate-500" />
          Source: PYPC/IMUN/2027/CN 01, confidential concept note, four pages, published here in
          summary with the organisation&apos;s authorisation. Registration, venue and budget remain
          subject to the approvals described above.
        </p>
      </div>

      <div className="space-y-5">
        {signatories.map(person => (
          <Reveal key={person.name}>
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-base font-extrabold text-primary-900">{displayContent(person.name)}</p>
              <p className="mt-1 text-sm font-semibold text-gold-800">{displayContent(person.role)}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-slate-500">
                {displayContent(person.organisation)}
              </p>

              <ul className="mt-4 space-y-1.5 text-sm">
                {person.phones.map(number => (
                  <li key={number}>
                    <a
                      href={`tel:+${number.replace(/[^0-9]/g, '')}`}
                      className="break-words text-primary hover:underline"
                    >
                      {displayContent(number)}
                    </a>
                  </li>
                ))}
                {person.emails.map(address => (
                  <li key={address}>
                    <a href={`mailto:${address}`} className="break-all text-primary hover:underline">
                      {displayContent(address)}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
