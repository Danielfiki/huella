import React, { useState, useEffect, useRef } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, Loader, AlertCircle } from 'lucide-react'
import InformePDF from './InformePDF'
import { interpretarPatrones, analizarReflexionesCuidador } from '../../services/anthropic'
import styles from './GenerarInformeBtn.module.css'

const PLACEHOLDER_RESUMEN = 'El resumen ejecutivo no estuvo disponible al momento de generar este informe.'

export default function PDFSection({ hijo, episodios, estrategias, hitos }) {
  const [resumenEjecutivo, setResumenEjecutivo] = useState(null)
  const [reflexionesCuidador, setReflexionesCuidador] = useState(null)
  const [listo, setListo] = useState(false)
  const [errorIA, setErrorIA] = useState(false)
  const isMounted = useRef(true)

  const reflexionesData = episodios
    .filter(e => e.reflexion)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 10)
    .map(e => ({
      texto: e.reflexion,
      fecha: new Date(e.fecha).toLocaleDateString('es-CL'),
      tipoEpisodio: e.tipo,
    }))

  const correr = async () => {
    setErrorIA(false)
    setListo(false)
    try {
      const [resumen, reflexiones] = await Promise.all([
        interpretarPatrones({ hijo, episodios }),
        reflexionesData.length >= 3
          ? analizarReflexionesCuidador(reflexionesData)
          : Promise.resolve(null),
      ])
      if (!isMounted.current) return
      setResumenEjecutivo(resumen)
      setReflexionesCuidador(reflexiones)
    } catch {
      if (!isMounted.current) return
      setErrorIA(true)
    } finally {
      if (isMounted.current) setListo(true)
    }
  }

  useEffect(() => {
    isMounted.current = true
    correr()
    return () => { isMounted.current = false }
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

  if (errorIA) {
    return (
      <div className={styles.errorWrap}>
        <div className={styles.errorContent}>
          <AlertCircle size={18} className={styles.errorIcon} />
          <p className={styles.errorMsg}>No fue posible generar el análisis con IA.</p>
        </div>
        <div className={styles.errorBtns}>
          <button className={styles.retryBtn} onClick={correr}>
            Reintentar
          </button>
          <PDFDownloadLink
            document={
              <InformePDF
                hijo={hijo}
                episodios={episodios}
                estrategias={estrategias}
                hitos={hitos}
                resumenEjecutivo={PLACEHOLDER_RESUMEN}
                reflexionesCuidador={null}
              />
            }
            fileName={nombreArchivo}
            className={styles.sinResumenBtn}
          >
            {({ loading }) => loading ? 'Preparando...' : 'Descargar sin resumen'}
          </PDFDownloadLink>
        </div>
      </div>
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
          reflexionesCuidador={reflexionesCuidador}
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
