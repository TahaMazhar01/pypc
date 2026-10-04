'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

/**
 * Large emblem watermark used behind page headers.
 * Moves on a real z-axis as the user scrolls, giving hero sections depth.
 */
export function ParallaxEmblem({
  className = '',
  opacity = 0.1,
  size = 420
}: {
  className?: string
  opacity?: number
  size?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const node: HTMLDivElement = element

    let frame = 0
    let last = 0

    function update() {
      frame = 0
      const y = window.scrollY
      const translate = Math.min(y, 700) * 0.16
      const rotate = Math.min(y, 900) * 0.012
      node.style.transform = `perspective(1000px) translate3d(0, ${translate}px, -120px) rotate(${rotate}deg)`
      last = y
    }

    function onScroll() {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      void last
    }
  }, [])

  return (
    <div ref={ref} className={`pointer-events-none select-none will-change-transform ${className}`} aria-hidden="true">
      <Image
        src="/images/pypc-emblem.png"
        alt=""
        width={size}
        height={size}
        className="h-auto w-auto"
        style={{ width: size, opacity }}
      />
    </div>
  )
}
