import React from 'react'
import styles from './RespuestaIA.module.css'
import { Sparkles } from 'lucide-react'
import CitaLoader from './CitaLoader'
import ProgressBar from './ProgressBar'
import useFakeProgress from '../../hooks/useFakeProgress'
import { renderInline } from '../../utils/renderMarkdown'

// La orientación del episodio es más corta que el análisis del Home (~60s):
// estimamos ~28s. Es solo el ritmo de la barra de avance percibido; ajústalo aquí.
const DURACION_ORIENTACION_MS = 28000

export default function RespuestaIA({ texto, loading = false, mensajeCarga, compact = false, categoria = 'regulacion' }) {
  const exito = !!texto && !texto.startsWith('Error')
  const { progress, completing, phase } = useFakeProgress({
    loading,
    success: exito,
    duracionMs: DURACION_ORIENTACION_MS,
  })

  if (loading || completing) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Sparkles size={16} className={styles.sparklesSpin} />
          <span>{mensajeCarga || 'Analizando lo que pasó con tu hijo...'}</span>
        </div>
        <ProgressBar
          value={progress}
          phase={phase}
          tone="onLight"
          label="Analizando lo que pasó"
          className={styles.progressSpace}
        />
        <CitaLoader categoria={categoria} />
      </div>
    )
  }

  if (!texto) return null

  const formatearTexto = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('Marco aplicado:')) {
        return <p key={i} className={styles.marco}>{line}</p>
      }
      if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^#{1,3} /)) {
        const content = line.replace(/^#{1,3} /, '').replace(/^\*\*|\*\*$/g, '')
        return <h4 key={i} className={styles.titulo}>{renderInline(content)}</h4>
      }
      if (line.startsWith('- ') || line.match(/^\d+\. /)) {
        return <li key={i} className={styles.item}>{renderInline(line.replace(/^([-\d*.]+ ?)/, ''))}</li>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className={styles.parrafo}>{renderInline(line)}</p>
    })
  }

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <Sparkles size={16} />
        <span>Orientación de Huella</span>
      </div>
      <div className={styles.content}>{formatearTexto(texto)}</div>
    </div>
  )
}
