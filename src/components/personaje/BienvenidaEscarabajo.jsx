import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { marcarBienvenida } from './bienvenida'
import styles from './BienvenidaEscarabajo.module.css'

// Bienvenida del Home (solo la cuenta de Daniel, una vez al dia; el filtro vive
// en PanelPage). El escarabajo actua solo: se asoma en la esquina inferior
// derecha, saluda, se despide y se esconde detras del borde (video 15 de
// Gemini, tramo 3,708 s a 9,125 s). El codigo NO lo mueve: solo un fundido de
// opacidad en el primer cuadro, el tramo una vez y se desmonta cuando el WebP
// termina, en un cuadro ya vacio.
//
// Vive DENTRO de la barra inferior (portal a [data-nav-inferior]), anclado a su
// borde superior con CSS: el corte del cuerpo queda pegado a la barra en
// cualquier alto de pantalla, con la zona segura del iPhone y con la barra de
// Safari visible o escondida, sin medir nada con JS.
//
// El WebP se baja como blob y se muestra con una URL propia: asi arranca
// siempre desde el primer cuadro, aunque el navegador ya lo tenga en memoria
// de una vuelta anterior (con la misma URL quedaria en el ultimo).

const SALUDO = '/personaje/home/asomado-saludo.webp'
const POSTER = '/personaje/home/asomado-saludo-poster.webp'
const DURACION_SALUDO = 5400 // ms, 120 cuadros a 22 fps; el ultimo esta vacio
// Safari no se salta cuadros si no alcanza a decodificarlos: los atrasa, y el
// saludo puede durar mas que 5,4 s. Como el ultimo cuadro esta vacio y el WebP
// no se repite, quedar montado de mas no se ve: se desmonta con margen amplio
// para no cortarlo nunca antes de que se esconda.
const MARGEN_FINAL = DURACION_SALUDO
const RESPALDO_FUNDIDO = 600 // por si transitionend no llega

export default function BienvenidaEscarabajo({ userId, alTerminar }) {
  // cargando -> oculto -> visible -> saludando
  const [fase, setFase] = useState('cargando')
  const [saludo, setSaludo] = useState(null)
  const [animado, setAnimado] = useState(false)
  const [barra] = useState(() => document.querySelector('[data-nav-inferior]'))
  const terminar = useRef(alTerminar)
  terminar.current = alTerminar

  // blob del saludo + poster en cache antes de mostrar nada
  useEffect(() => {
    if (!barra) { terminar.current(); return }
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
  }, [barra])

  // 'oculto' se pinta un cuadro en opacidad 0 y recien ahi se funde
  useEffect(() => {
    if (fase !== 'oculto') return
    marcarBienvenida(userId)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFase('visible')))
    return () => cancelAnimationFrame(id)
  }, [fase, userId])

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

  if (fase === 'cargando' || !barra) return null

  return createPortal(
    <div className={styles.capa} aria-hidden="true">
      <div
        className={`${styles.escarabajo} ${fase === 'oculto' ? '' : styles.visible}`}
        onTransitionEnd={alTerminarFundido}
      >
        {!animado && <img className={styles.imagen} src={POSTER} alt="" draggable="false" />}
        {fase === 'saludando' && (
          <img className={styles.imagen} src={saludo} alt="" draggable="false" onLoad={() => setAnimado(true)} />
        )}
      </div>
    </div>,
    barra
  )
}
