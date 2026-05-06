import React from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import styles from './ctaPrimary.module.css'

export function CTAPrimary({
  onClick,
  label = 'Registrar un momento',
  sub = 'Difícil, logro o hito — toma 30 segundos.',
}) {
  return (
    <button className={styles.cta} onClick={onClick}>
      <span className={styles.glyph}>
        <Plus size={28} strokeWidth={2.5} />
      </span>
      <span className={styles.copy}>
        <span className={styles.eyebrow}>Acción principal</span>
        <span className={styles.title}>{label}</span>
        <span className={styles.sub}>{sub}</span>
      </span>
      <span className={styles.arrow}>
        <ChevronRight size={14} strokeWidth={2.5} />
      </span>
    </button>
  )
}
