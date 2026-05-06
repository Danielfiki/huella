import React from 'react'
import styles from './chartFrecuencia.module.css'

export function ChartFrecuencia({ data, peakCaption }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const peakIdx = data.reduce((iMax, d, i, a) => d.count > a[iMax].count ? i : iMax, 0)

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h5>Frecuencia diaria</h5>
        <span className={styles.meta}>7 días</span>
      </header>
      <div className={styles.bars}>
        {data.map((d, i) => {
          const heightPx = d.count === 0 ? 6 : 12 + (d.count / max) * 64
          const cls = [styles.col, d.count === 0 ? styles.zero : i === peakIdx ? styles.peak : ''].join(' ')
          return (
            <div key={i} className={cls}>
              <div className={styles.bar} style={{ height: d.count === 0 ? 6 : heightPx }} />
            </div>
          )
        })}
      </div>
      <div className={styles.dayLabels}>
        {data.map((d, i) => (
          <span key={i} className={i === peakIdx && d.count > 0 ? styles.peakLabel : ''}>{d.day}</span>
        ))}
      </div>
      <div className={styles.counts}>
        {data.map((d, i) => (
          <span key={i} className={i === peakIdx && d.count > 0 ? styles.peakCount : ''}>{d.count}</span>
        ))}
      </div>
      {peakCaption && (
        <p className={styles.caption}><strong>{peakCaption}</strong></p>
      )}
    </section>
  )
}
