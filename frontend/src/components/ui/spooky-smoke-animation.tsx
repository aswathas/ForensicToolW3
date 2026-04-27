import { useEffect, useRef } from 'react'

const FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;
#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}
void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);
  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);
  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);
  col=mix(col,u_color,dot(col,vec3(.21,.71,.07)));
  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r
    ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
    : [0.5, 0.5, 0.5]
}

class SmokeRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram | null = null
  private vs: WebGLShader | null = null
  private fs: WebGLShader | null = null
  private buffer: WebGLBuffer | null = null
  private color: [number, number, number] = [0.5, 0.5, 0.5]

  constructor(private canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl2')!
    this.build()
  }

  private compile(type: number, src: string): WebGLShader {
    const s = this.gl.createShader(type)!
    this.gl.shaderSource(s, src)
    this.gl.compileShader(s)
    return s
  }

  private build() {
    const { gl } = this
    this.vs = this.compile(gl.VERTEX_SHADER, VERT)
    this.fs = this.compile(gl.FRAGMENT_SHADER, FRAG)
    this.program = gl.createProgram()!
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)

    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW)

    const pos = gl.getAttribLocation(this.program, 'position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const p = this.program as any
    p._res   = gl.getUniformLocation(this.program, 'resolution')
    p._time  = gl.getUniformLocation(this.program, 'time')
    p._color = gl.getUniformLocation(this.program, 'u_color')
  }

  setColor(hex: string) { this.color = hexToRgb(hex) }

  resize() {
    const dpr = Math.max(1, window.devicePixelRatio)
    this.canvas.width  = this.canvas.clientWidth  * dpr
    this.canvas.height = this.canvas.clientHeight * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  render(now: number) {
    const { gl, program, buffer } = this
    if (!program) return
    const p = program as any
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.uniform2f(p._res, this.canvas.width, this.canvas.height)
    gl.uniform1f(p._time, now * 1e-3)
    gl.uniform3fv(p._color, this.color)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    const { gl, program, vs, fs } = this
    if (!program) return
    if (vs) { gl.detachShader(program, vs); gl.deleteShader(vs) }
    if (fs) { gl.detachShader(program, fs); gl.deleteShader(fs) }
    gl.deleteProgram(program)
  }
}

interface SmokeBackgroundProps {
  smokeColor?: string
  className?: string
  style?: React.CSSProperties
}

export function SmokeBackground({
  smokeColor = '#808080',
  className = '',
  style,
}: SmokeBackgroundProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<SmokeRenderer | null>(null)
  const rafRef      = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new SmokeRenderer(canvas)
    rendererRef.current = renderer
    renderer.setColor(smokeColor)
    renderer.resize()

    const onResize = () => renderer.resize()
    window.addEventListener('resize', onResize)

    const loop = (now: number) => {
      renderer.render(now)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafRef.current)
      renderer.destroy()
    }
  }, [])

  useEffect(() => {
    rendererRef.current?.setColor(smokeColor)
  }, [smokeColor])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  )
}
