'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useRef, useState } from 'react'
import { useInView } from '@/components/three/utils'

/**
 * Animated statistic with a 3D flip-in entrance.
 *
 * IMPORTANT (round 7): the first render (server-rendered HTML + first paint +
 * no-JS / slow-hydration views such as embedded previews) shows the REAL value,
 * never 0. A count-up from zero only runs for stats that start below the fold
 * and are scrolled into view, and it always lands exactly on `value`.
 * Users who prefer reduced motion get the final number immediately.
 */
export function Counter({
  value,
  suffix = '',
  prefix = '',
  duration = 1600,
  decimals = 0
}: {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
}) {
  const { ref, inView } = useInView<HTMLSpanElement>('120px')
  // Start at the true value so SSR and first paint are correct, never "0".
  const [display, setDisplay] = useState(value)
  const started = useRef(false)
  const skipAnimation = useRef(false)

  useEffect(() => {
    // Visible at mount (hero stats) or reduced motion → keep the real value.
    const el = ref.current
    const visibleAtMount = el ? el.getBoundingClientRect().top < window.innerHeight : true
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (visibleAtMount || prefersReduced || value === 0) {
      skipAnimation.current = true
      setDisplay(value)
    }
  }, [ref, value])

  useEffect(() => {
    if (!inView || started.current || skipAnimation.current || value === 0) return
    started.current = true

    const start = performance.now()
    let frame = 0

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutExpo for a confident finish
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(progress === 1 ? value : value * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    setDisplay(0)
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration])

  const formatted = display.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return (
    <span ref={ref} className="inline-block tabular-nums">
      {displayContent(prefix)}
      {displayContent(formatted)}
      {displayContent(suffix)}
    </span>
  )
}
