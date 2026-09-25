import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { marcarBienvenida } from './bienvenida'
import styles from './BienvenidaEscarabajo.module.css'

// Bienvenida del Home (solo la cuenta de Daniel, una vez al dia; el filtro vive
// en PanelPage). El escarabajo actua solo: se asoma en la esquina inferior
// derecha, saluda, se despide y se esconde detras del borde (video 15 de
// Gemini, cuadros 43 a 219: 1,792 s a 9,125 s, con la entrada actuada desde
// detras del borde). El codigo NO lo mueve: solo un fundido de
// opacidad al aparecer, el tramo una vez y se desmonta en `ended`.
//
// Video con transparencia empaquetada: un MP4 H.264 (450 x 1152) con el color
// premultiplicado arriba (450 x 568), 16 px negros y la mascara abajo. Un
// shader WebGL toma el color de arriba y el alfa de abajo.
//
// Arranque: play() apenas el video tiene src (iOS no baja datos antes); WebGL
// se prepara en paralelo y el canvas dibuja desde el evento playing. El video
// nunca se pausa ni se desmonta con un play() pendiente (en el iPhone eso lo
// abortaba).
// Nunca "nada": si play() se rechaza con NotAllowedError (bajo consumo), si no
// hay WebGL, si el video da error, si no hay cuadro 3 s despues de playing o
// si playing no llega en 8 s, queda el poster quieto 4 s y se desmonta.

