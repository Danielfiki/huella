import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './CerrarPatronModal.module.css'

// Las tres opciones pesan EXACTAMENTE igual. Ninguna celebra, ninguna se apaga:
// sin emoji, sin color propio, sin icono, sin confeti en "resuelto". Un patrón
// tiene que poder terminar de varias formas, no solo bien.
const OPCIONES = [
  { value: 'resuelto',       label: 'Ya no pasa',              sub: 'Ya lo dejó.' },
  { value: 'ya_no_preocupa', label: 'Ya no me preocupa',       sub: 'Sigue igual, pero dejó de ser un tema.' },
  { value: 'dejado_estar',   label: 'Prefiero dejarlo estar',  sub: 'Por ahora no quiero trabajarlo.' },
]

// Estructura calcada de UpgradeModal: createPortal a document.body, overlay que
// cierra al click afuera, card centrada.
export default function CerrarPatronModal({ onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  const [cerrando, setCerrando] = useState(false)

  async function handleListo() {
    if (!motivo || cerrando) return
    setCerrando(true)
    try {
      await onConfirm(motivo)
    } finally {
      setCerrando(false)
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.titulo}>¿Cómo lo cierras?</h2>

        <div className={styles.opciones}>
          {OPCIONES.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`${styles.opcion} ${motivo === o.value ? styles.opcionSel : ''}`}
              onClick={() => setMotivo(o.value)}
            >
              <span className={styles.opcionLabel}>{o.label}</span>
              <span className={styles.opcionSub}>{o.sub}</span>
            </button>
          ))}
        </div>

        <div className={styles.botones}>
          <button type="button" className={styles.volver} onClick={onClose}>Volver</button>
          <button
            type="button"
            className={styles.listo}
            onClick={handleListo}
            disabled={!motivo || cerrando}
          >
            Listo
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
