'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { prefersReducedMotion, rendererDpr, useInView, usePointerParallax } from './utils'

/**
 * Floating wireframe geometry field: torus, icosahedron, octahedron,
 * dodecahedron and a torus knot drifting through space, plus a fine particle
 * haze. Used as a premium 3D backdrop behind dark sections, and can be layered
 * behind the hero.
 */
const GEOMETRIES = [
  () => new THREE.TorusGeometry(1.15, 0.24, 14, 46),
  () => new THREE.IcosahedronGeometry(1.05, 0),
  () => new THREE.OctahedronGeometry(1.0, 0),
  () => new THREE.DodecahedronGeometry(0.95, 0),
  () => new THREE.TorusKnotGeometry(0.62, 0.19, 96, 12)
]

export function WireframeField({
  className = '',
  opacity = 0.55,
  particleCount = 900,
  showParticles = true
}: {
  className?: string
  opacity?: number
  particleCount?: number
  showParticles?: boolean
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const { ref: viewRef, inView } = useInView<HTMLDivElement>('300px')
  const pointer = usePointerParallax(1)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !inView) return

    const reduced = prefersReducedMotion()
    const isMobile = window.innerWidth < 768

    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true })
    renderer.setPixelRatio(rendererDpr())
    renderer.setSize(mount.clientWidth, mount.clientHeight, false)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 7.2)

    const group = new THREE.Group()
    scene.add(group)

    const shapes: { mesh: THREE.Mesh; spin: THREE.Vector3; float: number }[] = []

    GEOMETRIES.forEach((factory, index) => {
      const geometry = factory()
      const material = new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0x83c9ad : 0xd4af37,
        wireframe: true,
        transparent: true,
        opacity: opacity * (index === 4 ? 0.85 : 1)
      })
      const mesh = new THREE.Mesh(geometry, material)

      const angle = (index / GEOMETRIES.length) * Math.PI * 2
      const radius = 2.9 + (index % 2) * 0.75
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 1.4) * 1.7,
        Math.sin(angle) * 1.6 - index * 0.3
      )
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)

      group.add(mesh)
      shapes.push({
        mesh,
        spin: new THREE.Vector3(
          0.0012 + Math.random() * 0.002,
          0.0016 + Math.random() * 0.002,
          0.0008 + Math.random() * 0.001
        ),
        float: index * 1.1
      })
    })

    // Particle haze with colour variation
    let points: THREE.Points | null = null
    let pointGeometry: THREE.BufferGeometry | null = null

    if (showParticles) {
      const count = isMobile ? Math.round(particleCount * 0.55) : particleCount
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const palette = [
        new THREE.Color('#83c9ad'),
        new THREE.Color('#d4af37'),
        new THREE.Color('#f0e2a9'),
        new THREE.Color('#4fac89'),
        new THREE.Color('#ffffff')
      ]

      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 15
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8
        const color = palette[Math.floor(Math.random() * palette.length)]
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }

      pointGeometry = new THREE.BufferGeometry()
      pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      points = new THREE.Points(
        pointGeometry,
        new THREE.PointsMaterial({
          size: 0.035,
          vertexColors: true,
          transparent: true,
          opacity: 0.72,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
      scene.add(points)
    }

    let frame = 0
    const clock = new THREE.Clock()

    function animate() {
      const elapsed = clock.getElapsedTime()

      if (!reduced) {
        shapes.forEach(({ mesh, spin, float }) => {
          mesh.rotation.x += spin.x
          mesh.rotation.y += spin.y
          mesh.rotation.z += spin.z
          mesh.position.y += Math.sin(elapsed * 0.6 + float) * 0.0018
        })
        if (points) points.rotation.y = elapsed * 0.02
      }

      const px = reduced ? 0 : pointer.current.x
      const py = reduced ? 0 : pointer.current.y
      scene.rotation.x += (py * 0.16 - scene.rotation.x) * 0.04
      scene.rotation.y += (px * 0.22 - scene.rotation.y) * 0.04
      camera.position.x += (px * 0.3 - camera.position.x) * 0.03
      camera.position.y += (-py * 0.2 - camera.position.y) * 0.03
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }

    animate()

    function onResize() {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight, false)
    }

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      scene.traverse(object => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach(item => item.dispose())
        else material?.dispose()
      })
      pointGeometry?.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [inView, pointer, opacity, particleCount, showParticles])

  return (
    <div ref={viewRef} className={`relative ${className}`} aria-hidden="true">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  )
}
