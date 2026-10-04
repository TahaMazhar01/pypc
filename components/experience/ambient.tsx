'use client'


import { displayContent } from '@/lib/display-content'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowUp, Mail, Linkedin, Facebook, Instagram, Youtube } from 'lucide-react'
import { SOCIAL_CHANNELS } from '@/lib/social'
import { brandIconRegistry } from '@/components/ui/brand-icons'

/**
 * Ambient experience layer: noise + grid overlays for depth, a scroll progress
 * bar, a back-to-top control and the fixed social rail.
 */

export function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      className="noise-overlay pointer-events-none fixed inset-0 z-[120]"
    />
  )
}

export function GridOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(15,76,58,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,76,58,0.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(120%_90%_at_50%_0%,black,transparent_72%)]"
    />
  )
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0)
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="no-print fixed inset-x-0 top-0 z-[150] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary-400 via-gold-400 to-gold-200 transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  )
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      setVisible(window.scrollY > 700)
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <button
      type="button"
      aria-label="Back to top"
      data-cursor="Top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`no-print focus-ring fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-primary text-white shadow-soft hover-lift transition-all duration-300 hover:bg-primary-800 sm:left-5 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  )
}

/** Fixed social rail: hidden on small screens, invisible until the hero is passed. */
export function SocialRail() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 420)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const icons: Record<string, typeof Linkedin> = {
    linkedin: Linkedin,
    facebook: Facebook,
    instagram: Instagram,
    youtube: Youtube,
    email: Mail
  }

  return (
    <aside
      aria-label="Official channels"
      className={`no-print fixed left-4 top-1/2 z-[80] hidden -translate-y-1/2 flex-col items-center gap-3 transition-opacity duration-500 xl:flex ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="mb-1 h-10 w-px bg-gradient-to-b from-transparent to-gold-400/70" />

      {SOCIAL_CHANNELS.map(channel => {
        // Social marks come from the brand set (Lucide ships no company logos);
        // mail/phone fall back to the Lucide registry. A channel that is not
        // published yet renders as a non-clickable mark, never a dead link.
        const IconComponent =
          brandIconRegistry[channel.id as keyof typeof brandIconRegistry] ?? icons[channel.id] ?? Mail
        const pending = channel.status === 'pending'

        return (
          <a
            key={channel.id}
            href={pending ? undefined : channel.href}
            target={channel.href.startsWith('http') && !pending ? '_blank' : undefined}
            rel="noreferrer noopener"
            aria-label={displayContent(channel.label)}
            aria-disabled={pending || undefined}
            data-cursor={channel.short}
            data-channel-status={channel.status}
            className={`focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-gold-300 hover:text-primary ${
              pending ? 'cursor-default opacity-70 hover:translate-y-0' : ''
            }`}
          >
            <IconComponent size={15} />
          </a>
        )
      })}

      <span className="mt-1 h-10 w-px bg-gradient-to-t from-transparent to-gold-400/70" />
    </aside>
  )
}

/** Small floating brand chip used on the dashboard/admin shells. */
export function BrandChip() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 lg:flex">
      <Image src="/images/pypc-emblem-256.png" alt="" width={20} height={20} className="h-5 w-5" />
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Official platform
      </span>
    </div>
  )
}
