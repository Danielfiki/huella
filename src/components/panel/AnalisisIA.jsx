import React, { useState, useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import CitaLoader from '../ui/CitaLoader'
import ProgressBar from '../ui/ProgressBar'
import styles from './analisisIa.module.css'

// Secciones que el plan free ve bloqueadas. Su contenido NO se genera ni viaja
// al cliente free (el gate es real); acá solo se listan los nombres como teaser.
const SECCIONES_BLOQUEADAS = ['Lo que merece atención', 'Posibles causas', 'Próximos pasos']

const SECTION_TITLES = new Set([
  'Lo que está mejorando',
  'Lo que merece atención',
  'Posibles causas',
  'Próximos pasos sugeridos',
  'Qué está pasando',
  'Qué hacer ahora',
  'Qué evitar',
])

function renderInlineBold(line) {
  const parts = line.split(/\*\*([^*]+)\*\*/g)
  if (parts.length === 1) return line
  return parts.map((part, j) =>
    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
  )
}

function renderAnalysisText(text) {
  if (!text) return null
  return text.split('\n').map((raw, i) => {
    const line = raw.trimEnd()
    if (!line.trim()) return null

    if (SECTION_TITLES.has(line.trim())) {
      return <p key={i} className={styles.sectionTitle}>{line.trim()}</p>
    }

    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      return <p key={i} className={styles.sectionTitle}>{line.trim().replace(/^\*\*|\*\*$/g, '')}</p>
    }

    return <p key={i} className={styles.bodyLine}>{renderInlineBold(line)}</p>
  }).filter(Boolean)
}

export function AnalisisIA({ loading, texto, bloqueado, onAnalizar, onUpgrade, onAccept, onDismiss }) {
  // Barra de "avance percibido" durante la espera (reusa el ProgressBar del
  // onboarding). NO refleja progreso real: sube hasta ~90% con ease-out a lo
  // largo de ~60s — el análisis del Home puede tardar hasta ~75s — y se clava
  // ahí; las citas cubren la espera larga. Al terminar con éxito completa a
  // 100% y recién ahí se hace swap al texto. Si falla, no llega a 100%.
  const [progress, setProgress] = useState(0)
  const [completing, setCompleting] = useState(false)
  const fueLoading = useRef(false)

  // Subida 0 → ~90% mientras carga (animación temporizada con ease-out).
  useEffect(() => {
    if (!loading) return undefined
    setCompleting(false)
    setProgress(0)
    const DURACION_MS = 60000
    const TOPE = 90
    const inicio = Date.now()
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - inicio) / DURACION_MS)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out: rápido al inicio, lento al final
      setProgress(Math.round(eased * TOPE))
      if (t >= 1) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [loading])

  // Al pasar de loading → no-loading: si fue ÉXITO, completa a 100% y mantiene
  // la vista de espera ~350ms antes del swap al texto. Si fue error, no toca
  // la barra (queda clavada y se reemplaza por el card de error de siempre).
  useEffect(() => {
    const venia = fueLoading.current
    fueLoading.current = loading
    if (venia && !loading) {
      const exito = texto && !texto.startsWith('Error')
      if (exito) {
        setProgress(100)
        setCompleting(true)
        const id = setTimeout(() => setCompleting(false), 350)
        return () => clearTimeout(id)
      }
    }
    return undefined
  }, [loading, texto])

  if (loading || completing) {
    return (
      <article className={styles.card}>
        <header className={styles.head}>
          <div className={styles.logo}>h</div>
          <div className={styles.name}>
            Huella
            <small>Análisis semanal</small>
          </div>
        </header>
        <CitaLoader categoria="patrones" compact />
        <ProgressBar
          value={progress}
          phase={completing ? 'complete' : 'determinate'}
          tone="onLight"
          color="var(--color-accent-green)"
          label="Analizando patrones"
          className={styles.progressSpace}
        />
      </article>
    )
  }

  if (!texto) {
    return (
      <article className={styles.card}>
        <header className={styles.head}>
          <div className={styles.logo}>h</div>
          <div className={styles.name}>
            Huella
            <small>Análisis semanal</small>
          </div>
        </header>
        <h3 className={styles.title}>¿Qué patrón ve Huella esta semana?</h3>
        <p className={styles.bodyLine}>
          La IA revisa tus registros y encuentra conexiones que a veces son difíciles de ver en el día a día.
        </p>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.primary}`} onClick={onAnalizar}>
            Analizar patrones ahora
          </button>
        </div>
      </article>
    )
  }

  const isError = texto.startsWith('Error')
  const firstLine = texto.split('\n')[0].trim()
  const titleText = firstLine.length > 80 ? firstLine.slice(0, 77) + '…' : firstLine
  const bodyText = texto.includes('\n') ? texto.slice(texto.indexOf('\n') + 1).trim() : ''

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.logo}>h</div>
        <div className={styles.name}>
          Huella
          <small>Análisis semanal</small>
        </div>
        {!isError && <span className={styles.badge}>Nuevo</span>}
      </header>
      <h3 className={styles.title}>{isError ? 'No se pudo analizar' : titleText}</h3>
      {bodyText && <div className={styles.body}>{renderAnalysisText(bodyText)}</div>}

      {bloqueado && !isError && (
        <div className={styles.locked}>
          {SECCIONES_BLOQUEADAS.map((s) => (
            <div key={s} className={styles.lockedRow}>
              <Lock size={14} className={styles.lockIcon} />
              <span>{s}</span>
            </div>
          ))}
          <button className={`${styles.btn} ${styles.primary} ${styles.unlockBtn}`} onClick={onUpgrade}>
            Ver el cuadro completo con Pro
          </button>
        </div>
      )}

      <div className={styles.actions}>
        {!isError && !bloqueado && (
          <button className={`${styles.btn} ${styles.primary}`} onClick={onAccept}>
            Ver estrategias
          </button>
        )}
        {isError ? (
          <button className={`${styles.btn} ${styles.primary}`} onClick={onAnalizar}>
            Reintentar
          </button>
        ) : (
          <button className={`${styles.btn} ${styles.ghost}`} onClick={onDismiss}>
            Cerrar
          </button>
        )}
      </div>
    </article>
  )
}
