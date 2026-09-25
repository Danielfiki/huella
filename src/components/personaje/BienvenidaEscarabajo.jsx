import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { marcarBienvenida } from './bienvenida'
import styles from './BienvenidaEscarabajo.module.css'

// Bienvenida del Home (solo la cuenta de Daniel, una vez al dia; el filtro vive
// en PanelPage). El escarabajo actua solo, sin movimiento por codigo: se asoma
// en la esquina inferior derecha, saluda, se despide y se esconde detras del
// borde de la pantalla (video 15 de Gemini, tramo 3,708 s a 9,125 s). Aparece
// con un fundido en el primer cuadro y se desmonta cuando el WebP termina, en
// un cuadro ya vacio.
//
// El WebP se baja como blob y se muestra con una URL propia: asi arranca
// siempre desde el primer cuadro, aunque el navegador ya lo tenga en memoria
// de una vuelta anterior (con la misma URL quedaria en el ultimo).

const SALUDO = '/personaje/home/asomado-saludo.webp'
const POSTER = '/personaje/home/asomado-saludo-poster.webp'
const DURACION_SALUDO = 5500 // ms, 131 cuadros a 24 fps; el ultimo esta vacio
const MARGEN_FINAL = 150
const RESPALDO_FUNDIDO = 600 // por si transitionend no llega

// Geometria del archivo (270 px): la linea donde se corta el cuerpo esta al
// 92,58 % del ancho; lo que sigue son los dedos, que quedan fuera de pantalla.
const CORTE = 0.92578
const ANCHO = 150
const ANCHO_MIN = 130
const DISTANCIA_AL_MAS = 8

// Borde superior de la barra inferior y lado derecho del +, medidos en vivo:
// el alto de la barra cambia con la zona segura del iPhone.
function medir() {
  const nav = document.querySelector('[data-nav-inferior]')
  const mas = document.querySelector('[data-nav-registrar]')
  const pantalla = window.innerWidth
  const borde = nav ? nav.getBoundingClientRect().top : window.innerHeight
  const cabe = mas ? (pantalla - mas.getBoundingClientRect().right - DISTANCIA_AL_MAS) / CORTE : ANCHO
  return { borde, ancho: Math.max(ANCHO_MIN, Math.min(ANCHO, Math.floor(cabe))) }
}

export default function BienvenidaEscarabajo({ userId, alTerminar }) {
  // cargando -> oculto -> visible -> saludando
  const [fase, setFase] = useState('cargando')
  const [saludo, setSaludo] = useState(null)
  const [animado, setAnimado] = useState(false)
  const [geo, setGeo] = useState(null)
  const terminar = useRef(alTerminar)
  terminar.current = alTerminar

  // blob del saludo + poster en cache antes de mostrar nada
  useEffect(() => {
    let vivo = true
    let url = null
    const poster = new Image()
    poster.src = POSTER
    Promise.all([
      fetch(SALUDO).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob() }),
      poster.decode(),
    ]).then(([blob]) => {
      if (!vivo) return
      url = URL.createObjectURL(blob)
      setSaludo(url)
      setFase('oculto')
    }).catch(() => { if (vivo) terminar.current() })
    return () => { vivo = false; if (url) URL.revokeObjectURL(url) }
  }, [])

  useLayoutEffect(() => {
    if (fase === 'cargando') return
    const actualizar = () => setGeo(medir())
    actualizar()
    window.addEventListener('resize', actualizar)
    return () => window.removeEventListener('resize', actualizar)
  }, [fase === 'cargando'])

  // 'oculto' se pinta un cuadro en opacidad 0 y recien ahi se funde
  useEffect(() => {
    if (fase !== 'oculto' || !geo) return
    marcarBienvenida(userId)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFase('visible')))
    return () => cancelAnimationFrame(id)
  }, [fase, geo, userId])

  useEffect(() => {
    if (fase === 'visible') {
      const t = setTimeout(() => setFase('saludando'), RESPALDO_FUNDIDO)
      return () => clearTimeout(t)
    }
    if (fase === 'saludando' && animado) {
      const t = setTimeout(() => terminar.current(), DURACION_SALUDO + MARGEN_FINAL)
      return () => clearTimeout(t)
    }
  }, [fase, animado])

  const alTerminarFundido = (e) => {
    if (e.target === e.currentTarget && e.propertyName === 'opacity' && fase === 'visible') setFase('saludando')
  }

  if (fase === 'cargando' || !geo) return null

  // En body y no dentro de la pagina: mientras la pagina entra con transform,
  // un fixed dentro de ella se mediria contra la pagina y no contra la pantalla.
  return createPortal(
    <div className={styles.capa} style={{ height: geo.borde }} aria-hidden="true">
      <div
        className={`${styles.escarabajo} ${fase === 'oculto' ? '' : styles.visible}`}
        style={{ width: geo.ancho, right: -geo.ancho * (1 - CORTE) }}
        onTransitionEnd={alTerminarFundido}
      >
        {!animado && <img className={styles.imagen} src={POSTER} alt="" draggable="false" />}
        {fase === 'saludando' && (
          <img className={styles.imagen} src={saludo} alt="" draggable="false" onLoad={() => setAnimado(true)} />
        )}
      </div>
    </div>,
    document.body
  )
}
