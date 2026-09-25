import React, { useEffect, useRef, useState } from 'react'
import { marcarBienvenida } from './bienvenida'
import styles from './BienvenidaEscarabajo.module.css'

// Bienvenida del Home (solo la cuenta de Daniel, una vez al dia; el filtro vive
// en PanelPage). El escarabajo se asoma desde el borde derecho de la pantalla:
// entra deslizandose con el primer cuadro quieto, saluda una vez (WebP animado
// de 5 s, sin bucle) y sale hacia la derecha. Al terminar se desmonta.
//
// El WebP se baja como blob y se muestra con una URL propia: asi el saludo
// arranca siempre desde el primer cuadro, aunque el navegador ya lo tenga en
// memoria de una vuelta anterior (con la misma URL quedaria en el ultimo).

const SALUDO = '/personaje/home/asomado-saludo.webp'
const POSTER = '/personaje/home/asomado-saludo-poster.webp'
const DURACION_SALUDO = 5040 // ms, 90 cuadros a 18 fps
const PAUSA_ANTES_DE_SALIR = 400
const RESPALDO_TRANSICION = 1200 // por si transitionend no llega

export default function BienvenidaEscarabajo({ userId, alTerminar }) {
  // cargando -> fuera -> entrando -> saludando -> saliendo
  const [fase, setFase] = useState('cargando')
  const [saludo, setSaludo] = useState(null)
  const [animado, setAnimado] = useState(false)
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
      setFase('fuera')
    }).catch(() => { if (vivo) terminar.current() })
    return () => { vivo = false; if (url) URL.revokeObjectURL(url) }
  }, [])

  // 'fuera' se pinta un cuadro fuera de pantalla y recien ahi entra
  useEffect(() => {
    if (fase !== 'fuera') return
    marcarBienvenida(userId)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFase('entrando')))
    return () => cancelAnimationFrame(id)
  }, [fase, userId])

  useEffect(() => {
    if (fase === 'entrando') {
      const t = setTimeout(() => setFase('saludando'), RESPALDO_TRANSICION)
      return () => clearTimeout(t)
    }
    if (fase === 'saludando' && animado) {
      const t = setTimeout(() => setFase('saliendo'), DURACION_SALUDO + PAUSA_ANTES_DE_SALIR)
      return () => clearTimeout(t)
    }
    if (fase === 'saliendo') {
      const t = setTimeout(() => terminar.current(), RESPALDO_TRANSICION)
      return () => clearTimeout(t)
    }
  }, [fase, animado])

  const alTerminarTransicion = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (fase === 'entrando') setFase('saludando')
    else if (fase === 'saliendo') terminar.current()
  }

  if (fase === 'cargando') return null

  const dentro = fase === 'entrando' || fase === 'saludando'
  return (
    <div className={styles.capa} aria-hidden="true">
      <div
        className={`${styles.escarabajo} ${dentro ? styles.dentro : ''} ${fase === 'saliendo' ? styles.saliendo : ''}`}
        onTransitionEnd={alTerminarTransicion}
      >
        {!animado && <img className={styles.imagen} src={POSTER} alt="" draggable="false" />}
        {fase !== 'fuera' && fase !== 'entrando' && (
          <img className={styles.imagen} src={saludo} alt="" draggable="false" onLoad={() => setAnimado(true)} />
        )}
      </div>
    </div>
  )
}
