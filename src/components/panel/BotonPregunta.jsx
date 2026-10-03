import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './BotonPregunta.module.css'

// Circulo "?" del Home: acceso directo a "Preguntar a Huella". Vive DENTRO de la
// barra inferior (portal a [data-nav-inferior]), igual que la capa del
// escarabajo: asi queda fijo al bajar y por delante del escarabajo que sube
// desde detras de la barra (la capa va con z-index -1; el circulo, 1).
//
// `oculto`: se esconde con un fundido (p. ej. mientras corre la bienvenida).
// `evitarRef`: un elemento que el circulo nunca tapa ("Registrar un momento").
// Si al desplazar se solaparian, el circulo se esconde y vuelve con un fundido
// apenas ese elemento sale de su zona.
// `alCambiarVisible(visible)`: avisa cada vez que se muestra o se esconde (la
// visita del escarabajo espera a que se vea, para subir detras de ella).
export default function BotonPregunta({ onClick, oculto = false, evitarRef = null, alCambiarVisible = null }) {
  const [barra] = useState(() => document.querySelector('[data-nav-inferior]'))
  const botonRef = useRef(null)
  const [tapa, setTapa] = useState(true) // arranca escondido hasta medir

  useEffect(() => {
    if (!barra) return
    let raf = 0
    const medir = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const b = botonRef.current?.getBoundingClientRect()
        const e = evitarRef?.current?.getBoundingClientRect()
        setTapa(!!(b && e && e.height > 0 && b.left < e.right && b.right > e.left && b.top < e.bottom && b.bottom > e.top))
      })
    }
    medir()
    // el que desplaza es el <main>: el scroll no burbujea, se escucha en captura
    document.addEventListener('scroll', medir, { capture: true, passive: true })
    window.addEventListener('resize', medir)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('scroll', medir, { capture: true })
      window.removeEventListener('resize', medir)
    }
  }, [barra, evitarRef])

  const escondido = !barra || oculto || tapa
  useEffect(() => { alCambiarVisible?.(!escondido) }, [escondido]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!barra) return null
  return createPortal(
    <button
      ref={botonRef}
      type="button"
      className={`${styles.ficha} ${escondido ? styles.escondido : ''}`}
      onClick={onClick}
      // iOS Safari solo aplica :active si el elemento escucha touchstart
      onTouchStart={() => {}}
      aria-label="Preguntar a Huella"
      aria-hidden={escondido || undefined}
      tabIndex={escondido ? -1 : 0}
    >
      <span className={styles.atras} aria-hidden="true" />
      <span className={styles.adelante} aria-hidden="true">?</span>
    </button>,
    barra
  )
}
