import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { marcarBienvenida } from './bienvenida'
import { diag } from './diagnostico'
import styles from './BienvenidaEscarabajo.module.css'

// Bienvenida del Home (solo la cuenta de Daniel, una vez al dia; el filtro vive
// en PanelPage). El escarabajo actua solo: se asoma en la esquina inferior
// derecha, saluda, se despide y se esconde detras del borde (video 15 de
// Gemini, tramo 3,708 s a 9,125 s). El codigo NO lo mueve: solo un fundido de
// opacidad al aparecer, el tramo una vez y se desmonta en `ended`.
//
// Video con transparencia empaquetada: un MP4 H.264 (450 x 1152) con el color
// premultiplicado arriba (450 x 568), 16 px negros y la mascara abajo. Un
// shader WebGL toma el color de arriba y el alfa de abajo.
//
// Nunca "nada": si play() falla, si no hay WebGL, si el video da error o si no
// llega ningun cuadro en 1,5 s, queda el poster quieto 4 s y se desmonta.
//
// TEMPORAL: cada paso se anota en el diagnostico (diag) para el bug del iPhone.

const VIDEO = '/personaje/home/bienvenida-alfa.mp4'
const POSTER = '/personaje/home/asomado-saludo-poster.webp'
const ANCHO = 450, ALTO = 568, SEPARACION = 16, ALTO_VIDEO = ALTO * 2 + SEPARACION
const POSTER_QUIETO = 4000
const SIN_CUADRO = 1500
const RESPALDO_FUNDIDO = 600 // por si transitionend no llega

const VERTICES = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*0.5,(1.0-p.y)*0.5);gl_Position=vec4(p,0.0,1.0);}'
const FRAGMENTO = `precision mediump float;uniform sampler2D t;varying vec2 uv;
void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*${(ALTO / ALTO_VIDEO).toFixed(6)})).rgb;
float a=texture2D(t,vec2(uv.x,${((ALTO + SEPARACION) / ALTO_VIDEO).toFixed(6)}+uv.y*${(ALTO / ALTO_VIDEO).toFixed(6)})).r;
gl_FragColor=vec4(min(c,vec3(a)),a);}`

// Programa WebGL que compone color + mascara. Devuelve { dibujar } o { error }.
function crearCompositor(canvas) {
  let gl = null
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }) } catch (e) { return { error: `getContext lanzo ${e.name}: ${e.message}` } }
  if (!gl) return { error: 'getContext(webgl) devolvio null' }
  const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERTICES))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAGMENTO))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return { error: `shader no enlaza: ${gl.getProgramInfoLog(prog)}` }
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
  const dibujar = (video, leer) => {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!leer) return null
    // 1 pixel del cuerpo (x 330, y 450 desde arriba), leido en el mismo cuadro
    const px = new Uint8Array(4)
    gl.readPixels(330, ALTO - 450, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return `${px.join(',')} glError=${gl.getError()}`
  }
  return { dibujar }
}

