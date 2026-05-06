import React from 'react'
import styles from './chartIntensidad.module.css'

export function ChartIntensidad({ data, caption }) {
  const W = 320, H = 80, pad = 8
  const validData = data.filter(d => d.value > 0)
  if (validData.length < 2) {
    return (
      <section className={styles.card}>
        <header className={styles.head}>
          <h5>Intensidad en el tiempo</h5>
          <span className={styles.meta}>7 días</span>
        </header>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '8px 0 0' }}>
          Registra más episodios para ver la tendencia.
        </p>
      </section>
    )
  }

  const xs = data.map((_, i) => (i * (W - pad * 2)) / (data.length - 1) + pad)
  const ys = data.map(d => H - pad - (d.value / 5) * (H - pad * 2))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  const areaPath = `${path} L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`
  const pi = data.reduce((iMax, d, i, a) => d.value > a[iMax].value ? i : iMax, 0)

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h5>Intensidad en el tiempo</h5>
        <span className={styles.meta}>7 días</span>
      </header>
      <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="intFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-mocha)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-accent-mocha)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="20" x2={W} y2="20" stroke="var(--color-border)" strokeDasharray="3,4" />
        <line x1="0" y1="50" x2={W} y2="50" stroke="var(--color-border)" strokeDasharray="3,4" />
        <path d={areaPath} fill="url(#intFade)" />
        <path d={path} fill="none" stroke="var(--color-accent-mocha)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xs[pi]} cy={ys[pi]} r="9" fill="var(--color-primary)" fillOpacity="0.18" />
        <circle cx={xs[pi]} cy={ys[pi]} r="4" fill="var(--color-primary)" />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4" fill="var(--color-accent-mocha)" />
      </svg>
      <div className={styles.axis}>{data.map((d, i) => <span key={i}>{d.day}</span>)}</div>
      {caption && <p className={styles.caption}><strong>{caption}</strong></p>}
    </section>
  )
}
