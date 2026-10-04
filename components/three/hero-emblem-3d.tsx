'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  clamp,
  easeInOutCubic,
  lerp,
  makeDotTexture,
  prefersReducedMotion,
  rendererDpr,
  smoothstep,
  usePointerParallax
} from './utils'

/**
 * The 3D PYPC emblem.
 *
 * One particle system morphs continuously through a sequence of solid 3D forms
 * (disc → cube → sphere → flat plane) and then settles into a glowing frame
 * behind the real, officially approved PYPC logo — which is rendered as an
 * extruded 14-layer slab so the emblem itself is genuinely three-dimensional
 * and reacts to cursor movement, scroll and touch.
 */

const PARTICLE_COUNT_DESKTOP = 14000
const PARTICLE_COUNT_MOBILE = 6000
const LOGO_TEXTURE = '/images/pypc-emblem.png'

type Shape = Float32Array

function makeDisc(count: number, radius = 1.55, depth = 0.26): Shape {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const r = radius * Math.sqrt(Math.random())
    const shell = Math.random() > 0.72
    const rad = shell ? radius : r
    out[i * 3] = Math.cos(angle) * rad
    out[i * 3 + 1] = Math.sin(angle) * rad
    out[i * 3 + 2] = (Math.random() - 0.5) * depth * (shell ? 1.6 : 1)
  }
  return out
}

function makeCube(count: number, size = 1.15): Shape {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * 2 - 1
    const y = Math.random() * 2 - 1
    const z = Math.random() * 2 - 1
    // Project most points onto the nearest face so the cloud reads as a solid
    // cube, while a minority fill the interior for volume.
    const maxAxis = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) || 1
    const scale = Math.random() > 0.3 ? 1 / maxAxis : Math.pow(Math.random(), 0.35)
    out[i * 3] = x * scale * size
    out[i * 3 + 1] = y * scale * size
    out[i * 3 + 2] = z * scale * size
  }
  return out
}

function makeSphere(count: number, radius = 1.5): Shape {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(u)
    const shell = Math.random() > 0.35 ? 1 : 0.55 + Math.random() * 0.4
    const rad = radius * shell
    out[i * 3] = rad * Math.sin(phi) * Math.cos(theta)
    out[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta)
    out[i * 3 + 2] = rad * Math.cos(phi)
  }
  return out
}

function makePlane(count: number, size = 1.75, jitter = 0.05): Shape {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    out[i * 3] = (Math.random() * 2 - 1) * size
    out[i * 3 + 1] = (Math.random() * 2 - 1) * size
    out[i * 3 + 2] = (Math.random() - 0.5) * jitter
  }
  return out
}

function makeGlowTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0.92)')
  gradient.addColorStop(0.45, 'rgba(216,240,231,0.45)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return canvas
}

