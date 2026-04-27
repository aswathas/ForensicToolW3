import React, { useRef, useEffect, useCallback } from 'react'

interface DitheringShaderProps {
  shape?: 'wave' | 'plasma' | 'noise'
  type?: '8x8' | '4x4'
  colorBack?: string
  colorFront?: string
  pxSize?: number
  speed?: number
  className?: string
  style?: React.CSSProperties
}

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r
    ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
    : [0, 0, 0]
}

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main() { gl_Position = position; }`

function buildFrag(shape: string, matSize: number) {
  const matrix8 = `float[64](
    0.,32., 8.,40., 2.,34.,10.,42.,
   48.,16.,56.,24.,50.,18.,58.,26.,
   12.,44., 4.,36.,14.,46., 6.,38.,
   60.,28.,52.,20.,62.,30.,54.,22.,
    3.,35.,11.,43., 1.,33., 9.,41.,
   51.,19.,59.,27.,49.,17.,57.,25.,
   15.,47., 7.,39.,13.,45., 5.,37.,
   63.,31.,55.,23.,61.,29.,53.,21.)`

  const matrix4 = `float[16](
    0., 8., 2.,10.,
   12., 4.,14., 6.,
    3.,11., 1., 9.,
   15., 7.,13., 5.)`

  const matDecl = matSize === 8
    ? `const float BAYER[64] = ${matrix8};`
    : `const float BAYER[16] = ${matrix4};`

  const thresholdCode = matSize === 8
    ? `int bx = int(mod(floor(gl_FragCoord.x / px), 8.0));
   int by = int(mod(floor(gl_FragCoord.y / px), 8.0));
   float threshold = BAYER[by * 8 + bx] / 64.0;`
    : `int bx = int(mod(floor(gl_FragCoord.x / px), 4.0));
   int by = int(mod(floor(gl_FragCoord.y / px), 4.0));
   float threshold = BAYER[by * 4 + bx] / 16.0;`

  const fieldCode = shape === 'wave'
    ? `float field = 0.5 + 0.5 * sin(uv.x * 7.0 + t + sin(uv.y * 5.0 + t * 0.8) * 1.8);
   field = mix(field, 0.5 + 0.4 * sin(uv.y * 5.0 - t * 0.6 + uv.x * 3.0), 0.35);`
    : shape === 'plasma'
    ? `float field = sin(uv.x * 8.0 + t) * sin(uv.y * 6.0 + t * 0.7);
   field = (field + sin(length(uv - 0.5) * 12.0 - t * 1.2)) * 0.5 + 0.5;`
    : `float nx = fract(sin(dot(floor(uv * 12.0 + t * 0.4), vec2(127.1, 311.7))) * 43758.5);
   float ny = fract(sin(dot(floor(uv * 8.0 - t * 0.2), vec2(269.5, 183.3))) * 12345.6);
   float field = mix(nx, ny, 0.5);`

  return `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 resolution;
uniform float time;
uniform float speed;
uniform float px;
uniform vec3 colorBack;
uniform vec3 colorFront;

${matDecl}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float t = time * speed;

  ${fieldCode}
  field = clamp(field, 0.0, 1.0);

  ${thresholdCode}

  vec3 col = field > threshold ? colorFront : colorBack;
  fragColor = vec4(col, 1.0);
}`
}

export const DitheringShader: React.FC<DitheringShaderProps> = ({
  shape = 'wave',
  type = '8x8',
  colorBack = '#000000',
  colorFront = '#ffffff',
  pxSize = 4,
  speed = 1.0,
  className = '',
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<{
    gl: WebGL2RenderingContext
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation | null>
    start: number
  } | null>(null)

  const destroy = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (stateRef.current) {
      stateRef.current.gl.getExtension('WEBGL_lose_context')?.loseContext()
      stateRef.current = null
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    destroy()

    const gl = canvas.getContext('webgl2')
    if (!gl) return

    const matSize = type === '8x8' ? 8 : 4
    const fragSrc = buildFrag(shape, matSize)

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc)
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      speed: gl.getUniformLocation(program, 'speed'),
      px: gl.getUniformLocation(program, 'px'),
      colorBack: gl.getUniformLocation(program, 'colorBack'),
      colorFront: gl.getUniformLocation(program, 'colorFront'),
    }

    stateRef.current = { gl, program, uniforms, start: performance.now() }

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio * 0.5)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const [br, bg, bb] = hexToRgb(colorBack)
    const [fr, fg, fb] = hexToRgb(colorFront)

    const loop = (now: number) => {
      const st = stateRef.current
      if (!st) return
      const elapsed = (now - st.start) * 0.001

      gl.useProgram(st.program)
      gl.uniform2f(st.uniforms.resolution, canvas.width, canvas.height)
      gl.uniform1f(st.uniforms.time, elapsed)
      gl.uniform1f(st.uniforms.speed, speed)
      gl.uniform1f(st.uniforms.px, pxSize)
      gl.uniform3f(st.uniforms.colorBack, br, bg, bb)
      gl.uniform3f(st.uniforms.colorFront, fr, fg, fb)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      destroy()
    }
  }, [shape, type, colorBack, colorFront, pxSize, speed, destroy])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  )
}
