import React, { useState, useEffect } from 'react'
import { generarConsejoDiario } from '../../services/anthropic'
import styles from './consejoBubble.module.css'

export default function ConsejoBubble({ user, hijo, episodios, hitos, estrategias }) {
  const [frase, setFrase] = useState(null)
  const [loadingFrase, setLoadingFrase] = useState(false)
  const [visible, setVisible] = useState(false)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const hasData = episodios.length >= 2 || hitos.length >= 1
    if (!hasData) return
    setVisible(true)

    const today = new Date().toISOString().split('T')[0]
    const fraseKey = `huella_consejo_v7_${user.id}_${today}`
    try {
      const cached = localStorage.getItem(fraseKey)
      if (cached) { setFrase(cached); return }
    } catch {}

    setLoadingFrase(true)
    generarConsejoDiario({ hijo, episodios, hitos, estrategias })
      .then((text) => {
        setFrase(text)
        try { localStorage.setItem(fraseKey, text) } catch {}
      })
      .catch(() => {})
      .finally(() => setLoadingFrase(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null

  const previewText = frase && !loadingFrase
    ? frase.replace(/[#*_`]/g, '').trim().split(/\s+/).slice(0, 7).join(' ') + '…'
    : null

  return (
    <>
      <div className={styles.bubbleWrap} onClick={() => setAbierto(true)}>
        {previewText && !abierto && (
          <span className={styles.preview}>{previewText}</span>
        )}
        <button className={styles.bubble} aria-label="Tu consejo de hoy">
          💡
        </button>
      </div>

      {abierto && (
        <div className={styles.overlay} onClick={() => setAbierto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>💡 Tu consejo de hoy</span>
              <button className={styles.modalClose} onClick={() => setAbierto(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className={styles.modalBody}>
              {loadingFrase
                ? <p className={styles.modalCargando}>Preparando tu consejo…</p>
                : <div className={styles.modalTexto}>{
                    frase?.split(/\*([^*]+)\*/).map((part, i) =>
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )
                  }</div>
              }
            </div>
          </div>
        </div>
      )}
    </>
  )
}
