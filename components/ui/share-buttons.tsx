'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { FacebookIcon, LinkedInIcon, WhatsAppIcon, XIcon } from '@/components/ui/brand-icons'

/**
 * Share row for detail pages (events, programmes, opportunities, IMUN 2027).
 *
 * Uses each network's official share endpoint — a plain link, no SDK, no tracking
 * script — plus the Web Share API on phones. The canonical URL is resolved from
 * the current location at click time, so the same component works on every page
 * without being told where it is.
 */
type ShareButtonsProps = {
  /** Page title used as the share text. */
  title: string
  /** Optional absolute URL; defaults to the current page. */
  url?: string
  /** Compact variant for cards. */
  compact?: boolean
  className?: string
}

export function ShareButtons({ title, url, compact = false, className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  function target() {
    if (url) return url
    if (typeof window === 'undefined') return ''
    return window.location.href
  }

  const shareText = encodeURIComponent(title)
  const encodedUrl = () => encodeURIComponent(target())

  const networks = [
    {
      id: 'linkedin',
      label: 'Share on LinkedIn',
      Icon: LinkedInIcon,
      href: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl()}`
    },
    {
      id: 'facebook',
      label: 'Share on Facebook',
      Icon: FacebookIcon,
      href: () => `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl()}`
    },
    {
      id: 'x',
      label: 'Share on X',
      Icon: XIcon,
      href: () => `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl()}`
    },
    {
      id: 'whatsapp',
      label: 'Share on WhatsApp',
      Icon: WhatsAppIcon,
      href: () => `https://wa.me/?text=${shareText}%20${encodedUrl()}`
    }
  ]

  async function nativeShare() {
    const shareUrl = target()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl })
        return
      } catch {
        // The visitor dismissed the sheet — fall through to copying the link.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard blocked — the network buttons above still work.
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {displayContent(!compact ? (
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Share</span>
      ) : null)}

      {networks.map(network => (
        <a
          key={network.id}
          href={network.href()}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={displayContent(network.label)}
          title={displayContent(network.label)}
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary"
        >
          <network.Icon size={compact ? 14 : 16} />
        </a>
      ))}

      <button
        type="button"
        onClick={nativeShare}
        aria-label="Share this page"
        className="focus-ring flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-primary-200 hover:text-primary"
      >
        {displayContent(copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />)}
        {displayContent(copied ? 'Link copied' : 'Share')}
      </button>
    </div>
  )
}
