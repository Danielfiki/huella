import React, { useState, useEffect } from 'react'
import Escarabajo from './Escarabajo'
import PalabraHuella from './PalabraHuella'
import styles from './SplashArranque.module.css'

// Mínimo visible para evitar un destello si la app carga muy rápido.
const MIN_VISIBLE_MS = 900
// Fallback por si `transitionend` no dispara (transición cancelada, sin pintar):
// 280ms del fade + margen.
const FADE_FALLBACK_MS = 450

// Splash de arranque de la app. Reemplaza el loader de cita+skeletons del
// arranque (ProtectedRoute). Solo el escarabajo late; la palabra queda estable.
//
// Props:
//   ready  — la app está lista para revelarse (auth resuelto + datos cargados).
//   onDone — se llama una vez que el fade-out terminó, para desmontar el overlay.
export default function SplashArranque({ ready, onDone }) {
  const [minElapsed, setMinElapsed] = useState(false)
  const [fading, setFading] = useState(false)

  // Reloj del mínimo visible: corre una sola vez al montar.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [])

  // Arranca el fade cuando la app está lista Y se cumplió el mínimo.
  useEffect(() => {
    if (ready && minElapsed) setFading(true)
  }, [ready, minElapsed])

  // Cierre: transitionend de la opacidad, con fallback por timeout.
  useEffect(() => {
    if (!fading) return
    const t = setTimeout(onDone, FADE_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [fading, onDone])

  function handleTransitionEnd(e) {
    if (e.propertyName === 'opacity' && fading) onDone()
  }

  return (
    <div
      className={`${styles.splash} ${fading ? styles.fading : ''}`}
      onTransitionEnd={handleTransitionEnd}
      aria-hidden={fading ? 'true' : undefined}
    >
      <div className={styles.block}>
        <Escarabajo className={styles.beetle} />
        <PalabraHuella className={styles.word} />
        <p className={styles.tagline}>Conoce la huella única de tus hijos</p>
      </div>
    </div>
  )
}
