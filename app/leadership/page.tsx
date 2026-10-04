
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/layout/page-hero'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { humanise } from '@/lib/utils'
import { organiserPhilosophy, organiserVision, signatories } from '@/lib/data/imun-2027'

export const metadata: Metadata = {
  title: 'Leadership',
  description:
    'The PYPC national council, executive body, secretariat, standing committees and regional chapters.'
}

export const dynamic = 'force-dynamic'

const deskRoles = [
  {
    title: 'National Council',
    responsibility:
      'Sets strategic direction, approves programmes and budgets, and safeguards the organisation\u2019s non-partisan character and standards.'
  },
  {
    title: 'National Executive Body',
    responsibility:
      'Youth executives (15–35) who deliver programmes, lead standing committees and represent PYPC in national convenings.'
  },
  {
    title: 'National Secretariat',
    responsibility:
      'Administration, member services, records, payments reconciliation, certification and compliance.'
  },
  {
    title: 'Standing Committees',
    responsibility:
      'Policy, climate, AI and technology, human rights, entrepreneurship and justice reform working groups.'
  },
  {
    title: 'Regional Chapters',
    responsibility:
      'Seven geographic regions coordinating district-level activity, campus circles and regional convenings.'
  },
  {
    title: 'Advisory Panel',
    responsibility:
      'Senior practitioners and academics who review programme quality, research rigour and safeguarding practice.'
  }
]

export default async function LeadershipPage() {
  // Only members who have agreed to a public role are listed. The seed creates
  // the executive and administrator accounts used to operate the platform.
  const executives = await prisma.user.findMany({
    where: { role: { in: ['EXECUTIVE', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      city: true,
      province: true,
      profession: true
    }
  })

  return (
    <>
      <PageHero
        eyebrow="Leadership & governance"
        title="Structured, accountable and youth led"
        description="PYPC is governed by a national council, delivered by a youth executive body, and supported by a professional secretariat and advisory panel."
        breadcrumb={[{ label: 'Leadership' }]}
      />

      {/* Founding office — names and contact details as published by the
          organisation in the IMUN 2027 concept note signature block. */}
      <section className="container section-y">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Founding Office</p>
          <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
            Who leads the Council
          </h2>
          <p className="type-body mt-4 text-slate-700">
            PYPC&apos;s wider vision is articulated as “{displayContent(organiserVision)}” and its leadership philosophy as
            “{displayContent(organiserPhilosophy)}”.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {signatories.map(person => (
            <article key={person.name} className="rounded-2xl border border-gold-300 bg-gold-50 p-6">
              <p className="font-display text-xl leading-8 text-primary-900">{displayContent(person.name)}</p>
              <p className="mt-1 text-sm font-extrabold text-gold-800">{displayContent(person.role)}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-slate-600">
                {displayContent(person.organisation)}
              </p>

              <ul className="mt-4 space-y-1.5 text-sm">
                {person.phones.map(number => (
                  <li key={number}>
                    <a
                      href={`tel:+${number.replace(/[^0-9]/g, '')}`}
                      className="break-words font-semibold text-primary hover:underline"
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
          ))}
        </div>
      </section>

      <section className="container pb-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {deskRoles.map(role => (
            <Card key={role.title} className="h-full">
              <h2 className="text-lg font-extrabold text-primary-900">{displayContent(role.title)}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{displayContent(role.responsibility)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-primary-900">Platform office bearers</h2>
              <p className="mt-3 max-w-3xl text-slate-600">
                These are the accounts currently responsible for operating the PYPC platform. Official
                council names, photographs and designations are published when confirmed by the
                organisation, nothing is filled in with placeholder people.
              </p>
            </div>

            <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              Contact the secretariat
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {executives.map(person => (
              <div
                key={person.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
                    {displayContent(`${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase())}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-slate-900">
                      {displayContent(person.firstName)} {displayContent(person.lastName)}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wide text-gold-700">
                      {displayContent(humanise(person.role))}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600">
                  {displayContent(person.profession ?? 'Platform role')}
                  {displayContent(person.city ? ` · ${person.city}` : '')}
                  {displayContent(person.province ? `, ${person.province}` : '')}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Note for the organisation:</strong> add the confirmed national council members,
            office bearers and their designations to the database (or update this page) once the official
            list is issued. The platform never displays invented names or titles.
          </p>
        </div>
      </section>
    </>
  )
}
