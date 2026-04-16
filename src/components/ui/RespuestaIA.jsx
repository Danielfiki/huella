import React from 'react'
import styles from './RespuestaIA.module.css'
import { Sparkles } from 'lucide-react'

export default function RespuestaIA({ texto, loading = false }) {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Sparkles size={16} />
          <span>Analizando...</span>
        </div>
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} style={{ width: '80%' }} />
          <div className={styles.skeletonLine} style={{ width: '90%' }} />
        </div>
      </div>
    )
  }

  if (!texto) return null

  const formatearTexto = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('Marco aplicado:')) {
        return <p key={i} className={styles.marco}>{line}</p>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className={styles.titulo}>{line.replace(/\*\*/g, '')}</h4>
      }
      if (line.match(/^\*\*(.+)\*\*/)) {
        const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      }
      if (line.startsWith('- ') || line.match(/^\d+\. /)) {
        return <li key={i} className={styles.item}>{line.replace(/^[-\d.] /, '')}</li>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className={styles.parrafo}>{line}</p>
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Sparkles size={16} />
        <span>Orientación de Huella</span>
      </div>
      <div className={styles.content}>{formatearTexto(texto)}</div>
    </div>
  )
}
