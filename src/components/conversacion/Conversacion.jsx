import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import styles from './Conversacion.module.css'

// ──────────────────────────────────────────────────────────────────────
// Piezas de conversación compartidas por Registrar y Preguntar.
//
// Salieron de RegistroConversacional sin cambiar cómo se ven: son el mismo
// marcado y las mismas reglas de CSS, movidas a su propio módulo. Lo que va
// DENTRO de cada burbuja (la pregunta, el párrafo, las opciones de la hoja)
// sigue siendo de quien la usa.
// ──────────────────────────────────────────────────────────────────────

// Burbuja de Huella: escarabajo a la izquierda.
export function FilaHuella({ children }) {
  return (
    <div className={styles.filaHuella}>
      <span className={styles.avatarHuella} aria-hidden="true">
        <Escarabajo className={styles.avatarSvg} />
      </span>
      <div className={styles.burbujaHuella}>{children}</div>
    </div>
  )
}

// Burbuja del papá: su foto o su inicial a la derecha.
export function FilaPadre({ avatarUrl, inicial, children }) {
  return (
    <div className={styles.filaPadre}>
      <div className={styles.burbujaPadre}>{children}</div>
      <span className={styles.avatarPadre} aria-hidden="true">
        {avatarUrl
          ? <img src={avatarUrl} alt="" className={styles.avatarPadreFoto} />
          : inicial}
      </span>
    </div>
  )
}

// Los tres puntos de "Huella está leyendo".
export function PuntosLeyendo() {
  return (
    <span className={styles.puntos} role="status" aria-label="Huella está leyendo">
      <i /><i /><i />
    </span>
  )
}

// Hoja que sube desde abajo, con su asa y su título. Tocar el fondo cierra.
export function HojaInferior({ titulo, onCerrar, children }) {
  return (
    <div className={styles.hojaOverlay} onClick={onCerrar}>
      <div className={styles.hoja} onClick={(e) => e.stopPropagation()}>
        <span className={styles.hojaAsa} aria-hidden="true" />
        <p className={styles.hojaTitulo}>{titulo}</p>
        {children}
      </div>
    </div>
  )
}
