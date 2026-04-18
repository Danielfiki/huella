import React from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, Loader } from 'lucide-react'
import InformePDF from './InformePDF'
import styles from './GenerarInformeBtn.module.css'

export default function PDFSection({ hijo, episodios, estrategias, hitos }) {
  const nombreArchivo = `huella-informe-${
    hijo?.nombre?.toLowerCase().replace(/\s+/g, '-') || 'familiar'
  }.pdf`

  return (
    <PDFDownloadLink
      document={
        <InformePDF
          hijo={hijo}
          episodios={episodios}
          estrategias={estrategias}
          hitos={hitos}
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
