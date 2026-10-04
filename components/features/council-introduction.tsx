
import { displayContent } from '@/lib/display-content'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Phone } from 'lucide-react'
import { CONTACT_PHONE, CONTACT_PHONE_E164 } from '@/lib/constants'
import { buttonVariants } from '@/components/ui/button'

export function CouncilIntroduction() {
  return (
    <section className="section-y bg-white">
      <div className="container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="editorial-photo-collage">
          <div className="editorial-photo-main"><Image src="/images/editorial/pypc-community-group.webp" alt="Group of five people standing together, photograph provided by PYPC" fill quality={95} sizes="(max-width: 1023px) 92vw, 46vw" className="object-cover" /></div>
          <div className="editorial-photo-detail"><Image src="/images/editorial/pypc-office-conversation.webp" alt="Two people in conversation in an office, photograph provided by PYPC" fill quality={95} sizes="(max-width: 1023px) 74vw, 37vw" className="object-cover" /></div>
          <span className="editorial-photo-label">Participation. Purpose. Possibility.</span>
        </div>
        <div>
          <p className="editorial-eyebrow">Welcome to PYPC</p>
          <h2 className="type-section mt-4 font-extrabold tracking-tight text-slate-900">A clear path from learning to leadership.</h2>
          <p className="mt-6 text-base leading-8 text-slate-600">Pakistan Youth Parliamentary Council is a national, non partisan platform dedicated to youth leadership, parliamentary engagement, public policy, innovation and national impact.</p>
          <p className="mt-4 text-base leading-8 text-slate-600">PYPC membership creates a structured pathway to programmes, opportunities, participation records and verified documentation.</p>
          <div className="mt-8 flex flex-wrap items-center gap-7">
            <Link href="/about" className={buttonVariants({ variant: 'gold', size: 'lg' })}>Discover the council <ArrowRight size={16} /></Link>
            <a href={`tel:${CONTACT_PHONE_E164}`} className="flex items-center gap-3 text-sm font-semibold text-primary"><Phone size={25} strokeWidth={1.5} /><span><span className="block text-xs font-normal text-slate-500">Talk to the secretariat</span>{displayContent(CONTACT_PHONE)}</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}
