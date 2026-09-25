import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { marcarBienvenida } from './bienvenida'
import styles from './BienvenidaEscarabajo.module.css'

// Bienvenida del Home (solo la cuenta de Daniel, una vez al dia; el filtro vive
// en PanelPage). El escarabajo actua solo: se asoma en la esquina inferior
// derecha, saluda, se despide y se esconde detras del borde (video 15 de
// Gemini, tramo 3,708 s a 9,125 s). El codigo NO lo mueve: solo un fundido de
// opacidad al aparecer, el tramo una vez y se desmonta en `ended`.
//
// Video con transparencia empaquetada: un MP4 H.264 (450 x 1152) con el color
// premultiplicado arriba (450 x 568), 16 px negros y la mascara abajo. Un
// shader WebGL toma el color de arriba y el alfa de abajo. Safari decodifica
// H.264 por hardware; el WebP animado anterior se decodificaba por CPU y se
// atrasaba en el iPhone. Sin WebGL, o si el navegador no deja reproducir,
// queda el poster quieto.
//
// Vive DENTRO de la barra inferior (portal a [data-nav-inferior]), anclado a su
// borde superior con CSS, sin medir nada con JS.

const VIDEO = '/personaje/home/bienvenida-alfa.mp4'
const POSTER = '/personaje/home/asomado-saludo-poster.webp'
const ANCHO = 450, ALTO = 568, SEPARACION = 16, ALTO_VIDEO = ALTO * 2 + SEPARACION
const DURACION = 5460 // ms, solo para el caso sin video (poster quieto)
const RESPALDO_FUNDIDO = 600 // por si transitionend no llega

const VERTICES = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*0.5,(1.0-p.y)*0.5);gl_Position=vec4(p,0.0,1.0);}'
const FRAGMENTO = `precision mediump float;uniform sampler2D t;varying vec2 uv;
void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*${(ALTO / ALTO_VIDEO).toFixed(6)})).rgb;
float a=texture2D(t,vec2(uv.x,${((ALTO + SEPARACION) / ALTO_VIDEO).toFixed(6)}+uv.y*${(ALTO / ALTO_VIDEO).toFixed(6)})).r;
gl_FragColor=vec4(min(c,vec3(a)),a);}`

// Programa WebGL que compone color + mascara; null si no hay WebGL.
function crearCompositor(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })
  if (!gl) return null
  const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERTICES))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAGMENTO))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.viewport(0, 0, ANCHO, ALTO)
  return (video) => {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

export default function BienvenidaEscarabajo({ userId, alTerminar }) {
  // cargando -> oculto -> visible -> actuando
  const [fase, setFase] = useState('cargando')
  const [fuente, setFuente] = useState(null)
  const [dibujado, setDibujado] = useState(false)
  const [barra] = useState(() => document.querySelector('[data-nav-inferior]'))
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const terminar = useRef(alTerminar)
  terminar.current = alTerminar

  // video completo en la cache del navegador + poster, antes de mostrar nada.
  // El <video> usa la URL normal y no un blob: WebKit no reproduce video desde
  // blob: (error 4 en la prueba con descriptor de iPhone).
  useEffect(() => {
    if (!barra) { terminar.current(); return }
    let vivo = true
    const poster = new Image()
    poster.src = POSTER
    Promise.all([
      fetch(VIDEO).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer() }),
      poster.decode(),
    ]).then(() => { if (vivo) setFuente(VIDEO) }).catch(() => { if (vivo) terminar.current() })
    return () => { vivo = false }
  }, [barra])

  // 'oculto' se pinta un cuadro en opacidad 0 y recien ahi se funde
  useEffect(() => {
    if (fase !== 'oculto') return
    marcarBienvenida(userId)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFase('visible')))
    return () => cancelAnimationFrame(id)
  }, [fase, userId])

  useEffect(() => {
    if (fase !== 'visible') return
    const t = setTimeout(() => setFase('actuando'), RESPALDO_FUNDIDO)
    return () => clearTimeout(t)
  }, [fase])

  // actuando: el video corre y cada cuadro se compone en el canvas
  useEffect(() => {
    if (fase !== 'actuando') return
    const video = videoRef.current
    const dibujar = canvasRef.current && crearCompositor(canvasRef.current)
    let raf = 0
    let quieto = null
    const posterQuieto = () => { quieto = setTimeout(() => terminar.current(), DURACION) }
    if (!dibujar || !video) { posterQuieto(); return () => clearTimeout(quieto) }
    const cuadro = () => {
      dibujar(video)
      if (!video.paused && !video.ended) raf = requestAnimationFrame(cuadro)
    }
    const alTocar = () => { cuadro(); setDibujado(true) }
    const alTerminarVideo = () => { dibujar(video); terminar.current() }
    video.addEventListener('playing', alTocar)
    video.addEventListener('ended', alTerminarVideo)
    video.play().catch(posterQuieto)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(quieto)
      video.removeEventListener('playing', alTocar)
      video.removeEventListener('ended', alTerminarVideo)
    }
  }, [fase])

  const alTerminarFundido = (e) => {
    if (e.target === e.currentTarget && e.propertyName === 'opacity' && fase === 'visible') setFase('actuando')
  }

  if (!fuente || !barra) return null

  return createPortal(
    <div className={styles.capa} aria-hidden="true">
      <div
        className={`${styles.escarabajo} ${fase === 'cargando' || fase === 'oculto' ? '' : styles.visible}`}
        onTransitionEnd={alTerminarFundido}
      >
        {!dibujado && <img className={styles.imagen} src={POSTER} alt="" draggable="false" />}
        <canvas ref={canvasRef} className={styles.imagen} width={ANCHO} height={ALTO} />
        <video
          ref={videoRef}
          className={styles.fuente}
          src={fuente}
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setFase((f) => (f === 'cargando' ? 'oculto' : f))}
          onError={() => terminar.current()}
        />
      </div>
    </div>,
    barra
  )
}
