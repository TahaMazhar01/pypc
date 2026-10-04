
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { HeroOrbit } from '@/components/features/hero-orbit'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

import { LiveActivityBar } from '@/components/features/live-activity-bar'

export type HeroStats = { members: number; certificates: number; programmes: number; events: number; opportunities: number }

/** Original hero information, presented as a calm editorial opening. */
export function HomeHero3D({ stats }: { stats: HeroStats }) {
  const metrics = [{label:'Member target',value:'5,000',fallback:'Founding cohort'}, {label:'Programme target',value:'25',fallback:'First cohort open'}, {label:'Certificate target',value:'70+',fallback:'Issued on completion'}, {label:'Event target',value:'100+',fallback:'Calendar soon'}]
  return (
    <section className="editorial-hero">
      <div className="container editorial-hero-grid">
        <div className="editorial-hero-copy">
          <p className="editorial-eyebrow"><ShieldCheck size={16} /> National, non partisan youth platform</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Pakistan Youth Parliamentary Council</p>
          <h1>Empowering young leaders.<br /><span>Shaping Pakistan&apos;s future.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">A full national institution in your browser: parliamentary practice, public policy, climate action, AI and technology, fellowships and QR verified certification, delivered on one live platform.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>Begin your journey <ArrowRight size={17} /></Link>
            <Link href="/programmes" className={buttonVariants({ variant: 'outline', size: 'lg' })}>Explore programmes</Link>
          </div>
          <nav aria-label="Explore participation" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-primary">
            <Link href="/conferences">Conferences ↗</Link><Link href="/courses">Courses ↗</Link><Link href="/international">International ↗</Link>
          </nav>
        </div>
        <HeroOrbit />
      </div>
      <div className="container">
        <p className="mt-5 text-xs text-slate-500">Our ambition: 5,000 members, 25 programmes, 70+ certificates and 100+ events. These are future targets.</p><dl className="editorial-metrics">{metrics.map(item => <div key={item.label}><dd>{displayContent(typeof item.value === 'string' || item.value > 0 ? item.value : item.fallback)}</dd><dt>{displayContent(item.label)}</dt></div>)}</dl>
        <p className="editorial-open"><strong>Now open:</strong> IMUN 2027 delegate interest · six certified courses · visa invitation letters · research collaborations · seven regional chapters</p>
      </div>
      <div className="editorial-live"><LiveActivityBar /></div>
      <div className="container editorial-topics">{['Youth Parliament', 'Climate Action', 'AI & Technology', 'Human Rights', 'Entrepreneurship', 'Leadership Fellowships', 'Justice Reform', 'Campus Circles', 'Regional Chapters'].map(item => <span key={item}>{displayContent(item)}</span>)}</div>
    </section>
  )
}
