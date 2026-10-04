'use client'

/**
 * ViewportSync — the layout reacts to the device in real time.
 *
 * `dvh`/`clamp()` already make the CSS fluid; this component covers what CSS
 * cannot do on its own:
 *
 *   1. Publishes `--vh` (1% of the live viewport height) so older mobile
 *      browsers that ignore `dvh` still get a correct full-height layout, and
 *      re-writes it on every resize/orientation change — in real time, without
 *      a layout-thrashing loop (updates are coalesced into one animation frame).
 *   2. Publishes `data-viewport="xs|sm|md|lg|xl"` on <html>, so CSS and any
 *      component can respond to the current breakpoint itself rather than only
 *      through media queries.
 *   3. Emits a `pypc:breakpoint` event on every change, which the mobile
 *      navigation listens to so an open menu closes the instant the phone is
 *      rotated or the window is widened — instead of floating over the desktop
 *      layout.
 *   4. Also emits `pypc:resize` (throttled to animation frames) for anything
 *      that needs to re-measure, e.g. the 3D hero canvas.
 */

import { useEffect } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

function breakpointFor(width: number): Breakpoint {
  if (width < 640) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1280) return 'lg'
  return 'xl'
}

declare global {
  interface WindowEventMap {
    'pypc:breakpoint': CustomEvent<{ size: Breakpoint; width: number }>
    'pypc:resize': CustomEvent<{ width: number; height: number }>
  }
}

export function ViewportSync() {
  useEffect(() => {
    const root = document.documentElement
    let frame = 0
    let lastSize: Breakpoint | null = null

    function apply() {
      frame = 0
      const width = window.innerWidth
      const height = window.innerHeight

      // 1. CSS fallback for browsers without `dvh`.
      root.style.setProperty('--vh', `${height * 0.01}px`)

      // 2 + 3. Breakpoint changes are rare; only react when they actually change.
      const size = breakpointFor(width)
      if (size !== lastSize) {
        lastSize = size
        root.dataset.viewport = size
        window.dispatchEvent(new CustomEvent('pypc:breakpoint', { detail: { size, width } }))
      }

      // 4. Re-measure hook for animations.
      window.dispatchEvent(new CustomEvent('pypc:resize', { detail: { width, height } }))
    }

    function schedule() {
      if (frame) return
      frame = window.requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('orientationchange', schedule)
    // visualViewport fires when the on-screen keyboard opens, which changes the
    // usable height on mobile without a window resize event.
    window.visualViewport?.addEventListener('resize', schedule)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [])

  return null
}
