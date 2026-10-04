'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clamp, prefersReducedMotion, rendererDpr, useInView, usePointerParallax } from './utils'

/** NASA Blue Marble imagery with geographically positioned Pakistan city markers. */

type Marker = { label: string; lat: number; lng: number; accent?: boolean }

const MARKERS: Marker[] = [
  { label: 'Islamabad', lat: 33.6844, lng: 73.0479, accent: true },
  { label: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { label: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { label: 'Peshawar', lat: 34.0151, lng: 71.5249 },
  { label: 'Quetta', lat: 30.1798, lng: 66.975 },
  { label: 'Gilgit', lat: 35.9208, lng: 74.3144 },
  { label: 'Muzaffarabad', lat: 34.3700, lng: 73.4711 },
  { label: 'Multan', lat: 30.1575, lng: 71.5249 },
  { label: 'Rawalpindi', lat: 33.5651, lng: 73.0169 }
]

function toVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

export function ReachGlobe({ className }: { className?: string }) {
  const [ready, setReady] = useState(false)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const { ref: viewRef, inView } = useInView<HTMLDivElement>('260px')
  const pointer = usePointerParallax(1)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !inView) return

    const reduced = prefersReducedMotion()
    const isMobile = window.innerWidth < 768

    setReady(false)
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true }) }
    catch { return }
    let disposed = false
    renderer.setPixelRatio(Math.min(rendererDpr(), 1.8))
    renderer.setSize(mount.clientWidth, mount.clientHeight, false)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 6.4)

    const world = new THREE.Group()
    scene.add(world)

    // The equirectangular image and marker coordinates share the same meridian.
    const texture = new THREE.TextureLoader().load('/images/earth/blue-marble.jpg', () => {
      if (!disposed) setReady(true)
    })
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(2, 64, 48),
      new THREE.MeshPhongMaterial({ map: texture, shininess: 6, specular: 0x203448 })
    )
    world.add(shell)
    scene.add(new THREE.AmbientLight(0xffffff, 1.8))
    const sunlight = new THREE.DirectionalLight(0xffffff, 2.1)
    sunlight.position.set(-3, 4, 8)
    scene.add(sunlight)

    // Markers
    const markerGroup = new THREE.Group()
    world.add(markerGroup)

    const markerMeshes: { mesh: THREE.Mesh; pulse: number }[] = []

    MARKERS.forEach((marker, index) => {
      const position = toVector3(marker.lat, marker.lng, 2.04)
      const colour = marker.accent ? 0xf0e2a9 : 0xe7d17c

      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(marker.accent ? 0.035 : 0.018, 16, 16),
        new THREE.MeshBasicMaterial({ color: colour })
      )
      pin.position.copy(position)
      markerGroup.add(pin)
      markerMeshes.push({ mesh: pin, pulse: index * 0.7 })

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(marker.accent ? 0.065 : 0.035, 16, 16),
        new THREE.MeshBasicMaterial({
          color: colour,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      )
      halo.position.copy(position)
      markerGroup.add(halo)
      markerMeshes.push({ mesh: halo, pulse: index * 0.7 + 0.35 })

      // short connector line to the surface
      const outer = toVector3(marker.lat, marker.lng, 2.10)
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([position, outer])
      markerGroup.add(
        new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial({
            color: colour,
            transparent: true,
            opacity: marker.accent ? 0.65 : 0.3
          })
        )
      )
    })

    // Connectivity arcs from the Islamabad secretariat to each regional hub.
    const hub = MARKERS[0]
    const hubPosition = toVector3(hub.lat, hub.lng, 2.02)
    const arcMaterials: THREE.LineBasicMaterial[] = []

    MARKERS.slice(1).forEach((marker, index) => {
      const end = toVector3(marker.lat, marker.lng, 2.02)
      const mid = hubPosition.clone().add(end).multiplyScalar(0.5)
      const altitude = 2.02 + hubPosition.distanceTo(end) * 0.32
      mid.normalize().multiplyScalar(Math.min(altitude, 3.1))

      const curve = new THREE.QuadraticBezierCurve3(hubPosition, mid, end)
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(46))
      const material = new THREE.LineBasicMaterial({
        color: index % 2 === 0 ? 0xd4af37 : 0x83c9ad,
        transparent: true,
        opacity: 0.42
      })
      arcMaterials.push(material)
      world.add(new THREE.Line(geometry, material))
    })

    // Rotation so Pakistan faces the viewer at load
    world.rotation.y = -(90 + MARKERS[0].lng) * Math.PI / 180
    world.rotation.x = MARKERS[0].lat * Math.PI / 180

    let frame = 0
    const clock = new THREE.Clock()

    function animate() {
      const elapsed = clock.getElapsedTime()

      if (!reduced) {
        world.rotation.y = -(90 + MARKERS[0].lng) * Math.PI / 180 + Math.sin(elapsed * 0.12) * 0.24
        arcMaterials.forEach((material, index) => {
          material.opacity = 0.28 + Math.abs(Math.sin(elapsed * 0.6 + index * 0.8)) * 0.3
        })
      }

      markerMeshes.forEach(({ mesh, pulse }) => {
        const wave = 0.85 + Math.sin(elapsed * 1.6 + pulse) * 0.15
        mesh.scale.setScalar(reduced ? 1 : wave)
      })

      const pointerX = reduced ? 0 : pointer.current.x
      const pointerY = reduced ? 0 : pointer.current.y

      scene.rotation.x += (clamp(pointerY * 0.22, -0.35, 0.35) - scene.rotation.x) * 0.05
      scene.rotation.y += (clamp(pointerX * 0.3, -0.5, 0.5) - scene.rotation.y) * 0.05
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
      disposed = true
      texture.dispose()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      scene.traverse(object => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach(item => item.dispose())
        else material?.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [inView, pointer])

  return (
    <figure ref={viewRef} className={className}>
      <div className="relative h-full w-full bg-[radial-gradient(ellipse_at_center,#edf6fb_0%,#ffffff_70%)]">
        {!ready && <div role="img" aria-label="World map showing continents and oceans" className="absolute inset-6 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/earth/blue-marble.jpg)' }} />}
        <div ref={mountRef} role="img" aria-label="Earth globe centred on Pakistan with city markers at Islamabad, Lahore, Karachi, Peshawar, Quetta, Gilgit, Muzaffarabad, Multan and Rawalpindi" className={'h-full w-full transition-opacity ' + (ready ? 'opacity-100' : 'opacity-0')} />
        <figcaption className="absolute inset-x-0 bottom-2 text-center text-[10px] text-slate-500">
          Earth imagery: NASA Blue Marble · <a href="/photo-credits#earth" className="underline underline-offset-2">Source credits</a>
        </figcaption>
      </div>
    </figure>
  )
}
