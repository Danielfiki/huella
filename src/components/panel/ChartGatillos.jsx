import React from 'react'
import styles from './chartGatillos.module.css'

export function ChartGatillos({ data }) {
  const max = Math.max(...data.map(t => t.count), 1)
  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h5>Gatillos más frecuentes</h5>
        <span className={styles.meta}>Últimos 30 días</span>
      </header>
      {data.map((t, i) => (
        <div key={i} className={styles.row}>
          <span
            className={styles.emoji}
            style={{ background: `var(--color-${t.bgToken})` }}
          >
            {t.emoji}
          </span>
          <div className={styles.info}>
            <div className={styles.name}>{t.label}</div>
            <div className={styles.meter}>
              <span
                className={styles.meterFill}
                style={{ width: `${(t.count / max) * 100}%` }}
              />
            </div>
          </div>
          <div className={styles.cnt}>
            {t.count}
            <small>veces</small>
          </div>
        </div>
      ))}
      {data.length < 3 && (
        <p className={styles.emptyNote}>
          Aún hay pocos datos para detectar patrones. Sigue registrando episodios para ver tendencias.
        </p>
      )}
    </section>
  )
}
