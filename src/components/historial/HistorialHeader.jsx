import React from 'react'
import { Lock } from 'lucide-react'
import { statColorFor } from './helpers'
import styles from './HistorialHeader.module.css'

export default function HistorialHeader({
  count = 0,
  promedio = 0,
  rango = 'Últ. 14 días',
  onBack,
  onSearch,
  onExportPDF,
  hasNewExport = false,
  exportBloqueado = false,
}) {
  const statColor = statColorFor(promedio)
  return (
    <header className={styles.topBar}>
      <div className={styles.row}>
        <button className={styles.iconBtn} onClick={onBack} aria-label="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className={styles.title}>Historial</h1>
        <button className={styles.iconBtn} onClick={onSearch} aria-label="Buscar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
        {onExportPDF && (
          <button
            className={`${styles.iconBtn} ${styles.pdfBtn}`}
            onClick={onExportPDF}
            aria-label="Exportar informe PDF"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 13h6" />
              <path d="M9 17h4" />
            </svg>
            {exportBloqueado
              ? <span className={styles.pdfLock}><Lock /></span>
              : hasNewExport && <span className={styles.pdfDot} />}
          </button>
        )}
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.num}>{count}</span>
          <span className={styles.lbl}>Momentos</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.num} ${styles[`num_${statColor}`]}`}>
            {promedio.toFixed(1)}
          </span>
          <span className={styles.lbl}>Intensidad media</span>
        </div>
        <span className={styles.range}>{rango}</span>
      </div>
    </header>
  )
}
