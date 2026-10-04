'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useRef, useState } from 'react'

/**
 * Custom animated cursor: a precise dot plus a trailing ring that expands and
 * labels itself over interactive elements. Disabled entirely on touch devices
 * and under prefers-reduced-motion, where the native cursor is left alone.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isTouch || reduced) return

    setEnabled(true)
    document.documentElement.classList.add('has-custom-cursor')

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ring = { x: pointer.x, y: pointer.y }
    let frame = 0
    let pressed = false

    function onMove(event: PointerEvent) {
      pointer.x = event.clientX
      pointer.y = event.clientY

      const target = (event.target as HTMLElement | null)?.closest(
        'a, button, [role="button"], input, select, textarea, summary, label[for]'
      ) as HTMLElement | null

      if (target) {
        const label =
          target.getAttribute('data-cursor') ||
          target.getAttribute('aria-label') ||
          target.textContent?.trim().slice(0, 22) ||
          null
        setHoverLabel(label)
      } else {
        setHoverLabel(null)
      }
    }

    function onDown() {
      pressed = true
    }
    function onUp() {
      pressed = false
    }

    function render() {
      ring.x += (pointer.x - ring.x) * 0.16
      ring.y += (pointer.y - ring.y) * 0.16

      const dot = dotRef.current
      const ringEl = ringRef.current

      if (dot) dot.style.transform = `translate3d(${pointer.x - 4}px, ${pointer.y - 4}px, 0)`
      if (ringEl) {
        const scale = hoverLabel ? 2.5 : pressed ? 0.75 : 1
        ringEl.style.transform = `translate3d(${ring.x - 18}px, ${ring.y - 18}px, 0) scale(${scale})`
      }

      frame = requestAnimationFrame(render)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    frame = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      cancelAnimationFrame(frame)
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [hoverLabel])

  if (!enabled) return null

  return (
    <div className="no-print pointer-events-none fixed inset-0 z-[190] hidden lg:block" aria-hidden="true">
      <div
        ref={ringRef}
        className="absolute h-9 w-9 rounded-full border border-gold-400/70 transition-colors duration-200"
        style={{ backdropFilter: 'invert(6%)' }}
      />
      <div ref={dotRef} className="absolute h-2 w-2 rounded-full bg-gold-400" />
      {displayContent(hoverLabel ? (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-primary-900/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-100">
          {displayContent(hoverLabel)}
        </div>
      ) : null)}
    </div>
  )
}
