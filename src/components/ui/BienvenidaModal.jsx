import React, { useState } from 'react'
import styles from './BienvenidaModal.module.css'

const PASOS = [
  { num: 1, color: '#E56E26', texto: 'Algo pasa con tu hijo → toca Registrar episodio' },
  { num: 2, color: '#9B7B6A', texto: 'Huella analiza el contexto y te da orientación inmediata' },
  { num: 3, color: '#8FA840', texto: 'Con el tiempo aparecen patrones y estrategias concretas' },
]

const KEY = 'huella_bienvenida_vista'

export default function BienvenidaModal() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(KEY))

  function cerrar() {
    localStorage.setItem(KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.emoji}>🌱</div>
        <h2 className={styles.titulo}>Así funciona Huella</h2>
        <p className={styles.subtitulo}>3 pasos simples, día a día</p>

        <div className={styles.pasos}>
          {PASOS.map((paso, i) => (
            <React.Fragment key={paso.num}>
              <div className={styles.paso}>
                <span className={styles.num} style={{ background: paso.color }}>{paso.num}</span>
                <p className={styles.pasoTexto}>{paso.texto}</p>
              </div>
              {i < PASOS.length - 1 && <hr className={styles.sep} />}
            </React.Fragment>
          ))}
        </div>

        <button className={styles.btn} onClick={cerrar}>
          Entendido, empezar →
        </button>
      </div>
    </div>
  )
}
