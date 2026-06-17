import React from 'react'
import { ChevronRight, Loader } from 'lucide-react'
import Escarabajo from '../ui/Escarabajo'
import styles from './ctaAskHuella.module.css'

export function CTAAskHuella({
  onClick,
  loading = false,
  question = '¿Qué patrón ves esta semana?',
}) {
  return (
    <button
      className={`${styles.cta}${loading ? ` ${styles.loading}` : ''}`}
      onClick={loading ? undefined : onClick}
      disabled={loading}
    >
      <span className={styles.brand}><Escarabajo className={styles.brandIcon} /></span>
      <span className={styles.copy}>
        <span className={styles.eyebrow}>Pregúntale a Huella</span>
        <span className={styles.title}>
          {loading ? 'Analizando patrones…' : question}
        </span>
      </span>
      <span className={styles.arrow}>
        {loading
          ? <Loader size={12} strokeWidth={2.5} />
          : <ChevronRight size={12} strokeWidth={2.5} />
        }
      </span>
    </button>
  )
}
