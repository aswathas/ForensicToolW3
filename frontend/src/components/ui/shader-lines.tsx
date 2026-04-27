"use client"
import { useEffect, useRef } from "react"

declare global { interface Window { THREE: any } }

export function ShaderAnimation({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: any, animId: number, scene: any, camera: any, mesh: any

    const CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r89/three.min.js'

    const init = () => {
      if (!window.THREE) return

      const THREE = window.THREE
      scene = new THREE.Scene()
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      // Fragment shader: mosaic concentric rings, RED-SHIFTED
      // Original BGR swizzle: vec4(color[2], color[1], color[0], 1.0)
      // Red mod: collapse all luminance into red channel
      const fragShader = `
        precision mediump float;
        uniform float uTime;
        uniform vec2 uRes;

        float mosaic(vec2 uv, float size) {
          return floor(uv.x / size) * size + floor(uv.y / size) * size;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - uRes * 0.5) / min(uRes.x, uRes.y);
          float t = uTime * 0.4;

          // Mosaic cell
          float cell = 0.03;
          vec2 muv = floor(uv / cell) * cell + cell * 0.5;

          float dist = length(muv);
          float rings = sin(dist * 30.0 - t * 2.5);
          float pulse = sin(dist * 8.0 - t);
          float val = rings * 0.5 + 0.5;
          val *= pulse * 0.3 + 0.7;

          // Glow falloff from center
          float glow = 1.0 - smoothstep(0.0, 0.65, dist);
          val *= glow;

          // RED-SHIFTED: output luminance in red channel only
          float r = val;
          float g = val * 0.08;
          float b = val * 0.02;

          gl_FragColor = vec4(r, g, b, val * 0.85);
        }
      `

      const vertShader = `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `

      const uniforms = {
        uTime: { value: 0 },
        uRes:  { value: new THREE.Vector2(w, h) },
      }

      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vertShader, fragmentShader: fragShader, transparent: true })
      const geo = new THREE.PlaneBufferGeometry(2, 2)
      mesh = new THREE.Mesh(geo, mat)
      scene.add(mesh)

      const handleResize = () => {
        const nw = container.clientWidth || window.innerWidth
        const nh = container.clientHeight || window.innerHeight
        renderer.setSize(nw, nh)
        uniforms.uRes.value.set(nw, nh)
      }
      window.addEventListener('resize', handleResize)

      const clock = new THREE.Clock()
      const animate = () => {
        animId = requestAnimationFrame(animate)
        uniforms.uTime.value = clock.getElapsedTime()
        renderer.render(scene, camera)
      }
      animate()

      return () => window.removeEventListener('resize', handleResize)
    }

    // Load CDN script
    if (window.THREE) {
      init()
    } else {
      const existing = document.querySelector(`script[src="${CDN_URL}"]`)
      if (!existing) {
        const s = document.createElement('script')
        s.src = CDN_URL
        s.async = true
        s.onload = () => init()
        document.head.appendChild(s)
      } else {
        existing.addEventListener('load', () => init())
      }
    }

    return () => {
      cancelAnimationFrame(animId)
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  )
}

export default ShaderAnimation