export function HeroEmblem3D({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const pointer = usePointerParallax(1)
  const scrollRef = useRef(0)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduced = prefersReducedMotion()
    const isMobile = window.innerWidth < 768
    const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP

    // ---------------------------------------------------------------- renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(rendererDpr())
    renderer.setSize(mount.clientWidth, mount.clientHeight, false)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 6.2)

    // ------------------------------------------------------------------- lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(3, 4, 6)
    scene.add(key)
    const gold = new THREE.PointLight(0xd4af37, 2.2, 20)
    gold.position.set(-3, 2, 4)
    scene.add(gold)
    const emerald = new THREE.PointLight(0x4fac89, 2, 20)
    emerald.position.set(3, -2.5, 3)
    scene.add(emerald)

    // ------------------------------------------------------------- particle field
    const shapes = [
      makeDisc(count),
      makeCube(count, 1.15),
      makeSphere(count, 1.5),
      makePlane(count, 1.8)
    ]

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(shapes[0])
    const colors = new Float32Array(count * 3)
    const seeds = new Float32Array(count)

    const goldColor = new THREE.Color('#e7d17c')
    const goldDeep = new THREE.Color('#d4af37')
    const mintColor = new THREE.Color('#83c9ad')
    const whiteColor = new THREE.Color('#ffffff')

    for (let i = 0; i < count; i += 1) {
      const roll = Math.random()
      const color =
        roll > 0.82 ? whiteColor : roll > 0.55 ? mintColor : roll > 0.25 ? goldColor : goldDeep
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
      seeds[i] = Math.random()
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setDrawRange(0, count)

    const dot = makeDotTexture()
    const dotTexture = dot ? new THREE.CanvasTexture(dot) : null

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: isMobile ? 0.048 : 0.042,
        map: dotTexture ?? undefined,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      })
    )
    scene.add(points)

    // ---------------------------------------------------------------- logo slab
    const textureLoader = new THREE.TextureLoader()
    const emblemTexture = textureLoader.load(LOGO_TEXTURE)
    emblemTexture.colorSpace = THREE.SRGBColorSpace
    emblemTexture.anisotropy = 4
    emblemTexture.minFilter = THREE.LinearMipmapLinearFilter

    const slab = new THREE.Group()

    // Soft luminous plate so the dark-green official artwork stays legible on
    // the dark hero background, without washing the emblem out.
    const glowCanvas = makeGlowTexture()
    const glowTexture = glowCanvas ? new THREE.CanvasTexture(glowCanvas) : null
    let plate: THREE.Mesh | null = null

    if (glowTexture) {
      const plateMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending
      })
      plate = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 3.55), plateMaterial)
      plate.position.z = -0.34
      slab.add(plate)
    }

    const LAYERS = 12
    const slabMaterials: THREE.MeshBasicMaterial[] = []

    for (let i = LAYERS - 1; i >= 0; i -= 1) {
      const isFront = i === 0
      const material = new THREE.MeshBasicMaterial({
        map: emblemTexture,
        transparent: true,
        opacity: isFront ? 1 : 0.09,
        depthWrite: isFront,
        // Back layers glow gold so the emblem reads as an extruded 3D object.
        blending: isFront ? THREE.NormalBlending : THREE.AdditiveBlending,
        color: isFront ? 0xffffff : 0xd4af37,
        side: THREE.DoubleSide
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), material)
      mesh.position.z = -i * 0.018
      mesh.scale.setScalar(1 + i * 0.0022)
      slabMaterials.push(material)
      slab.add(mesh)
    }

    slab.visible = false
    scene.add(slab)

    // ------------------------------------------------------ accent wireframe ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.28, 0.006, 8, 220),
      new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0
      })
    )
    ring.rotation.x = Math.PI / 2.35
    scene.add(ring)

    const secondary = new THREE.Mesh(
      new THREE.TorusGeometry(2.62, 0.004, 8, 220),
      new THREE.MeshBasicMaterial({ color: 0x83c9ad, transparent: true, opacity: 0 })
    )
    secondary.rotation.x = Math.PI / 1.75
    secondary.rotation.y = 0.6
    scene.add(secondary)

    const halo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.35, 2),
      new THREE.MeshBasicMaterial({
        color: 0x4fac89,
        wireframe: true,
        transparent: true,
        opacity: 0
      })
    )
    scene.add(halo)

    // ------------------------------------------------------------------ timeline
    // 0.0 – 8.0s  particle metamorphosis through four solid forms
    // 8.0 – 9.0s  particles settle flat and dim, logo slab fades in
    // 9.0 – 21.0s logo slab holds (interactive), rings orbit
    // 21.0 – 22.2s logo fades, particles burst back into the cycle
    const CYCLE = 22
    const MORPH_WINDOW = 8
    const PARTICLE_MAX = 0.8

    let frame = 0
    const clock = new THREE.Clock()
    const target = new THREE.Vector3()

    function animate() {
      const elapsed = clock.getElapsedTime()
      const t = elapsed % CYCLE
      const pointerX = pointer.current.x
      const pointerY = pointer.current.y

      scrollRef.current = window.scrollY

      // --- particle morph ---------------------------------------------------
      let particleOpacity = PARTICLE_MAX
      let activeFrom: Shape
      let activeTo: Shape
      let progress: number

      if (t < MORPH_WINDOW) {
        const segment = MORPH_WINDOW / shapes.length
        const index = Math.min(Math.floor(t / segment), shapes.length - 1)
        activeFrom = shapes[index]
        activeTo = shapes[Math.min(index + 1, shapes.length - 1)]
        progress = clamp((t - index * segment) / segment)
      } else if (t < 9) {
        activeFrom = shapes[shapes.length - 1]
        activeTo = shapes[shapes.length - 1]
        progress = 1
        particleOpacity = lerp(PARTICLE_MAX, 0.22, smoothstep(8, 9, t))
      } else if (t < 21) {
        activeFrom = shapes[shapes.length - 1]
        activeTo = shapes[shapes.length - 1]
        progress = 1
        particleOpacity = 0.22
      } else {
        activeFrom = shapes[shapes.length - 1]
        activeTo = shapes[0]
        progress = 0
        particleOpacity = lerp(0.22, PARTICLE_MAX, smoothstep(21, 22.2, t))
      }

      if (!reduced) {
        const eased = easeInOutCubic(progress)
        for (let i = 0; i < count; i += 1) {
          const stagger = clamp((eased - seeds[i] * 0.22) / 0.78)
          const s = easeInOutCubic(stagger)
          const i3 = i * 3
          positions[i3] = lerp(activeFrom[i3], activeTo[i3], s)
          positions[i3 + 1] = lerp(activeFrom[i3 + 1], activeTo[i3 + 1], s)
          positions[i3 + 2] = lerp(activeFrom[i3 + 2], activeTo[i3 + 2], s)
        }
        geometry.attributes.position.needsUpdate = true
      }

      const pointsMaterial = points.material as THREE.PointsMaterial
      pointsMaterial.opacity = reduced ? 0.35 : particleOpacity

      // gentle breathing while the logo holds
      const breathe = 1 + Math.sin(elapsed * 0.9) * 0.012
      points.scale.setScalar((t > 8.6 && t < 21 ? 1.18 : 1) * breathe)

      // --- logo slab --------------------------------------------------------
      const logoOpacity =
        t >= 8 && t < 21 ? smoothstep(8.35, 9.2, t) * (1 - smoothstep(20.4, 21, t)) : 0

      slab.visible = logoOpacity > 0.01 || !reduced
      slabMaterials.forEach((material, index) => {
        const base = reduced ? 1 : logoOpacity
        material.opacity = index === 0 ? base : base * 0.09 * (1 - index / 16)
      })

      if (plate) {
        const plateMaterial = plate.material as THREE.MeshBasicMaterial
        plateMaterial.opacity = (reduced ? 0.4 : logoOpacity) * 0.72
      }

      ring.material.opacity = reduced ? 0.25 : 0.34 * logoOpacity
      ;(secondary.material as THREE.MeshBasicMaterial).opacity = reduced ? 0.15 : 0.28 * logoOpacity
      ;(halo.material as THREE.MeshBasicMaterial).opacity = reduced ? 0.06 : 0.1 * logoOpacity

      // --- interaction ------------------------------------------------------
      const scrollTilt = clamp(scrollRef.current / 900) * 0.8
      const pointerFactor = reduced ? 0 : 1

      target.set(
        -pointerY * 0.28 * pointerFactor + scrollTilt * 0.35,
        pointerX * 0.42 * pointerFactor,
        Math.max(-0.6, -scrollTilt * 1.1)
      )

      scene.rotation.x += (target.x - scene.rotation.x) * 0.07
      scene.rotation.y += (target.y - scene.rotation.y) * 0.07
      scene.rotation.z += (0 - scene.rotation.z) * 0.05
      points.rotation.z = elapsed * 0.06
      slab.rotation.z = Math.sin(elapsed * 0.25) * 0.012
      slab.position.z = Math.sin(elapsed * 0.5) * 0.06

      ring.rotation.z = elapsed * 0.22
      secondary.rotation.z = -elapsed * 0.16
      halo.rotation.y = elapsed * 0.08
      halo.rotation.x = elapsed * 0.05

      camera.position.x += (pointerX * 0.42 * pointerFactor - camera.position.x) * 0.04
      camera.position.y += (-pointerY * 0.3 * pointerFactor - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }

    animate()

    // ------------------------------------------------------------------ resize
    function onResize() {
      if (!mount) return
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(rendererDpr())
      renderer.setSize(width, height, false)
    }

    window.addEventListener('resize', onResize)

    // Pause rendering when the hero is off-screen to save battery.
    const visibility = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!frame) {
              clock.start()
              frame = requestAnimationFrame(animate)
            }
          } else if (frame) {
            cancelAnimationFrame(frame)
            frame = 0
            clock.stop()
          }
        }
      },
      { threshold: 0.02 }
    )
    visibility.observe(mount)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      visibility.disconnect()
      window.removeEventListener('resize', onResize)
      geometry.dispose()
      ;(points.material as THREE.Material).dispose()
      dotTexture?.dispose()
      emblemTexture.dispose()
      glowTexture?.dispose()
      if (plate) {
        plate.geometry.dispose()
        ;(plate.material as THREE.Material).dispose()
      }
      slabMaterials.forEach(material => material.dispose())
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
      secondary.geometry.dispose()
      ;(secondary.material as THREE.Material).dispose()
      halo.geometry.dispose()
      ;(halo.material as THREE.Material).dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [pointer])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}
