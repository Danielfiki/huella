import React, { useEffect, useRef, useState } from 'react'
import styles from './PensandoEscarabajo.module.css'

// El escarabajo pensando en loop, en el lugar de los tres puntitos de
// AlivioHuella mientras la IA lee el episodio. Misma tecnica que la bienvenida:
// MP4 con transparencia empaquetada (color premultiplicado arriba, 16 px, mascara
// abajo) compuesto con WebGL en un canvas a 3x del tamano en pantalla. El codigo
// no lo mueve: solo un fundido al aparecer y otro de 150 ms al irse.
//
// - play() apenas el video tiene src (iOS no baja datos antes de play()).
// - Sin atributo loop: en WebKit el loop se detiene al final; se reinicia en ended.
// - Avisa `alReproducir` en el evento playing; el padre decide si quedan los
//   puntitos (si playing no llega a tiempo, el padre lo desmonta).
// - Si despues de playing no hay un cuadro con cuerpo en 3 s, avisa `alFallar`.
// - Con `visible` en false se desvanece y avisa `alTerminar` para desmontarse.

const SEPARACION = 16
const SIN_CUADRO = 3000
const SALIDA = 150
// 1 pixel del cuerpo (x, y desde arriba) opaco en todos los cuadros del loop
const PIXEL_CUERPO = { rascando: [181, 420] }

const VERTICES = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.0)*0.5,(1.0-p.y)*0.5);gl_Position=vec4(p,0.0,1.0);}'
const fragmento = (ALTO, ALTO_VIDEO) => `precision mediump float;uniform sampler2D t;varying vec2 uv;
void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*${(ALTO / ALTO_VIDEO).toFixed(6)})).rgb;
float a=texture2D(t,vec2(uv.x,${((ALTO + SEPARACION) / ALTO_VIDEO).toFixed(6)}+uv.y*${(ALTO / ALTO_VIDEO).toFixed(6)})).r;
gl_FragColor=vec4(min(c,vec3(a)),a);}`

function crearCompositor(canvas, variante) {
  const { ancho: ANCHO, alto: ALTO } = variante
  let gl = null
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }) } catch { return null }
  if (!gl) return null
  const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERTICES))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fragmento(ALTO, ALTO * 2 + SEPARACION)))
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
  const [px0, py0] = PIXEL_CUERPO[variante.id]
  // dibuja el cuadro; con `leer` devuelve el alfa de un pixel del cuerpo
  return (video, leer) => {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!leer) return 0
    const px = new Uint8Array(4)
    gl.readPixels(px0, ALTO - py0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return px[3]
  }
}

export default function PensandoEscarabajo({ variante, visible, alReproducir, alDibujar, alFallar, alTerminar, className = '' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const dibujarRef = useRef(null)
  const rafRef = useRef(0)
  const estado = useRef({ playing: false, dibujado: false, fin: false })
  const [dibujado, setDibujado] = useState(false)
  const cb = useRef({})
  cb.current = { alReproducir, alDibujar, alFallar, alTerminar }

  // play() de inmediato; WebGL en paralelo
  useEffect(() => {
    const video = videoRef.current
    dibujarRef.current = canvasRef.current ? crearCompositor(canvasRef.current, variante) : null
    if (!dibujarRef.current) { cb.current.alFallar?.(); return undefined }
    let p
    try { p = video.play() } catch (e) { p = Promise.reject(e) }
    Promise.resolve(p).catch(() => { /* el padre deja los puntitos si playing no llega */ })
    return () => { estado.current.fin = true; cancelAnimationFrame(rafRef.current) }
  }, [variante])

  // salida: fundido de 150 ms y fuera
  useEffect(() => {
    if (visible) return undefined
    const id = setTimeout(() => { cancelAnimationFrame(rafRef.current); cb.current.alTerminar?.() }, SALIDA)
    return () => clearTimeout(id)
  }, [visible])

  const alReproducirVideo = () => {
    if (estado.current.playing) return
    estado.current.playing = true
    cb.current.alReproducir?.()
    setTimeout(() => { if (!estado.current.dibujado && !estado.current.fin) cb.current.alFallar?.() }, SIN_CUADRO)
    const video = videoRef.current
    const cuadro = () => {
      if (estado.current.fin || !dibujarRef.current) return
      const primero = !estado.current.dibujado
      const alfa = dibujarRef.current(video, primero)
      if (primero && alfa > 0) { estado.current.dibujado = true; setDibujado(true); cb.current.alDibujar?.() }
      rafRef.current = requestAnimationFrame(cuadro)
    }
    cuadro()
  }

  // loop a mano: en WebKit el atributo loop se queda en pausa al final
  const alTerminarVideo = () => {
    const video = videoRef.current
    video.currentTime = 0
    const p = video.play()
    if (p && p.catch) p.catch(() => {})
  }

  return (
    <div className={`${styles.capa} ${styles[variante.id]} ${className} ${dibujado && visible ? styles.visible : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.imagen} width={variante.ancho} height={variante.alto} />
      <video
        ref={videoRef}
        className={styles.fuente}
        src={variante.video}
        muted
        playsInline
        autoPlay
        preload="auto"
        onPlaying={alReproducirVideo}
        onEnded={alTerminarVideo}
        onError={() => cb.current.alFallar?.()}
      />
    </div>
  )
}
