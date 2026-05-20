import React from 'react'
import styles from './consejoBubble.module.css'

// Modal centrado del consejo del día. Reutiliza el CSS de
// consejoBubble.module.css (overlay, modal, header, body) que ya
// estaba pulido para el componente burbuja anterior. Solo extrae el
// modal: la burbuja flotante se eliminó al mover el consejo a la
// campana del Hero del Home.
export default function ConsejoDelDiaModal({ frase, loading, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>💡 Tu consejo de hoy</span>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {loading ? (
            <p className={styles.modalCargando}>Preparando tu consejo…</p>
          ) : (
            <div className={styles.modalTexto}>
              {frase?.split(/\*([^*]+)\*/).map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
