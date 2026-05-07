import React from 'react'
import CitaLoader from '../ui/CitaLoader'
import styles from './analisisIa.module.css'

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

export function AnalisisIA({ loading, texto, onAnalizar, onAccept, onDismiss }) {
  if (loading) {
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
      <div className={styles.actions}>
        {!isError && (
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
