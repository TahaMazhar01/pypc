
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { ProfileForm } from '@/components/dashboard/profile-form'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { requireUser } from '@/lib/auth'
import { formatDate, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Profile details</h2>
        <p className="mt-1 text-sm text-slate-600">
          Keep this accurate, the secretariat uses it for committee matching, programme shortlisting and
          certificate issuance.
        </p>

        <div className="mt-6">
          <ProfileForm
            initial={{
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone ?? '',
              city: user.city ?? '',
              province: user.province ?? '',
              institution: user.institution ?? '',
              fieldOfStudy: user.fieldOfStudy ?? '',
              profession: user.profession ?? '',
              bio: user.bio ?? ''
            }}
          />
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Role" value={humanise(user.role)} />
            <Row label="Status" value={humanise(user.status)} />
            <Row label="Member since" value={formatDate(user.createdAt)} />
            <Row label="Last sign-in" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'} />
          </dl>

          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            To change your email address or correct your CNIC, contact the secretariat, identity fields
            are protected to prevent certificate fraud.
          </p>
        </Card>

        <ResumeCard initialUrl={user.resumeUrl ?? null} />

        <Card className="border-primary-100 bg-primary-50">
          <h2 className="font-extrabold text-primary-900">Profile completeness</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <Check done={Boolean(user.phone)} label="Mobile number" />
            <Check done={Boolean(user.city)} label="City" />
            <Check done={Boolean(user.province)} label="Province / region" />
            <Check done={Boolean(user.institution)} label="Institution" />
            <Check done={Boolean(user.profession)} label="Profession" />
            <Check done={Boolean(user.bio)} label="Short biography" />
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{displayContent(label)}</dt>
      <dd className="max-w-[60%] truncate text-right font-bold text-slate-900">{displayContent(value)}</dd>
    </div>
  )
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
          done ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
        }`}
      >
        {displayContent(done ? '✓' : '•')}
      </span>
      {displayContent(label)}
    </li>
  )
}
