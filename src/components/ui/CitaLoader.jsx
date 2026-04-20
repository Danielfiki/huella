import React, { useMemo } from 'react'
import { fraseAleatoria } from '../../lib/frases'
import styles from './CitaLoader.module.css'

export default function CitaLoader({ categoria = 'general', compact = false }) {
  const frase = useMemo(() => fraseAleatoria(categoria), [categoria])

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <p className={styles.texto}>"{frase.texto}"</p>
      <p className={styles.autor}>— {frase.autor}</p>
      <div className={styles.skeletons}>
        <div className={styles.skLine} />
        <div className={styles.skLine} style={{ width: '78%' }} />
        <div className={styles.skLine} style={{ width: '55%' }} />
      </div>
    </div>
  )
}
