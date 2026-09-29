import React from 'react'
import styles from './DaySeparator.module.css'

// `sobrio`: la versión del rediseño de Momentos (sin punto naranjo, "Hoy" en el
// color del texto). Sin la prop se ve como siempre.
export default function DaySeparator({ label, meta, isToday = false, sobrio = false }) {
  return (
    <div className={`${styles.sep} ${isToday ? styles.today : ''} ${sobrio ? styles.sobrio : ''}`}>
      <span className={styles.lbl}>{label}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <span className={styles.line} />
    </div>
  )
}
