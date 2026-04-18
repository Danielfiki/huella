import React from 'react'
import styles from './GraficoFrecuenciaSemanal.module.css'

function getLast6Weeks() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 6 }, (_, i) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() - (5 - i) * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return {
      start,
      end,
      label: start.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      isCurrent: i === 5,
    }
  })
}

export default function GraficoFrecuenciaSemanal({ episodios }) {
  const weeks = getLast6Weeks()
  const counts = weeks.map((w) =>
    episodios.filter((e) => {
      const f = new Date(e.fecha)
      return f >= w.start && f < w.end
    }).length
  )
  const max = Math.max(...counts, 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.bars}>
        {weeks.map((w, i) => (
          <div key={i} className={styles.col}>
            {counts[i] > 0 && (
              <span className={styles.count}>{counts[i]}</span>
            )}
            <div className={styles.track}>
              <div
                className={`${styles.bar} ${w.isCurrent ? styles.barActual : ''}`}
                style={{ height: `${Math.max((counts[i] / max) * 100, counts[i] > 0 ? 10 : 3)}%` }}
              />
            </div>
            <span className={`${styles.label} ${w.isCurrent ? styles.labelActual : ''}`}>
              {w.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
