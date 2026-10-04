'use client'

import { useEffect, useRef, useState } from 'react'

/** True when WebGL is available in this browser. */
export function hasWebGL() {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Shared device-pixel-ratio policy: crisp on retina, capped so that low-power
 * mobile GPUs are not asked to render 4K canvases.
 */
export function rendererDpr() {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.6 : 2)
}

/** Round soft sprite used for particle points (avoids square dots). */
export function makeDotTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.65)')
  gradient.addColorStop(1, outer)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return canvas
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Tracks pointer position (-1..1) and scroll offset for parallax, using the
 * whole window so every 3D scene reacts consistently.
 */
export function usePointerParallax(strength = 1) {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(event: PointerEvent) {
      pointer.current.x = ((event.clientX / window.innerWidth) * 2 - 1) * strength
      pointer.current.y = ((event.clientY / window.innerHeight) * 2 - 1) * strength
    }

    function onTouch(event: TouchEvent) {
      const touch = event.touches[0]
      if (!touch) return
      pointer.current.x = ((touch.clientX / window.innerWidth) * 2 - 1) * strength
      pointer.current.y = ((touch.clientY / window.innerHeight) * 2 - 1) * strength
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [strength])

  return pointer
}

/** Mounts a canvas only when it is scrolled into view, then unmounts the scene. */
export function useInView<T extends HTMLElement>(rootMargin = '220px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) setInView(entry.isIntersecting)
      },
      { rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
