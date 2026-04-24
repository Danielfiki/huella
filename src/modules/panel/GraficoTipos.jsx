import React from 'react'
import styles from './GraficoTipos.module.css'

const TIPO_META = {
  rabieta:     { label: 'Rabieta',     emoji: '💥', color: '#e87878' },
  llanto:      { label: 'Llanto',      emoji: '😭', color: '#7C8FD4' },
  agresividad: { label: 'Agresividad', emoji: '👊', color: '#C4714A' },
  miedo:       { label: 'Miedo',       emoji: '🫣', color: '#9B8EC4' },
  sueño:       { label: 'Sueño',       emoji: '🛏️', color: '#5B8DB8' },
  oposicion:   { label: 'Oposición',   emoji: '🚫', color: '#C4874A' },
  social:      { label: 'Social',      emoji: '🫥', color: '#7A9E6A' },
  desconexion: { label: 'Desconexión', emoji: '🔇', color: '#8A8A8A' },
  otro:        { label: 'Otro',        emoji: '📝', color: '#a0aec0' },
}

export default function GraficoTipos({ episodios }) {
  const counts = {}
  for (const ep of episodios) {
    if (ep.tipo) counts[ep.tipo] = (counts[ep.tipo] || 0) + 1
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])

  if (entries.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
        Sin datos de tipo de episodio.
      </p>
    )
  }

  const total = entries.reduce((s, [, c]) => s + c, 0)
  const maxCount = entries[0][1]

  return (
    <div className={styles.wrap}>
      {entries.map(([tipo, count]) => {
        const meta = TIPO_META[tipo] || { label: tipo, emoji: '📝', color: 'var(--color-primary-light)' }
        const pct = Math.round((count / total) * 100)
        return (
          <div key={tipo} className={styles.row}>
            <span className={styles.emoji}>{meta.emoji}</span>
            <span className={styles.label}>{meta.label}</span>
            <div className={styles.track}>
              <div
                className={styles.bar}
                style={{ width: `${(count / maxCount) * 100}%`, background: meta.color }}
              />
            </div>
            <span className={styles.pct}>{pct}%</span>
            <span className={styles.count}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}
