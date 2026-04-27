import React, { useState, useEffect } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, Loader } from 'lucide-react'
import InformePDF from './InformePDF'
import { interpretarPatrones } from '../../services/anthropic'
import styles from './GenerarInformeBtn.module.css'

export default function PDFSection({ hijo, episodios, estrategias, hitos }) {
  const [resumenEjecutivo, setResumenEjecutivo] = useState(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    interpretarPatrones({ hijo, episodios })
      .then((texto) => setResumenEjecutivo(texto))
      .catch(() => {})
      .finally(() => setListo(true))
  }, [])

  const nombreArchivo = `huella-informe-${
    hijo?.nombre?.toLowerCase().replace(/\s+/g, '-') || 'familiar'
  }.pdf`

  if (!listo) {
    return (
      <button className={styles.link} disabled>
        <span className={styles.inner}>
          <Loader size={15} className={styles.spin} /> Preparando informe...
        </span>
      </button>
    )
  }

  return (
    <PDFDownloadLink
      document={
        <InformePDF
          hijo={hijo}
          episodios={episodios}
          estrategias={estrategias}
          hitos={hitos}
          resumenEjecutivo={resumenEjecutivo}
        />
      }
      fileName={nombreArchivo}
      className={styles.link}
    >
      {({ loading }) => (
        <span className={styles.inner}>
          {loading
            ? <><Loader size={15} className={styles.spin} /> Generando PDF...</>
            : <><FileDown size={15} /> Descargar informe PDF</>}
        </span>
      )}
    </PDFDownloadLink>
  )
}
