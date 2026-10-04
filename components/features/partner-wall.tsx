'use client'


import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import Image from 'next/image'
import { getSitePhoto } from '@/lib/site-photos'
import { ArrowUpRight, Globe2, Handshake, Landmark, ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'

/**
 * Partner / institutional engagement wall.
 *
 * Only institutions with a documented relationship (a filed letter, a signed
 * template or an open sponsorship tier) appear here — nothing is listed as a
 * confirmed partner unless PYPC has the paperwork, and each tile links to the
 * corresponding record or page.
 */
const ENGAGEMENTS = [
  {
    name: 'National Defence University',
    photo: '/images/editorial/ndu-provided.webp',
    detail: 'Educational visit and collaborative academic webinar requested, ref PYPC/NDU/EDU-VISIT/2026/001',
    href: '/records#ndu-visit',
    icon: Landmark,
    status: 'Request submitted'
  },
  {
    name: 'Senate of Pakistan',
    photo: '/images/editorial/senate.webp',
    detail: 'Youth delegation visit requested through the office of the Deputy Chairman Senate, ref PYPC/SEN/EDU-VISIT/2026/001',
    href: '/records#senate-visit',
    icon: ShieldCheck,
    status: 'Request submitted'
  },
  {
    name: 'Pakistan-China Friendship Centre',
    photo: '/images/editorial/friendship-venue.webp',
    detail: 'Proposed IMUN 2027 venue in Islamabad — venue decision under review',
    href: '/conferences/imun-2027',
    icon: Globe2,
    status: 'Venue under review'
  },
  {
    name: 'Jinnah Convention Centre',
    photo: '/images/editorial/jinnah-venue.webp',
    detail: 'Alternative IMUN 2027 venue in Islamabad — decision under review',
    href: '/conferences/imun-2027',
    icon: Globe2,
    status: 'Venue under review'
  },
  {
    name: 'Partner universities & MUN societies',
    photo: '/images/editorial/pakistan-student-dialogue.webp',
    detail: 'MoU-governed collaboration: co-branded programmes, faculty participation, student chapters',
    href: '/partnerships',
    icon: Handshake,
    status: 'MoU open'
  },
  {
    name: 'IMUN 2027 sponsors',
    photo: '/images/editorial/islamabad.webp',
    detail: 'Platinum, Gold, Partner-institution and In-kind packages with named scholarship places',
    href: '/partnerships',
    icon: Handshake,
    status: 'Packages open'
  }
]

export function PartnerWall({ compact = false }: { compact?: boolean }) {
  return (
    <section className="relative isolate overflow-hidden border-y border-slate-100 bg-white py-16">
      <div className="bg-grid absolute inset-0 -z-10 opacity-40" />

      <div className="container">
        <Reveal>
          <div className="flex flex-col gap-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">
              Institutional engagement
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Built through documented, formal correspondence
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-600">
              PYPC works only through written requests and formal agreements. Every institution listed
              below is backed by a filed document with a reference number, and every status shown is the
              current position, not a claim of partnership.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENGAGEMENTS.map((item, index) => (
            <Reveal key={item.name} delay={index * 70} direction={index % 2 === 0 ? 'left' : 'right'}>
              <Link
                href={item.href}
                data-cursor="Open"
                className="engagement-photo-card group relative flex min-h-[440px] h-full flex-col overflow-hidden rounded-2xl bg-primary-900 p-5 transition hover:-translate-y-1 focus-visible:outline-gold-400"
              >
                <Image src={item.photo} alt={item.photo.includes('ndu-provided') ? 'National Defence University in Islamabad, photograph provided by PYPC' : getSitePhoto(item.photo)?.alt || ''} fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden="true" />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-900">{displayContent(item.status)}</span>
                </div>
                <div className="relative mt-auto px-1 pt-20 pb-1 text-white">
                  <item.icon size={23} className="mb-3 text-gold-200" />
                  <h3 className="text-xl font-extrabold leading-tight text-white">{displayContent(item.name)}</h3>
                  {!compact && <p className="mt-3 text-xs leading-6 text-white">{displayContent(item.detail)}</p>}
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-white">View record <ArrowUpRight size={16} /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Institutions wishing to partner formally can begin with the{displayContent(' ')}
          <Link href="/partnerships" className="font-bold text-primary underline decoration-gold-300">
            MoU process
          </Link>
          . PYPC never lists an organisation as a partner without a signed document.
        </p>
      </div>
    </section>
  )
}
