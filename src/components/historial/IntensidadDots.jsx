import React from 'react'
import { intensityDots } from './helpers'
import styles from './IntensidadDots.module.css'

export default function IntensidadDots({ tipo, nivel }) {
  const dots = intensityDots({ tipo, nivel })
  const aria =
    tipo === 'logro' || tipo === 'hito'
      ? 'Episodio positivo'
      : `Intensidad ${nivel} de 5`
  return (
    <span className={styles.dots} role="img" aria-label={aria}>
      {dots.map((kind, i) => (
        <i key={i} className={styles[kind]} />
      ))}
    </span>
  )
}
