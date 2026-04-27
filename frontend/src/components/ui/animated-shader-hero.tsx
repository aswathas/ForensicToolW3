import React, { useRef, useEffect } from 'react'

interface HeroProps {
  trustBadge?: {
    text: string
    icons?: string[]
  }
  headline: {
    line1: string
    line2: string
  }
  subtitle: string
  buttons?: {
    primary?: { text: string; onClick?: () => void }
    secondary?: { text: string; onClick?: () => void }
  }
  className?: string
  children?: React.ReactNode
}

const defaultShaderSource = `#version 300 es
/*
 * Nebula shader — fire-clouds with pointer interaction
 * Original by Matthias Hurrle (@atzedent)
 */
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
uniform vec2 move;
uniform vec2 touch;
uniform int pointerCount;
uniform vec2 pointers;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float a=rnd(i), b=rnd(i+vec2(1,0)), c=rnd(i+vec2(0,1)), d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) { t+=a*noise(p); p*=2.*m; a*=.5; }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a); d=a; p*=2./(i+1.);
  }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN, st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`

// ── Shader background hook ────────────────────────────────────────────────
export function useShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  type Ptr = { x: number; y: number }
  const ptrs = useRef<Map<number, Ptr>>(new Map())
  const lastMouse = useRef<[number, number]>([0, 0])
  const move = useRef<[number, number]>([0, 0])

  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const progRef = useRef<WebGLProgram | null>(null)
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2')
    if (!gl) return
    glRef.current = gl

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const vertSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

    const vs = compile(gl.VERTEX_SHADER, vertSrc)
    const fs = compile(gl.FRAGMENT_SHADER, defaultShaderSource)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    progRef.current = prog

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    uniformsRef.current = {
      resolution: gl.getUniformLocation(prog, 'resolution'),
      time: gl.getUniformLocation(prog, 'time'),
      move: gl.getUniformLocation(prog, 'move'),
      touch: gl.getUniformLocation(prog, 'touch'),
      pointerCount: gl.getUniformLocation(prog, 'pointerCount'),
      pointers: gl.getUniformLocation(prog, 'pointers'),
    }

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio * 0.5)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const onDown = (e: PointerEvent) => ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const onUp = (e: PointerEvent) => ptrs.current.delete(e.pointerId)
    const onMove = (e: PointerEvent) => {
      if (!ptrs.current.has(e.pointerId)) return
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      move.current = [move.current[0] + e.movementX, move.current[1] + e.movementY]
      lastMouse.current = [e.clientX, e.clientY]
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    canvas.addEventListener('pointermove', onMove)

    const loop = (now: number) => {
      const u = uniformsRef.current
      const p = progRef.current
      if (!p) return
      gl.useProgram(p)
      gl.uniform2f(u.resolution, canvas.width, canvas.height)
      gl.uniform1f(u.time, now * 1e-3)
      gl.uniform2f(u.move, ...move.current)
      gl.uniform2f(u.touch, ...lastMouse.current)
      gl.uniform1i(u.pointerCount, ptrs.current.size)
      const pcoords = ptrs.current.size > 0
        ? Array.from(ptrs.current.values()).flatMap(p => [p.x, p.y])
        : [0, 0]
      gl.uniform2fv(u.pointers, new Float32Array(pcoords.slice(0, 2)))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
      canvas.removeEventListener('pointermove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return canvasRef
}

// ── Standalone canvas background ────────────────────────────────────────────
export const ShaderCanvas: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => {
  const canvasRef = useShaderBackground()
  return (
    <canvas
      ref={canvasRef}
      className={`touch-none ${className}`}
      style={{ background: 'black', ...style }}
    />
  )
}

// ── Full hero component ──────────────────────────────────────────────────────
const HERO_STYLES = `
  @keyframes _fade-in-down {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes _fade-in-up {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  ._anim-fade-in-down { animation: _fade-in-down 0.8s ease-out forwards; }
  ._anim-fade-in-up   { animation: _fade-in-up 0.8s ease-out forwards; opacity: 0; }
  ._delay-200 { animation-delay: 0.2s; }
  ._delay-400 { animation-delay: 0.4s; }
  ._delay-600 { animation-delay: 0.6s; }
  ._delay-800 { animation-delay: 0.8s; }
`

const Hero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = '',
  children,
}) => {
  const canvasRef = useShaderBackground()

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-black ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: HERO_STYLES }} />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ background: 'black' }}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
        {trustBadge && (
          <div className="_anim-fade-in-down mb-8">
            <div className="flex items-center gap-2 px-6 py-3 bg-orange-500/10 backdrop-blur-md border border-orange-300/30 rounded-full text-sm">
              {trustBadge.icons?.map((icon, i) => (
                <span key={i}>{icon}</span>
              ))}
              <span className="text-orange-100">{trustBadge.text}</span>
            </div>
          </div>
        )}

        <div className="text-center space-y-6 max-w-5xl mx-auto px-4">
          <div className="space-y-2">
            <h1 className="_anim-fade-in-up _delay-200 text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-orange-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
              {headline.line1}
            </h1>
            <h1 className="_anim-fade-in-up _delay-400 text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent">
              {headline.line2}
            </h1>
          </div>

          <div className="_anim-fade-in-up _delay-600 max-w-3xl mx-auto">
            <p className="text-lg md:text-xl text-orange-100/90 font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {buttons && (
            <div className="_anim-fade-in-up _delay-800 flex flex-col sm:flex-row gap-4 justify-center mt-10">
              {buttons.primary && (
                <button
                  onClick={buttons.primary.onClick}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25"
                >
                  {buttons.primary.text}
                </button>
              )}
              {buttons.secondary && (
                <button
                  onClick={buttons.secondary.onClick}
                  className="px-8 py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-300/30 hover:border-orange-300/50 text-orange-100 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

export default Hero
