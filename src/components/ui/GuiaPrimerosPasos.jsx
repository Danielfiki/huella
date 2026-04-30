import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GuiaPrimerosPasos.module.css'

const PASOS = [
  { emoji: null, texto: 'Registra lo que pasó', completadoSi: (n) => n >= 1 },
  { emoji: null, texto: 'Registra 2 episodios más', completadoSi: (n) => n >= 3 },
  { emoji: null, texto: 'Huella identifica patrones', completadoSi: () => false },
]

export default function GuiaPrimerosPasos({ totalEpisodios }) {
  const navigate = useNavigate()

  if (totalEpisodios >= 10) return null

  return (
    <div className={styles.card}>
      <p className={styles.titulo}>¿Por dónde empezar?</p>
      <ul className={styles.pasos}>
        {PASOS.map((paso, i) => {
          const done = paso.completadoSi(totalEpisodios)
          return (
            <li key={i} className={`${styles.paso} ${done ? styles.pasoDone : ''}`}>
              <span className={styles.pasoIcon}>{done ? '✅' : '⭕'}</span>
              <span className={styles.pasoTexto}>{paso.texto}</span>
            </li>
          )
        })}
      </ul>
      <button className={styles.btn} onClick={() => navigate('/nuevo')}>
        Registrar primer episodio →
      </button>
    </div>
  )
}
