import React, { lazy, Suspense, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import styles from './CerebroPage.module.css'

// El chunk de three (~170 KB gzip) se descarga SOLO al entrar a esta ruta.
// Mismo patrón que PDFSection en HistorialPage: nada de esto pesa en el
// bundle inicial. Si se importa three en cualquier otro lado de forma
// estática, ese ahorro se pierde.
const EscenaCerebro = lazy(() => import('./EscenaCerebro'))

// Se pregunta ANTES de cargar el chunk: si el dispositivo no puede dibujar,
// no tiene sentido bajarle 600 KB de librería 3D.
function hayWebGL() {
  try {
    const cv = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (cv.getContext('webgl2') || cv.getContext('webgl'))
    )
  } catch {
    return false
  }
}

export default function CerebroPage() {
  const navigate = useNavigate()
  const { state } = useHuella()
  const hijo = state.hijo
  const soportado = useMemo(hayWebGL, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.titulo}>
          {hijo?.nombre ? `El cerebro de ${hijo.nombre}` : 'El cerebro de tu hijo'}
        </h1>
      </div>

      <div className={styles.vitrina}>
        {soportado ? (
          <Suspense fallback={<p className={styles.estado}>Armando el cerebro…</p>}>
            <EscenaCerebro />
          </Suspense>
        ) : (
          // Fallback sereno: esto no es un error del que haya que disculparse,
          // es un dispositivo que no puede dibujar en 3D.
          <div className={styles.sinWebgl}>
            <p className={styles.sinWebglTitulo}>Este cerebro necesita más pantalla</p>
            <p className={styles.sinWebglTexto}>
              Tu dispositivo no puede dibujar en 3D todavía. Todo lo demás de Huella
              funciona igual, y puedes volver a esta pantalla desde otro teléfono
              cuando quieras.
            </p>
          </div>
        )}
      </div>

      <p className={styles.pie}>
        Este modelo es un mapa anatómico adulto: te sirve para ubicarte, no representa
        la forma exacta del cerebro de tu hijo.
        <br />
        Modelo 3D: BodyParts3D © The Database Center for Life Science, CC BY 4.0
      </p>
    </div>
  )
}