export default function BienvenidaEscarabajo({ userId, alTerminar }) {
  // cargando -> oculto -> visible -> actuando | posterQuieto
  const [fase, setFase] = useState('cargando')
  const faseRef = useRef(fase)
  faseRef.current = fase
  const [fuente, setFuente] = useState(null)
  const [dibujado, setDibujado] = useState(false)
  const [barra] = useState(() => document.querySelector('[data-nav-inferior]'))
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const terminado = useRef(false)
  const terminarRef = useRef(alTerminar)
  terminarRef.current = alTerminar
  const terminar = (porque) => {
    if (terminado.current) return
    terminado.current = true
    diag(`capa desmontada: ${porque}`)
    terminarRef.current()
  }
  const alPoster = (porque) => {
    diag(`fallback poster quieto 4 s: ${porque}`)
    setFase('posterQuieto')
  }

  // video completo en la cache del navegador + poster, antes de mostrar nada.
  useEffect(() => {
    diag(`bienvenida montada; barra ${barra ? 'encontrada' : 'NO encontrada'}`)
    if (!barra) { terminar('no hay barra inferior'); return }
    let vivo = true
    const poster = new Image()
    poster.src = POSTER
    Promise.allSettled([
      fetch(VIDEO).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() }),
      poster.decode(),
    ]).then(([v, p]) => {
      if (!vivo) return
      diag(`video descargado: ${v.status === 'fulfilled' ? `ok ${Math.round(v.value.byteLength / 1024)} KB` : `error ${v.reason}`}`)
      diag(`poster decodificado: ${p.status === 'fulfilled' ? 'ok' : `error ${p.reason}`}`)
      if (p.status !== 'fulfilled') { terminar('el poster no decodifica'); return }
      setFuente(VIDEO)
      if (v.status !== 'fulfilled') alPoster('el video no se descargo')
    })
    return () => { vivo = false }
  }, [barra]) // eslint-disable-line react-hooks/exhaustive-deps

  // si no llega ningun cuadro 1,5 s despues de montar el video: poster quieto
  useEffect(() => {
    if (!fuente || dibujado) return
    const t = setTimeout(() => {
      if (faseRef.current === 'posterQuieto') return
      alPoster(`ningun cuadro dibujado ${SIN_CUADRO} ms despues de montar el video (fase ${faseRef.current})`)
    }, SIN_CUADRO)
    return () => clearTimeout(t)
  }, [fuente, dibujado]) // eslint-disable-line react-hooks/exhaustive-deps

  // 'oculto' se pinta un cuadro en opacidad 0 y recien ahi se funde
  useEffect(() => {
    if (fase !== 'oculto') return
    marcarBienvenida(userId)
    diag('marca del dia puesta; fundido de entrada')
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFase('visible')))
    return () => cancelAnimationFrame(id)
  }, [fase, userId])

  useEffect(() => {
    if (fase === 'visible') {
      const t = setTimeout(() => setFase('actuando'), RESPALDO_FUNDIDO)
      return () => clearTimeout(t)
    }
    if (fase === 'posterQuieto') {
      marcarBienvenida(userId)
      const t = setTimeout(() => terminar('termino el poster quieto'), POSTER_QUIETO)
      return () => clearTimeout(t)
    }
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  // actuando: el video corre y cada cuadro se compone en el canvas
  useEffect(() => {
    if (fase !== 'actuando') return
    const video = videoRef.current
    const comp = canvasRef.current ? crearCompositor(canvasRef.current) : { error: 'no hay canvas' }
    diag(`WebGL: ${comp.dibujar ? 'si' : `no (${comp.error})`}`)
    if (!comp.dibujar || !video) { alPoster(comp.error || 'no hay video'); return }
    let raf = 0
    let primero = true
    const cuadro = () => {
      const px = comp.dibujar(video, primero)
      if (primero) { primero = false; diag(`primer cuadro dibujado; pixel del cuerpo rgba=${px}`); setDibujado(true) }
      if (!video.paused && !video.ended) raf = requestAnimationFrame(cuadro)
    }
    const alTocar = () => cuadro()
    const alTerminarVideo = () => { comp.dibujar(video, false); terminar('evento ended del video') }
    video.addEventListener('playing', alTocar)
    video.addEventListener('ended', alTerminarVideo)
    let p
    try { p = video.play() } catch (e) { p = Promise.reject(e) }
    Promise.resolve(p).then(() => diag('play(): ok')).catch((e) => {
      diag(`play(): ${e && e.name}: ${e && e.message}${e && e.name === 'NotAllowedError' ? '  -> probable modo de bajo consumo' : ''}`)
      alPoster(`play() rechazado (${e && e.name})`)
    })
    return () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('playing', alTocar)
      video.removeEventListener('ended', alTerminarVideo)
    }
  }, [fase]) // eslint-disable-line react-hooks/exhaustive-deps

  const alTerminarFundido = (e) => {
    if (e.target === e.currentTarget && e.propertyName === 'opacity' && fase === 'visible') setFase('actuando')
  }

  if (!fuente || !barra) return null
  const ev = (nombre) => () => diag(`video: ${nombre}`)
  const posterVisible = !dibujado || fase === 'posterQuieto'

  return createPortal(
    <div className={styles.capa} aria-hidden="true">
      <div
        className={`${styles.escarabajo} ${fase === 'cargando' || fase === 'oculto' ? '' : styles.visible}`}
        onTransitionEnd={alTerminarFundido}
      >
        {posterVisible && <img className={styles.imagen} src={POSTER} alt="" draggable="false" />}
        {fase !== 'posterQuieto' && <canvas ref={canvasRef} className={styles.imagen} width={ANCHO} height={ALTO} />}
        {fase !== 'posterQuieto' && (
          <video
            ref={videoRef}
            className={styles.fuente}
            src={fuente}
            muted
            playsInline
            preload="auto"
            onLoadStart={ev('loadstart')}
            onLoadedMetadata={ev('loadedmetadata')}
            onCanPlay={ev('canplay')}
            onPlaying={ev('playing')}
            onEnded={ev('ended')}
            onLoadedData={() => { diag('video: loadeddata'); setFase((f) => (f === 'cargando' ? 'oculto' : f)) }}
            onError={(e) => { const er = e.currentTarget.error; diag(`video: error codigo ${er && er.code} ${er && er.message}`); alPoster(`error del video (codigo ${er && er.code})`) }}
          />
        )}
      </div>
    </div>,
    barra
  )
}
