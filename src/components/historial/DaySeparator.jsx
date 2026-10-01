import React from 'react'
import styles from './DaySeparator.module.css'

// `sobrio`: la versión del rediseño de Momentos (sin punto naranjo, "Hoy" en el
// color del texto). Sin la prop se ve como siempre.
// `unaLinea` (cuentas en prueba): el encabezado nunca baja de línea.
export default function DaySeparator({ label, meta, isToday = false, sobrio = false, unaLinea = false }) {
  return (
    <div className={`${styles.sep} ${isToday ? styles.today : ''} ${sobrio ? styles.sobrio : ''} ${unaLinea ? styles.unaLinea : ''}`}>
      <span className={styles.lbl}>{label}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <span className={styles.line} />
    </div>
  )
}
