import React, { useState, useEffect } from 'react'
import { fraseAleatoria } from '../../lib/frases'
import styles from './CitaLoader.module.css'

const FADE_MS = 380

function pickNext(categoria, lastTexto) {
  let frase
  let attempts = 0
  do {
    frase = fraseAleatoria(categoria)
    attempts++
  } while (frase.texto === lastTexto && attempts < 5)
  return frase
}

export default function CitaLoader({ categoria = 'general', compact = false }) {
  const [frase, setFrase] = useState(() => fraseAleatoria(categoria))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const duration = Math.min(Math.max(frase.texto.length * 40, 4500), 7500)
    let swapTimer

    const displayTimer = setTimeout(() => {
      setVisible(false)
      swapTimer = setTimeout(() => {
        setFrase((prev) => pickNext(categoria, prev.texto))
        setVisible(true)
      }, FADE_MS)
    }, duration)

    return () => {
      clearTimeout(displayTimer)
      clearTimeout(swapTimer)
    }
  }, [frase, categoria])

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div className={`${styles.quoteWrap} ${visible ? styles.quoteVisible : styles.quoteHidden}`}>
        <p className={styles.texto}>"{frase.texto}"</p>
        <p className={styles.autor}>— {frase.autor}</p>
      </div>
      <div className={styles.skeletons}>
        <div className={styles.skLine} />
        <div className={styles.skLine} style={{ width: '78%' }} />
        <div className={styles.skLine} style={{ width: '55%' }} />
      </div>
    </div>
  )
}
