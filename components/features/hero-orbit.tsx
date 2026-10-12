'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { HERO_SLIDES } from '@/lib/homepage-defaults'
export type OrbitSlide = { image: string; title: string; category: string; photo: { src: string; alt: string } }

export function HeroOrbit({ slides = HERO_SLIDES }: { slides?: OrbitSlide[] }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (paused || hovered || focused || reduced) return
    const timer = window.setInterval(() => setActive(current => (current + 1) % slides.length), 6000)
    return () => window.clearInterval(timer)
  }, [paused, hovered, focused, reduced, slides.length])
  if (!slides.length) return null
  return <section className="hero-orbit" aria-label="Pakistan in focus" aria-roledescription="carousel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="hero-orbit-visual">
    <div className="hero-orbit-backdrop" aria-hidden="true" />
    <div className="hero-orbit-track" aria-hidden="true" />
    <div className="hero-orbit-main">
      {slides.map((slide, index) => <div key={slide.image} className={`hero-orbit-slide ${active === index ? 'is-active' : ''}`} aria-hidden={active !== index}>
        <Image unoptimized={slide.photo.src.startsWith('/api/media/')} src={slide.photo.src} alt={slide.photo.alt} fill priority={index === 0} sizes="(max-width: 640px) 75vw, (max-width: 1023px) 450px, 40vw" className={index === 1 ? 'object-contain bg-[#e4ece1] p-3' : 'object-cover'} />
      </div>)}
      <span className="hero-orbit-seal">Lead.<br />Inspire.</span>
    </div>
    <div className="hero-orbit-thumbnails" aria-label="Choose a featured image">
      {slides.map((slide, index) => <button key={slide.image} type="button" className={`hero-orbit-thumb hero-orbit-thumb-${index} ${active === index ? 'is-active' : ''}`} onClick={() => setActive(index)} aria-label={`Show ${slide.category}`} aria-pressed={active === index}>
        <Image unoptimized={slide.photo.src.startsWith('/api/media/')} src={slide.photo.src} alt="" fill sizes="80px" className="object-cover" />
      </button>)}
    </div>
    </div>
    <div className="hero-orbit-caption" aria-live={paused || reduced || focused ? 'polite' : 'off'} aria-atomic="true">
      <p>{slides[active % slides.length].category}</p><h2>{slides[active % slides.length].title}</h2>
    </div>
    {!reduced && <button type="button" className="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:left-1/3 focus:rounded-full focus:bg-white focus:px-4 focus:py-2" onClick={() => setPaused(!paused)}>{paused ? 'Play image slideshow' : 'Pause image slideshow'}</button>}
  </section>
}
