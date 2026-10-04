import Link from 'next/link'
import { ArrowUpRight, Clock3, Mail, MapPin, Phone } from 'lucide-react'
import { Logo } from './logo'
import { displayContent } from '@/lib/display-content'
import { CONTACT_EMAILS, CONTACT_HOURS, CONTACT_PHONE, CONTACT_PHONE_E164, CONTACT_PHONE_LOCAL, CONTACT_WHATSAPP } from '@/lib/constants'
import { SOCIAL_PROFILES } from '@/lib/social'
import { SocialChannelLink } from '@/components/ui/social-link'
import { LiveStatus } from '@/components/experience/live-status'

const columns = [
  { title: 'The council', links: [['About PYPC','/about'],['Leadership','/leadership'],['Programmes','/programmes'],['Events','/events'],['Opportunities','/opportunities'],['Newsroom','/news'],['Impact & reports','/impact'],['Photo credits','/photo-credits']] },
  { title: 'Learn & participate', links: [['Certified courses','/courses'],['International students','/international'],['Research & services','/research'],['Partnerships & MoU','/partnerships'],['Records registry','/records'],['Visa invitation letter','/international/visa-letter']] },
  { title: 'Member services', links: [['Membership plans','/membership'],['Member dashboard','/dashboard'],['Verify a certificate','/verify'],['Support centre','/contact'],['System status','/status'],['Login','/login'],['Create account','/register']] },
  { title: 'Policies & help', links: [['Governance documents','/policies'],['Privacy policy','/privacy'],['Terms of use','/terms'],['Refund policy','/refund-policy'],['Cookie policy','/cookies'],['Code of conduct','/code-of-conduct'],['Accessibility','/accessibility'],['FAQs','/faq']] }
]

export function SiteFooter() {
  return <footer className="modern-footer bg-[#f7f4eb] text-primary-900">
    <div className="container">
      <div className="flex flex-col gap-6 border-b border-primary-900/15 py-10 md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Your next chapter starts here</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Learn. Participate. Lead.</h2></div>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex items-center gap-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white">Join PYPC <ArrowUpRight size={18} /></Link>
          <Link href="/contact" className="inline-flex items-center rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold">Contact secretariat</Link>
        </div>
      </div>
      <div className="grid gap-10 py-10 xl:grid-cols-[1.1fr_2.7fr]">
        <div>
          <Logo emblemSize={64} light />
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">A national, non partisan platform for youth leadership, parliamentary engagement, public policy, innovation and national impact.</p>
          <p className="mt-4 text-sm font-bold text-primary">Lead. Innovate. Reform. Inspire.</p>
          <p className="mt-2 text-xs leading-6 text-slate-600">National secretariat in Islamabad. Seven regions and campus circles nationwide.</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Official social channels">{SOCIAL_PROFILES.map(channel=><li key={channel.id}><SocialChannelLink channel={channel} showHandle={false} className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:border-primary" /></li>)}</ul>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {columns.map(column=><div key={column.title}><h2 className="text-xs font-bold uppercase tracking-[0.1em] text-primary-900">{column.title}</h2><ul className="mt-4 space-y-2.5">{column.links.map(([label,href])=><li key={href}><Link href={href} className="inline-block py-0.5 text-sm leading-6 text-slate-600 underline-offset-4 transition hover:text-primary hover:underline">{label}</Link></li>)}</ul></div>)}
        </nav>
      </div>
      <div className="grid gap-7 rounded-2xl border border-primary/10 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><MapPin size={16} /> Visit us</h2><p className="mt-3 text-sm text-slate-600">Islamabad, Pakistan</p><p className="mt-1 text-xs leading-6 text-slate-500">National secretariat</p></div>
        <div><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Phone size={16} /> Call or WhatsApp</h2><a href={`tel:${CONTACT_PHONE_E164}`} className="mt-3 block text-sm font-semibold hover:underline">{displayContent(CONTACT_PHONE)}</a><p className="mt-1 text-xs text-slate-500">{displayContent(CONTACT_PHONE_LOCAL)} within Pakistan</p><a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">Chat on WhatsApp <ArrowUpRight size={13} /></a></div>
        <div><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Mail size={16} /> Email us</h2><ul className="mt-3 space-y-2">{CONTACT_EMAILS.map(address=><li key={address}><a href={`mailto:${address}`} className="break-all text-sm text-slate-600 hover:underline">{address}</a></li>)}</ul></div>
        <div><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Clock3 size={16} /> Office hours</h2><p className="mt-3 text-sm leading-6 text-slate-600">{displayContent(CONTACT_HOURS)}</p><p className="mt-1 text-xs leading-6 text-slate-500">All countries served. We reply in your time zone.</p></div>
      </div>
      <div className="flex flex-col justify-between gap-4 py-6 pb-24 text-xs text-slate-500 sm:flex-row sm:items-center"><p>© {new Date().getFullYear()} Pakistan Youth Parliamentary Council. All rights reserved.<span className="mt-2 block">Empowering Youth. Shaping Policy. Building Pakistan.</span></p><LiveStatus className="!border-primary/20 !bg-white !text-primary" /></div>
    </div>
  </footer>
}
