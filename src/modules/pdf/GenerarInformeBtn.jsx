import React, { useState, lazy, Suspense } from 'react'
import { FileDown, Loader } from 'lucide-react'
import styles from './GenerarInformeBtn.module.css'

const PDFSection = lazy(() => import('./PDFSection'))

export default function GenerarInformeBtn({ hijo, episodios, estrategias, hitos }) {
  const [activado, setActivado] = useState(false)

  if (!activado) {
    return (
      <button className={styles.link} onClick={() => setActivado(true)}>
        <span className={styles.inner}>
          <FileDown size={15} /> Exportar informe PDF
        </span>
      </button>
    )
  }

  return (
    <Suspense fallback={
      <button className={styles.link} disabled>
        <span className={styles.inner}>
          <Loader size={15} className={styles.spin} /> Cargando...
        </span>
      </button>
    }>
      <PDFSection
        hijo={hijo}
        episodios={episodios}
        estrategias={estrategias}
        hitos={hitos}
      />
    </Suspense>
  )
}
