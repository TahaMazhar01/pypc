'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Marks the most relevant parent section as active while the reader scrolls
 * through a long single-page style narrative (home page sections, conference
 * landing pages). Children are plain anchors with `data-spy` ids.
 */
export function ScrollSpyNav({
  sections,
  className
}: {
  sections: { id: string; label: string }[]
  className?: string
}) {
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const elements = sections
      .map(section => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] }
    )

    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav aria-label="Section navigation" className={cn('flex flex-wrap gap-2', className)}>
      {sections.map(section => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? 'true' : undefined}
          className={cn(
            'focus-ring rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition',
            active === section.id
              ? 'border-gold-400/60 bg-gold-500/15 text-gold-200'
              : 'border-white/15 text-primary-100 hover:border-white/35 hover:text-white'
          )}
        >
          {displayContent(section.label)}
        </a>
      ))}
    </nav>
  )
}

/** Simple wrapper that adds the id + scroll offset for spied sections. */
export function SpiedSection({
  id,
  children,
  className
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-24', className)}>
      {displayContent(children)}
    </section>
  )
}
