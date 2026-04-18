import React from 'react'
import styles from './GraficoGatillantes.module.css'

export default function GraficoGatillantes({ episodios }) {
  const counts = {}
  for (const ep of episodios) {
    for (const g of ep.gatillantes || []) {
      counts[g] = (counts[g] || 0) + 1
    }
  }

  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (top.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
        Registra gatillantes en tus episodios para ver los más frecuentes.
      </p>
    )
  }

  const max = top[0][1]

  return (
    <div className={styles.wrap}>
      {top.map(([label, count]) => (
        <div key={label} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <div className={styles.track}>
            <div
              className={styles.bar}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className={styles.count}>{count}</span>
        </div>
      ))}
    </div>
  )
}