const VIDEO = '/personaje/home/bienvenida-alfa.mp4'
const POSTER = '/personaje/home/asomado-saludo-poster.webp'
const ANCHO = 450, ALTO = 568, SEPARACION = 16, ALTO_VIDEO = ALTO * 2 + SEPARACION
const POSTER_QUIETO = 4000
const SIN_CUADRO = 3000 // desde el evento playing hasta el primer cuadro dibujado
const SIN_PLAYING = 8000 // seguro: desde loadeddata, si nunca llega playing

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
  // cargando -> oculto -> visible | posterQuieto  (solo la visibilidad; el
  // video y el canvas corren aparte, por eventos)
  const [fase, setFase] = useState('cargando')
  const [fuente, setFuente] = useState(null)
  const [dibujado, setDibujado] = useState(false)
  const [barra] = useState(() => document.querySelector('[data-nav-inferior]'))
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const compRef = useRef(null)
  const rafRef = useRef(0)
  const estado = useRef({ terminado: false, poster: false, arranco: false, playing: false, dibujado: false })
  const terminarRef = useRef(alTerminar)
  terminarRef.current = alTerminar

  const terminar = (porque) => {
    if (estado.current.terminado) return
    estado.current.terminado = true
    cancelAnimationFrame(rafRef.current)
    terminarRef.current()
  }
  // Poster quieto 4 s y fuera. No toca el video: si hay un play() pendiente,
  // sigue pendiente hasta que se desmonte todo.
  const alPoster = (porque) => {
    if (estado.current.poster || estado.current.terminado) return
    estado.current.poster = true
    cancelAnimationFrame(rafRef.current)
    marcarBienvenida(userId)
    setFase('posterQuieto')
    setTimeout(() => terminar('termino el poster quieto'), POSTER_QUIETO)
  }

  // video completo en la cache del navegador + poster, antes de mostrar nada.
  useEffect(() => {
    if (!barra) { terminar('no hay barra inferior'); return }
    let vivo = true
    const poster = new Image()
    poster.src = POSTER
    Promise.allSettled([
      fetch(VIDEO).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() }),
      poster.decode(),
    ]).then(([v, p]) => {
      if (!vivo) return
      if (p.status !== 'fulfilled') { terminar('el poster no decodifica'); return }
      setFuente(VIDEO)
      if (v.status !== 'fulfilled') alPoster('el video no se descargo')
    })
    return () => { vivo = false; cancelAnimationFrame(rafRef.current) }
  }, [barra]) // eslint-disable-line react-hooks/exhaustive-deps

  // 'oculto' se pinta un cuadro en opacidad 0 y recien ahi se funde
  useEffect(() => {
    if (fase !== 'oculto') return
    marcarBienvenida(userId)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFase((f) => (f === 'oculto' ? 'visible' : f))))
    return () => cancelAnimationFrame(id)
  }, [fase, userId])

  // Apenas el <video> tiene src: play() de inmediato, sin esperar ningun
  // evento. iOS Safari no baja datos del video hasta que se llama play(): si se
  // espera loadeddata, nunca llega. WebGL se prepara en el mismo momento.
  useEffect(() => {
    if (!fuente || estado.current.arranco) return
    estado.current.arranco = true
    const video = videoRef.current
    let p
    try { p = video.play() } catch (e) { p = Promise.reject(e) }
    // NotAllowedError: iOS en bajo consumo no deja reproducir
    Promise.resolve(p).catch((e) => {
      if (e && e.name === 'NotAllowedError') alPoster('play() rechazado (NotAllowedError)')
    })
    const comp = canvasRef.current ? crearCompositor(canvasRef.current) : { error: 'no hay canvas' }
    if (!comp.dibujar) { alPoster(comp.error); return }
    compRef.current = comp
    setTimeout(() => { if (!estado.current.playing) alPoster(`playing no llego en ${SIN_PLAYING} ms desde play()`) }, SIN_PLAYING)
  }, [fuente]) // eslint-disable-line react-hooks/exhaustive-deps

  // el fundido de entrada parte con lo primero que llegue: loadeddata o playing
  const alCargarDatos = () => {
    setFase((f) => (f === 'cargando' ? 'oculto' : f))
  }

  // playing: arranca el dibujo y el vigilante de 3 s al primer cuadro
  const alReproducir = () => {
    setFase((f) => (f === 'cargando' ? 'oculto' : f))
    if (estado.current.playing) return
    estado.current.playing = true
    setTimeout(() => { if (!estado.current.dibujado) alPoster(`ningun cuadro dibujado ${SIN_CUADRO} ms despues de playing`) }, SIN_CUADRO)
    const video = videoRef.current
    const cuadro = () => {
      const comp = compRef.current
      if (!comp || estado.current.poster || estado.current.terminado) return
      const primero = !estado.current.dibujado
      const px = comp.dibujar(video, primero)
      // cuenta como dibujado solo si el pixel del cuerpo trae contenido (alfa > 0):
      // al llegar playing la textura puede venir vacia un instante, y el poster
      // tiene que seguir a la vista hasta que haya un cuadro de verdad
      if (primero && px && Number(px.split(',')[3].split(' ')[0]) > 0) { estado.current.dibujado = true; setDibujado(true) }
      if (!video.ended) rafRef.current = requestAnimationFrame(cuadro)
    }
    cuadro()
  }

  const alTerminarVideo = () => {
    if (compRef.current && !estado.current.poster) compRef.current.dibujar(videoRef.current, false)
    if (!estado.current.poster) terminar('evento ended del video')
  }

  if (!fuente || !barra) return null
  // El tramo parte casi vacio (el escarabajo todavia escondido y se asoma), asi
  // que el poster (ya asomado) no va debajo del canvas al empezar: solo en el
  // fallback.
  const posterVisible = fase === 'posterQuieto'

  return createPortal(
    <div className={styles.capa} aria-hidden="true">
      <div className={`${styles.escarabajo} ${fase === 'cargando' || fase === 'oculto' ? '' : styles.visible}`}>
        {posterVisible && <img className={styles.imagen} src={POSTER} alt="" draggable="false" />}
        <canvas ref={canvasRef} className={`${styles.imagen} ${fase === 'posterQuieto' ? styles.apagado : ''}`} width={ANCHO} height={ALTO} />
        <video
          ref={videoRef}
          className={styles.fuente}
          src={fuente}
          muted
          playsInline
          autoPlay
          preload="auto"
          onLoadedData={alCargarDatos}
          onPlaying={alReproducir}
          onEnded={alTerminarVideo}
          onError={(e) => { const er = e.currentTarget.error; alPoster(`error del video (codigo ${er && er.code})`) }}
        />
      </div>
    </div>,
    barra
  )
}
