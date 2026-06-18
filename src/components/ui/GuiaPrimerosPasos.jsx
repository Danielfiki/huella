import React from 'react'
import { useNavigate } from 'react-router-dom'
import Escarabajo from './Escarabajo'
import styles from './GuiaPrimerosPasos.module.css'

const PASOS = [
  {
    texto: 'Registra lo que pasó',
    textoDone: 'Registraste lo que pasó',
    completadoSi: (n) => n >= 1,
  },
  {
    texto: 'Registra 2 momentos más',
    textoDone: 'Registraste 2 momentos más',
    completadoSi: (n) => n >= 3,
  },
  {
    texto: 'Huella te muestra los patrones',
    escarabajo: true, // círculo durazno + escarabajo, nunca lleva check
    completadoSi: () => false,
  },
]

export default function GuiaPrimerosPasos({ totalEpisodios }) {
  const navigate = useNavigate()

  if (totalEpisodios >= 3) return null

  const completados = PASOS.filter((p) => p.completadoSi(totalEpisodios)).length

  return (
    <div className={styles.card}>
      <Escarabajo className={styles.escarabajoEsquina} />

      <h3 className={styles.titulo}>Tus primeros pasos</h3>
      <p className={styles.subtitulo}>{completados} de 3 completado</p>

      <div className={styles.barra} aria-hidden="true">
        {PASOS.map((paso, i) => (
          <span
            key={i}
            className={`${styles.segmento} ${paso.completadoSi(totalEpisodios) ? styles.segmentoOn : ''}`}
          />
        ))}
      </div>

      <ul className={styles.pasos}>
        {PASOS.map((paso, i) => {
          const done = paso.completadoSi(totalEpisodios)
          return (
            <li key={i} className={styles.paso}>
              {paso.escarabajo ? (
                <span className={styles.circuloEscarabajo}>
                  <Escarabajo className={styles.circuloEscarabajoIcon} />
                </span>
              ) : done ? (
                <span className={styles.circuloDone} aria-hidden="true">✓</span>
              ) : (
                <span className={styles.circuloPend} aria-hidden="true" />
              )}
              <span className={`${styles.pasoTexto} ${done ? styles.pasoTextoDone : ''}`}>
                {done ? paso.textoDone : paso.texto}
              </span>
            </li>
          )
        })}
      </ul>

      <button className={styles.btn} onClick={() => navigate('/nuevo')}>
        Registrar un momento →
      </button>
    </div>
  )
}
