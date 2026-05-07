import React from 'react'
import styles from './OrientacionIA.module.css'

export default function OrientacionIA({ orientacion, onClose }) {
  const { titulo, resumen } = orientacion
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.h} aria-hidden="true">h</span>
        <span className={styles.lbl}>Orientación de Huella</span>
        {onClose && (
          <button className={styles.close} onClick={onClose} aria-label="Cerrar orientación">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <h4 className={styles.ttl}>{titulo}</h4>
      <p className={styles.body}>{resumen}</p>
    </div>
  )
}
