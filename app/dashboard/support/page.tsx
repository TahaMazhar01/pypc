
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LifeBuoy, Mail, MessageSquare, ShieldCheck } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { ContactForm } from '@/components/features/contact-form'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { CONTACT_EMAIL } from '@/lib/constants'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Support' }
export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const user = await requireUser()

  const messages = await prisma.contactMessage.findMany({
    where: { email: user.email },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <LifeBuoy size={19} className="text-primary" /> Raise a support request
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Submitting from here links your request to your member account and email (
          <span className="font-semibold">{displayContent(user.email)}</span>), which speeds up resolution for
          membership, payment and certificate issues.
        </p>

        <div className="mt-6">
          <ContactForm />
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="border-primary-100 bg-primary-50">
          <MessageSquare size={20} className="text-primary" />
          <h2 className="mt-3 font-extrabold text-primary-900">Fastest answers</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>
              • Ask the <strong>AI Assistant</strong> (bottom right) for membership, programme or
              verification questions, it answers from official PYPC information.
            </li>
            <li>
              • Read the{displayContent(' ')}
              <Link href="/faq" className="font-bold text-primary hover:underline">
                FAQ
              </Link>{displayContent(' ')}
              for payment, refund and certificate questions.
            </li>
            <li>
              • For payment issues, include your <strong>order reference</strong> (PYPC ORD …).
            </li>
            <li>
              • For certificate issues, include the <strong>certificate code</strong> (PYPC XXXX …).
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
            <Mail size={17} className="text-primary" /> Direct email
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-primary hover:underline">
              {displayContent(CONTACT_EMAIL)}
            </a>
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            The secretariat responds within two working days. Safeguarding or conduct concerns are treated
            confidentially and urgently.
          </p>
        </Card>

        <Card>
          <h2 className="font-extrabold text-slate-900">Your recent requests</h2>
          <div className="mt-4 space-y-3">
            {displayContent(messages.length ? (
              messages.map(message => (
                <div key={message.id} className="rounded-xl border border-slate-100 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">{displayContent(message.subject)}</p>
                    <Badge tone={message.status === 'RESOLVED' ? 'success' : message.status === 'IN_PROGRESS' ? 'info' : 'neutral'}>
                      {displayContent(humanise(message.status))}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{displayContent(formatDateTime(message.createdAt))}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No support requests on record yet.</p>
            ))}
          </div>
        </Card>

        <Card className="bg-slate-50">
          <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
            <ShieldCheck size={17} className="text-primary" /> Report a conduct concern
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            PYPC takes harassment and safeguarding seriously. Review the{displayContent(' ')}
            <Link href="/code-of-conduct" className="font-bold text-primary hover:underline">
              Code of Conduct
            </Link>{displayContent(' ')}
            and report concerns directly to the secretariat.
          </p>
          <Link
            href="/code-of-conduct"
            className={buttonVariants({ variant: 'outline', size: 'md', className: 'mt-4' })}
          >
            Read the Code of Conduct
          </Link>
        </Card>
      </div>
    </div>
  )
}
