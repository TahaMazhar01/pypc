
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { ContactForm } from '@/components/features/contact-form'
import { Card } from '@/components/ui/card'
import { SOCIAL_CHANNELS, SOCIAL_PROFILES } from '@/lib/social'
import { SocialChannelLink } from '@/components/ui/social-link'
import {
  CONTACT_EMAILS,
  CONTACT_HOURS,
  CONTACT_PHONE,
  CONTACT_PHONE_E164,
  CONTACT_PHONE_LOCAL,
  CONTACT_WHATSAPP
} from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact the Pakistan Youth Parliamentary Council secretariat about membership, programmes, events, partnerships or verification.'
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Speak to the PYPC secretariat"
        description="Questions about membership, programmes, events, partnerships or certificate verification? Send a message and the team will respond."
        breadcrumb={[{ label: 'Contact' }]}
      />

      <section className="container grid gap-10 py-14 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <h2 className="text-xl font-extrabold text-primary-900">Send a message</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your message is stored securely and routed to the secretariat. For certificate issues,
            include the certificate code so it can be traced immediately.
          </p>

          <div className="mt-7">
            <ContactForm />
          </div>
        </Card>

        <aside className="space-y-5">
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Direct contact</h3>

            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-bold text-slate-900">Email</span>
                  {CONTACT_EMAILS.map(address => (
                    <a
                      key={address}
                      href={`mailto:${address}`}
                      className="block break-all text-primary hover:underline"
                    >
                      {displayContent(address)}
                    </a>
                  ))}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Phone size={18} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block font-bold text-slate-900">Phone / WhatsApp</span>
                  <a href={`tel:${CONTACT_PHONE_E164}`} className="block text-primary hover:underline">
                    {displayContent(CONTACT_PHONE)}
                  </a>
                  <span className="block text-xs text-slate-500">
                    {displayContent(CONTACT_PHONE_LOCAL)}, the same line, local dialling
                  </span>
                  <a
                    href={CONTACT_WHATSAPP}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-slate-600 hover:text-primary hover:underline"
                  >
                    Message on WhatsApp →
                  </a>
                </span>
              </li>

              <li className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="block font-bold text-slate-900">Location</span>
                  <span className="text-slate-600">Islamabad, Pakistan</span>
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="block font-bold text-slate-900">Office hours</span>
                  <span className="text-slate-600">{displayContent(CONTACT_HOURS)}</span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Messages received outside these hours are answered on the next working day.
                  </span>
                </span>
              </li>
            </ul>
          </Card>

          <Card className="border-primary-100 bg-primary-50">
            <MessageSquare size={22} className="text-primary" />
            <h3 className="mt-3 font-extrabold text-primary-900">Members: use the dashboard</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Support requests raised from the dashboard are tracked with a reference and linked to your
              membership, applications and certificates, which makes resolution faster.
            </p>
            <Link href="/dashboard/support" className="mt-4 inline-flex text-sm font-bold text-primary hover:underline">
              Open member support →
            </Link>
          </Card>

          <Card>
            <h3 className="font-extrabold text-slate-900">Follow PYPC</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Official accounts only. These are the channels the secretariat publishes and answers, anything else claiming to be PYPC is not ours.
            </p>
            <ul className="mt-4 space-y-2.5">
              {SOCIAL_PROFILES.map(channel => (
                <li key={channel.id}>
                  <SocialChannelLink
                    channel={channel}
                    iconSize={16}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:text-primary aria-disabled:cursor-default"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
              <p className="font-bold text-slate-700">One handle, every platform</p>
              <p className="mt-1">
                The council uses <span className="font-bold text-primary">pypcofficial</span> on Instagram,
                Facebook and YouTube, and <span className="font-bold text-primary">pypcofficial@gmail.com</span>{displayContent(' ')}
                for mail, so an account is only ours if it carries that name. Anything else claiming to be
                PYPC is not.
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Prefer email or the phone? {displayContent(SOCIAL_CHANNELS.filter(c => c.id === 'email').map(c => c.handle).join(' · '))} · {displayContent(CONTACT_PHONE)}
            </p>
          </Card>

          <Card>
            <h3 className="font-extrabold text-slate-900">Certificate verification</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Employers and institutions do not need an account. Enter the certificate code on the
              verification page for an instant result.
            </p>
            <Link href="/verify" className="mt-4 inline-flex text-sm font-bold text-primary hover:underline">
              Verify a certificate →
            </Link>
          </Card>
        </aside>
      </section>
    </>
  )
}
