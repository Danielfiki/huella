import React from 'react'
import styles from './RespuestaIA.module.css'
import { Sparkles } from 'lucide-react'
import CitaLoader from './CitaLoader'
import { renderInline } from '../../utils/renderMarkdown'

export default function RespuestaIA({ texto, loading = false, mensajeCarga, compact = false, categoria = 'regulacion' }) {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Sparkles size={16} className={styles.sparklesSpin} />
          <span>{mensajeCarga || 'Analizando lo que pasó con tu hijo...'}</span>
        </div>
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
