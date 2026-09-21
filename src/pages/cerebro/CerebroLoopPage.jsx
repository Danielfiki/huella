import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './CerebroLoopPage.module.css'

// Página de GRABACIÓN del loop del cerebro para la puerta "Su cerebro" del
// Home. Solo existe en desarrollo: App.jsx la monta con import.meta.env.DEV y
// en producción el import desaparece del bundle.
//
// Muestra la misma EscenaCerebro de /cerebro (encuadre y luces), sola, a
// 480x480, girando sobre su eje vertical una vuelta exacta cada 6 s. "Grabar
// una vuelta" espera a que el giro pase por 0°, graba hasta que vuelve a pasar
// y descarga el webm: así el video empalma consigo mismo sin salto.
//
// La edad llega por ?edad= (por defecto 6) y decide el nombre del archivo:
// chico hasta 4 años, mediano de 5 a 8, grande de 9 en adelante.

const EscenaCerebro = lazy(() => import('./EscenaCerebro'))

const MS_POR_VUELTA = 6000
const LADO = 480

function tramoDe(edad) {
  if (edad <= 4) return 'chico'
  if (edad <= 8) return 'mediano'
  return 'grande'
}

function mimeGrabacion() {
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    if (window.MediaRecorder?.isTypeSupported?.(m)) return m
  }
  return ''
}

export default function CerebroLoopPage() {
  const [params] = useSearchParams()
  const edadParam = Number.parseFloat(params.get('edad'))
  const edad = Number.isFinite(edadParam) ? Math.min(Math.max(edadParam, 0), 18) : 6
  const archivo = `cerebro-${tramoDe(edad)}.webm`

  const canvasRef = useRef(null)
  const inicioRef = useRef(performance.now())
  const [estado, setEstado] = useState('listo') // listo | esperando | grabando | hecho | error
  const estadoRef = useRef(estado)
  estadoRef.current = estado

  // El fondo del canvas sale del token, leído en vivo: sin esto el canvas
  // transparente se graba en negro.
  const fondo = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#FAF3EC',
    []
  )

  const loop = useMemo(() => ({
    fondo,
    fase: () => ((performance.now() - inicioRef.current) % MS_POR_VUELTA) / MS_POR_VUELTA,
    onCanvas: (c) => { canvasRef.current = c },
  }), [fondo])

  // Vigila el paso por 0°: la fase cae de ~1 a ~0 en un cuadro. En ese cuadro
  // arranca la grabación, y en el siguiente paso se corta: una vuelta exacta.
  const grabadorRef = useRef(null)
  useEffect(() => {
    let id
    let faseAnterior = loop.fase()
    const vigilar = () => {
      const f = loop.fase()
      const cruzo = f < faseAnterior
      faseAnterior = f
      if (cruzo) {
        if (estadoRef.current === 'esperando') empezar()
        else if (estadoRef.current === 'grabando') grabadorRef.current?.stop()
      }
      id = requestAnimationFrame(vigilar)
    }
    id = requestAnimationFrame(vigilar)
    return () => cancelAnimationFrame(id)
  }, [loop])

  function empezar() {
    const canvas = canvasRef.current
    const mime = mimeGrabacion()
    if (!canvas || !mime) { setEstado('error'); return }
    const trozos = []
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8_000_000 })
    rec.ondataavailable = (e) => { if (e.data.size) trozos.push(e.data) }
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(trozos, { type: 'video/webm' }))
      const a = document.createElement('a')
      a.href = url
      a.download = archivo
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      setEstado('hecho')
    }
    grabadorRef.current = rec
    rec.start()
    setEstado('grabando')
  }

  const aviso = {
    listo: `Edad ${edad} · tramo ${tramoDe(edad)}`,
    esperando: 'Esperando que el giro pase por el inicio…',
    grabando: 'Grabando una vuelta…',
    hecho: `Listo: ${archivo}`,
    error: 'Este navegador no puede grabar el canvas.',
  }[estado]

  return (
    <div className={styles.pagina}>
      <div className={styles.cuadro} style={{ width: LADO, height: LADO }}>
        <Suspense fallback={null}>
          <EscenaCerebro edad={edad} loop={loop} />
        </Suspense>
      </div>
      <div className={styles.controles}>
        <button
          type="button"
          className={styles.boton}
          onClick={() => setEstado('esperando')}
          disabled={estado === 'esperando' || estado === 'grabando'}
        >
          Grabar una vuelta
        </button>
        <p className={styles.aviso}>{aviso}</p>
      </div>
    </div>
  )
}
