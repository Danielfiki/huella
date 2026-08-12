import React, { useState, useEffect } from 'react'
import ProgressBar from '../ui/ProgressBar'
import useFakeProgress from '../../hooks/useFakeProgress'
import styles from './PreparandoMas.module.css'

// ──────────────────────────────────────────────────────────────────────
// "VIENE MÁS"
//
// Después del alivio hay una espera hasta que aparecen la acción y la
// orientación, y sin nada en pantalla esa pausa se lee como el final: el
// padre puede irse creyendo que eso era todo lo que Huella tenía para él.
//
// Sigue el patrón de la tarjeta de análisis semanal —líneas fantasma de lo
// que viene, más una barra de avance— en vez de unos puntos sueltos, que a
// esta altura de la pantalla se leían como un detalle y no como una promesa.
// La frase dice qué se está preparando: se anuncia lo que viene, no que algo
// está cargando.
// ──────────────────────────────────────────────────────────────────────

const FRASES = [
  'Preparando qué hacer la próxima vez…',
  'Ordenando la orientación completa…',
  'Un momento más…',
]

// Lo bastante lento para que se lea entero y no distraiga de lo que el padre
// está leyendo arriba.
const MS_ROTACION = 4500

// La orientación completa tarda 15-20s. El progreso no es medible —el stream
// no anuncia cuánto falta— así que la barra avanza con la curva del hook, que
// sube rápido al principio, frena cerca del final y nunca retrocede.
const DURACION_ESTIMADA_MS = 20000

export default function PreparandoMas() {
  const [i, setI] = useState(0)
  const { progress, phase } = useFakeProgress({ loading: true, duracionMs: DURACION_ESTIMADA_MS })

  useEffect(() => {
    const id = setInterval(
      // Se queda en la última: seguir rotando en círculo delataría que no hay
      // información nueva que dar.
      () => setI((n) => Math.min(n + 1, FRASES.length - 1)),
      MS_ROTACION,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.panel} role="status" aria-live="polite">
      {/* Fantasma de lo que está por llegar: dos bloques, como las dos piezas
          que faltan (la acción y la orientación). */}
      <div className={styles.lineas} aria-hidden="true">
        <span className={styles.linea} style={{ width: '92%' }} />
        <span className={styles.linea} style={{ width: '74%' }} />
        <span className={styles.linea} style={{ width: '58%' }} />
      </div>

      <p key={i} className={styles.frase}>{FRASES[i]}</p>

      <ProgressBar
        value={progress}
        phase={phase}
        tone="onLight"
        // Pistacho y no terracota: la pantalla ya carga durazno y terracota, y
        // esto le suma el color que le faltaba. No compite con "Para la
        // próxima" porque es transitorio — desaparece justo cuando esa tarjeta
        // aparece, así que nunca se ven los dos verdes a la vez.
        color="var(--color-accent-green)"
        label="Preparando lo que sigue"
        className={styles.barra}
      />
    </div>
  )
}
