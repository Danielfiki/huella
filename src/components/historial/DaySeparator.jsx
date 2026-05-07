import React from 'react'
import styles from './DaySeparator.module.css'

export default function DaySeparator({ label, meta, isToday = false }) {
  return (
    <div className={`${styles.sep} ${isToday ? styles.today : ''}`}>
      <span className={styles.lbl}>{label}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <span className={styles.line} />
    </div>
  )
}
