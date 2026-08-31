import React, { useState, useEffect } from 'react'
import Escarabajo from './Escarabajo'
import PalabraHuella from './PalabraHuella'
import styles from './SplashArranque.module.css'

// Mínimo visible para evitar un destello si la app carga muy rápido.
const MIN_VISIBLE_MS = 900
// Fallback por si `transitionend` no dispara (transición cancelada, sin pintar):
// 280ms del fade + margen.
const FADE_FALLBACK_MS = 450
// Failsafe del arranque: si a los 12s la app sigue sin estar lista, dejamos de
// esperar en silencio. No arregla la causa — le da una salida al usuario en vez
// de un escarabajo latiendo para siempre. Va DESPUÉS del rescate de sesión de
// AuthContext (8s), que es el que debería destrabar el caso conocido; esto
// cubre el resto de la cadena (familia y datos de la cuenta).
const FAILSAFE_MS = 12000

// Splash de arranque de la app. Reemplaza el loader de cita+skeletons del
// arranque (ProtectedRoute). Solo el escarabajo late; la palabra queda estable.
//
// Props:
//   ready  — la app está lista para revelarse (auth resuelto + datos cargados).
//   onDone — se llama una vez que el fade-out terminó, para desmontar el overlay.
export default function SplashArranque({ ready, onDone }) {
  const [minElapsed, setMinElapsed] = useState(false)
  const [fading, setFading] = useState(false)
  const [demorado, setDemorado] = useState(false)

  // Reloj del mínimo visible: corre una sola vez al montar.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [])

  // Reloj del failsafe: solo corre mientras la app NO está lista. Si `ready`
  // llega antes, el cleanup lo cancela y el mensaje nunca aparece.
  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setDemorado(true), FAILSAFE_MS)
    return () => clearTimeout(t)
  }, [ready])

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

        {demorado && !fading && (
          <div className={styles.rescate}>
            <p className={styles.rescateTexto}>Esto está tardando más de lo normal.</p>
            <button
              type="button"
              className={styles.rescateBoton}
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
