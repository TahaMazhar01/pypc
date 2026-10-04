
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'


export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumb,
  children
}: {
  eyebrow?: string
  title: string
  description?: string
  breadcrumb?: { label: string; href?: string }[]
  children?: React.ReactNode
}) {
  return (
    <section className="editorial-page-hero relative isolate overflow-hidden border-b border-primary-100 surface-page">
      <div className="container relative py-14 sm:py-16">
        {displayContent(breadcrumb?.length ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-1 text-xs font-semibold text-slate-500"
          >
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            {breadcrumb.map(item => (
              <span key={item.label} className="flex items-center gap-1">
                <ChevronRight size={13} />
                {displayContent(item.href ? (
                  <Link href={item.href} className="hover:text-primary">
                    {displayContent(item.label)}
                  </Link>
                ) : (
                  <span className="text-primary">{displayContent(item.label)}</span>
                ))}
              </span>
            ))}
          </nav>
        ) : null)}

        <Reveal>
          <div className="max-w-3xl">
            {displayContent(eyebrow ? (
              <p className="editorial-eyebrow">{displayContent(eyebrow)}</p>
            ) : null)}
            <h1 className="type-display mt-3 font-extrabold tracking-tight text-primary-900">
              {displayContent(title)}
            </h1>
            {displayContent(description ? (
              <p className="type-body mt-5 text-slate-600">{displayContent(description)}</p>
            ) : null)}
            {displayContent(children ? <div className="mt-7">{displayContent(children)}</div> : null)}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
