'use client'


import { displayContent } from '@/lib/display-content'
import Image from 'next/image'
import { getSitePhoto } from '@/lib/site-photos'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CarouselSlide = {
  src: string
  title: string
  caption: string
  href?: string
  cta?: string
}

/**
 * Auto-rotating hero carousel with manual Prev/Next and dot controls, mirroring
 * the reference site's hero behaviour. Pauses on hover, respects
 * prefers-reduced-motion (no auto-advance) and keeps slides keyboard reachable.
 */
export function HeroCarousel({
  slides,
  interval = 6500,
  className,
  variant = 'contained'
}: {
  slides: CarouselSlide[]
  interval?: number
  className?: string
  variant?: 'contained' | 'backdrop'
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const next = useCallback(() => setIndex(current => (current + 1) % slides.length), [slides.length])

  useEffect(() => {
    if (paused || reduced) return
    const timer = window.setInterval(next, interval)
    return () => window.clearInterval(timer)
  }, [paused, reduced, next, interval])

  const active = slides[index]

  if (variant === 'backdrop') {
    return (
      <div
        className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
        aria-hidden="true"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, slideIndex) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt=""
            fill
            priority={slideIndex === 0}
            sizes="100vw"
            className={cn(
              'object-cover transition-opacity ease-out [transition-duration:1400ms]',
              slideIndex === index ? 'opacity-[0.28]' : 'opacity-0'
            )}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(6,38,30,0.94)_0%,rgba(6,38,30,0.82)_45%,rgba(3,23,18,0.92)_100%)]" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/12 bg-primary-900 shadow-elevated',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Featured PYPC highlights"
      aria-roledescription="carousel"
    >
      <div className="relative h-[320px] sm:h-[420px] lg:h-[480px]">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={displayContent(`${slideIndex + 1} of ${slides.length}`)}
            aria-hidden={slideIndex !== index}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000 ease-out',
              slideIndex === index ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
          >
            <Image
              src={slide.src}
              alt={displayContent(getSitePhoto(slide.src)?.alt ?? 'Illustrative photograph')}
              fill
              priority={slideIndex === 0}
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-900 via-primary-900/55 to-transparent" />
            

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold-300">
                {displayContent(String(slideIndex + 1).padStart(2, '0'))} / {displayContent(String(slides.length).padStart(2, '0'))}
              </p>
              <h3 className="mt-2 max-w-2xl text-xl font-extrabold leading-snug text-white sm:text-2xl lg:text-3xl">
                {displayContent(slide.title)}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-primary-100">{displayContent(slide.caption)}</p>

              {displayContent(slide.href ? (
                <Link
                  href={slide.href}
                  className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-bold text-primary-900 transition hover:bg-gold-400"
                >
                  {displayContent(slide.cta ?? 'Explore')} <ChevronRight size={16} />
                </Link>
              ) : null)}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => setPaused(current => !current)} className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-primary">{paused ? 'Resume carousel' : 'Pause carousel'}</button>

      <div className="flex items-center justify-center gap-2 bg-primary-900/95 py-3">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(slideIndex)}
            aria-label={displayContent(`Show slide: ${slide.title}`)}
            aria-current={slideIndex === index}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              slideIndex === index ? 'w-9 bg-gold-400' : 'w-3 bg-white/25 hover:bg-white/45'
            )}
          />
        ))}
        <span className="ml-3 hidden max-w-[280px] truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-200 sm:block">
          {displayContent(active.title)}
        </span>
      </div>
    </div>
  )
}
