import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

interface HorizonBackgroundProps {
  className?: string
  style?: React.CSSProperties
}

export function HorizonBackground({ className = '', style }: HorizonBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── scene ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000005, 0.00018)

    const camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 3000)
    camera.position.set(0, 25, 120)
    camera.lookAt(0, 8, -400)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.55

    // ── post-processing ────────────────────────────────────────────────
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      0.7, 0.38, 0.82
    )
    composer.addPass(bloom)

    // ── stars ──────────────────────────────────────────────────────────
    const starGroups: THREE.Points[] = []
    for (let g = 0; g < 3; g++) {
      const count = 4000
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        const r = 300 + Math.random() * 900
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(Math.random() * 2 - 1)
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = r * Math.cos(phi)

        const c = new THREE.Color()
        const pick = Math.random()
        if (pick < 0.6)       c.setHSL(0,    0,    0.8 + Math.random() * 0.2)
        else if (pick < 0.85) c.setHSL(0.02, 0.6,  0.82)   // warm red/orange tint
        else                  c.setHSL(0.62, 0.45, 0.78)   // blue tint
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
        sizes[i] = 0.6 + Math.random() * 1.8
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3))
      geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1))

      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: g } },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          uniform float depth;
          void main() {
            vColor = color;
            vec3 pos = position;
            float angle = time * 0.018 * (1.0 - depth * 0.28);
            float ca = cos(angle); float sa = sin(angle);
            pos.xy = vec2(ca*pos.x - sa*pos.y, sa*pos.x + ca*pos.y);
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (280.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, d));
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      })

      const pts = new THREE.Points(geo, mat)
      scene.add(pts)
      starGroups.push(pts)
    }

    // ── nebula ─────────────────────────────────────────────────────────
    const nebGeo = new THREE.PlaneGeometry(6000, 3000, 80, 80)
    const nebMat = new THREE.ShaderMaterial({
      uniforms: {
        time:    { value: 0 },
        color1:  { value: new THREE.Color(0x220011) },
        color2:  { value: new THREE.Color(0x080030) },
        opacity: { value: 0.28 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float time;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(p.x*0.008 + time*0.4) * cos(p.y*0.006 + time*0.3) * 18.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 color1; uniform vec3 color2;
        uniform float opacity; uniform float time;
        varying vec2 vUv;
        void main() {
          float m = sin(vUv.x*8.0+time*0.5)*cos(vUv.y*7.0+time*0.4);
          vec3 col = mix(color1, color2, m*0.5+0.5);
          float a = opacity * (1.0 - length(vUv-0.5)*1.9);
          gl_FragColor = vec4(col, max(a, 0.0));
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const nebula = new THREE.Mesh(nebGeo, nebMat)
    nebula.position.z = -900
    scene.add(nebula)

    // ── mountain silhouettes ───────────────────────────────────────────
    const layers = [
      { z: -40,  h: 55,  col: 0x0d0008, op: 1.0 },
      { z: -90,  h: 75,  col: 0x100010, op: 0.9 },
      { z: -140, h: 95,  col: 0x0a0020, op: 0.7 },
      { z: -190, h: 115, col: 0x080030, op: 0.5 },
    ]
    const mountains: THREE.Mesh[] = []
    layers.forEach(({ z, h, col, op }) => {
      const pts2d: THREE.Vector2[] = []
      const segs = 60
      for (let i = 0; i <= segs; i++) {
        const x = (i / segs - 0.5) * 1200
        const y = Math.sin(i * 0.12) * h + Math.sin(i * 0.055) * h * 0.5 - 90
        pts2d.push(new THREE.Vector2(x, y))
      }
      pts2d.push(new THREE.Vector2(700, -400), new THREE.Vector2(-700, -400))
      const shape = new THREE.Shape(pts2d)
      const geo   = new THREE.ShapeGeometry(shape)
      const mat2  = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide })
      const mesh  = new THREE.Mesh(geo, mat2)
      mesh.position.z = z
      mesh.position.y = z * 0.5
      scene.add(mesh)
      mountains.push(mesh)
    })

    // ── atmosphere sphere ──────────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(500, 32, 32)
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        void main() {
          float i = pow(0.7 - dot(vNormal, vec3(0,0,1)), 2.0);
          vec3 atm = vec3(0.55, 0.08, 0.12) * i;
          gl_FragColor = vec4(atm, i * 0.18);
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    })
    scene.add(new THREE.Mesh(atmGeo, atmMat))

    // ── animation loop ─────────────────────────────────────────────────
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const t = Date.now() * 0.001

      starGroups.forEach(s => {
        (s.material as THREE.ShaderMaterial).uniforms.time.value = t
      })
      ;(nebMat as THREE.ShaderMaterial).uniforms.time.value = t * 0.45
      ;(atmMat as THREE.ShaderMaterial).uniforms.time.value = t

      // gentle floating camera
      camera.position.x = Math.sin(t * 0.07) * 4
      camera.position.y = 25 + Math.cos(t * 0.1) * 2
      camera.lookAt(0, 8, -400)

      // subtle mountain parallax
      mountains.forEach((m, i) => {
        m.position.x = Math.sin(t * 0.06 + i * 0.5) * (1.5 + i * 0.8)
      })

      composer.render()
    }
    loop()

    // ── resize ─────────────────────────────────────────────────────────
    const onResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      composer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      starGroups.forEach(s => { s.geometry.dispose(); (s.material as THREE.Material).dispose() })
      mountains.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose() })
      nebGeo.dispose(); nebMat.dispose()
      atmGeo.dispose(); atmMat.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  )
}
