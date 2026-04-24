import React from 'react'
import styles from './GraficoDiaSemana.module.css'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function GraficoDiaSemana({ episodios }) {
  const counts = Array(7).fill(0)
  for (const ep of episodios) {
    const d = new Date(ep.fecha).getDay()
    counts[d === 0 ? 6 : d - 1]++ // Mon=0…Sun=6
  }

  const max = Math.max(...counts, 1)
  const peakIdx = counts.indexOf(Math.max(...counts))

  return (
    <div className={styles.wrap}>
      <div className={styles.bars}>
        {DIAS.map((dia, i) => (
          <div key={dia} className={styles.col}>
            {counts[i] > 0 && (
              <span className={styles.count}>{counts[i]}</span>
            )}
            <div className={styles.track}>
              <div
                className={`${styles.bar} ${i === peakIdx && counts[i] > 0 ? styles.barPeak : ''}`}
                style={{ height: `${Math.max((counts[i] / max) * 100, counts[i] > 0 ? 10 : 3)}%` }}
              />
            </div>
            <span className={`${styles.label} ${i === peakIdx && counts[i] > 0 ? styles.labelPeak : ''}`}>
              {dia}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
