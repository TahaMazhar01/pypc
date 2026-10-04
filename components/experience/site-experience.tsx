'use client'

import { useEffect } from 'react'
import {
  BackToTop

} from '@/components/experience/ambient'

/**
 * Smooth anchor scrolling without hijacking the whole page. Native
 * `scroll-behavior` is used (so wheel and touch stay untouched) and disabled for
 * visitors who prefer reduced motion.
 */
function SmoothAnchorScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.style.scrollBehavior = reduced ? 'auto' : 'smooth'

    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const id = anchor.getAttribute('href')?.slice(1)
      if (!id) return

      const target = document.getElementById(id)
      if (!target) return

      event.preventDefault()
      const top = target.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
      window.history.replaceState(null, '', `#${id}`)
    }

    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  return null
}

/**
 * Every page-wide experience layer, mounted once in the root layout.
 *
 * There is deliberately no full-screen preloader here.
 *
 * The version this replaces showed an overlay with a progress bar from the very
 * first paint, then unblocked itself only once `document.readyState` reached
 * "complete". In an embedded pane, on a slow connection, or whenever hydration
 * was delayed, that state never arrived — so the progress sat at its starting
 * figure and the overlay covered the entire page: "Loading platform 8%" on every
 * route, with a working site hidden underneath it. A loading screen that can
 * trap the visitor is worse than no loading screen.
 *
 * What replaced it: the page paints immediately, and where data genuinely takes a
 * moment, `app/loading.tsx` shows skeleton placeholders in the shape of the
 * content that is coming.
 */
export function SiteExperience() {
  return (
    <>

      <BackToTop />
      <SmoothAnchorScroll />
    </>
  )
}


