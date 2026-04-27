import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface WebGPUDepthMapProps {
  className?: string
}

export function WebGPUDepthMap({ className = '' }: WebGPUDepthMapProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let animId: number
    let renderer: THREE.WebGLRenderer

    const w = mount.clientWidth || window.innerWidth
    const h = mount.clientHeight || window.innerHeight

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
    camera.position.z = 3

    // WebGL renderer (WebGPU API not stable in npm three yet — use WebGL)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    mount.appendChild(renderer.domElement)

    // Particle depth field — 3000 particles in a volume
    const COUNT = 3000
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8

      // Red-dominant particles with slight variation
      const lum = 0.3 + Math.random() * 0.7
      colors[i * 3]     = lum                    // R
      colors[i * 3 + 1] = lum * (Math.random() * 0.15) // G (slight)
      colors[i * 3 + 2] = lum * (Math.random() * 0.05) // B (almost none)

      sizes[i] = Math.random() * 3 + 0.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:     { value: 0 },
        uScanLine: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vDepth;
        uniform float uTime;

        void main() {
          vColor = color;
          vec3 pos = position;
          // Slow drift
          pos.x += sin(uTime * 0.2 + position.z * 0.5) * 0.15;
          pos.y += cos(uTime * 0.15 + position.x * 0.3) * 0.12;
          pos.z += sin(uTime * 0.1 + position.y * 0.2) * 0.08;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          vDepth = clamp((-mvPos.z - 0.5) / 6.0, 0.0, 1.0);
          gl_PointSize = size * (280.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDepth;
        uniform float uScanLine;

        void main() {
          // Circular point
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          // Soft glow
          float alpha = (1.0 - d * 2.0) * 0.8;
          alpha *= 1.0 - vDepth * 0.6; // far particles fade

          // Scan line overlay
          float scanY = gl_FragCoord.y / 800.0;
          float scan = abs(scanY - uScanLine);
          float scanGlow = smoothstep(0.08, 0.0, scan) * 0.6;
          vec3 col = vColor + vec3(scanGlow, scanGlow * 0.1, 0.0);

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    })

    const particles = new THREE.Points(geo, mat)
    scene.add(particles)

    // Scan line mesh for full-screen red scan
    const scanGeo = new THREE.PlaneGeometry(20, 0.004)
    const scanMat = new THREE.MeshBasicMaterial({ color: 0xdc143c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
    const scanMesh = new THREE.Mesh(scanGeo, scanMat)
    scene.add(scanMesh)

    // Resize
    const onResize = () => {
      const nw = mount.clientWidth || window.innerWidth
      const nh = mount.clientHeight || window.innerHeight
      renderer.setSize(nw, nh)
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      mat.uniforms.uTime.value = t

      // Scan line cycles top→bottom every 4 seconds
      const scanProgress = (t % 4.0) / 4.0
      mat.uniforms.uScanLine.value = scanProgress
      scanMesh.position.y = (1.0 - scanProgress * 2.0) * 5

      // Slow camera drift
      camera.position.x = Math.sin(t * 0.05) * 0.3
      camera.position.y = Math.cos(t * 0.07) * 0.2
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      geo.dispose()
      mat.dispose()
      scanGeo.dispose()
      scanMat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  )
}

export default WebGPUDepthMap
