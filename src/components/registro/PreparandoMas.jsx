import React, { useState, useEffect } from 'react'
import styles from './PreparandoMas.module.css'

// ──────────────────────────────────────────────────────────────────────
// "VIENE MÁS"
//
// Después del alivio hay una espera hasta que aparecen la acción y la
// orientación, y sin nada en pantalla esa pausa se lee como el final: el
// padre puede irse creyendo que eso era todo lo que Huella tenía para él.
//
// No es un spinner de sistema: son los mismos puntos del hilo, con una frase
// que dice qué se está preparando. Se anuncia lo que viene, no que algo está
// cargando.
// ──────────────────────────────────────────────────────────────────────

const FRASES = [
  'Preparando qué hacer la próxima vez…',
  'Ordenando la orientación completa…',
  'Un momento más…',
]

// Lo bastante lento para que se lea entero y no distraiga de lo que el padre
// está leyendo arriba.
const MS_ROTACION = 4500

export default function PreparandoMas() {
  const [i, setI] = useState(0)

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
    <div className={styles.fila} role="status" aria-live="polite">
      <span className={styles.puntos} aria-hidden="true">
        <i /><i /><i />
      </span>
      <span key={i} className={styles.frase}>{FRASES[i]}</span>
    </div>
  )
}
