import React, { useState } from 'react'
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

function getTooltipDias(episodios, week) {
  const byDay = new Map()
  for (const ep of episodios) {
    const f = new Date(ep.fecha)
    if (f < week.start || f >= week.end) continue
    const key = f.toDateString()
    if (!byDay.has(key)) {
      byDay.set(key, {
        ts: f.getTime(),
        label: f.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
        count: 0,
      })
    }
    byDay.get(key).count++
  }
  return [...byDay.values()].sort((a, b) => a.ts - b.ts)
}

export default function GraficoFrecuenciaSemanal({ episodios, estrategiaInicio }) {
  const [activoIdx, setActivoIdx] = useState(null)

  const weeks = getLast6Weeks()
  const counts = weeks.map((w) =>
    episodios.filter((e) => {
      const f = new Date(e.fecha)
      return f >= w.start && f < w.end
    }).length
  )
  const max = Math.max(...counts, 1)

  const estrategiaSemana = estrategiaInicio
    ? weeks.findIndex((w) => {
        const d = new Date(estrategiaInicio)
        return d >= w.start && d < w.end
      })
    : -1
  const mostrarLinea = estrategiaSemana > 0 && estrategiaSemana < 5

  const tooltipDias = activoIdx !== null && counts[activoIdx] > 0
    ? getTooltipDias(episodios, weeks[activoIdx])
    : []

  function handleBarClick(e, i) {
    e.stopPropagation()
    setActivoIdx(activoIdx === i ? null : i)
  }

  return (
    <div className={styles.wrap} onClick={() => setActivoIdx(null)}>
      <div className={styles.bars}>
        {weeks.map((w, i) => (
          <div
            key={i}
            className={`${styles.col} ${counts[i] > 0 ? styles.colTappable : ''}`}
            onClick={(e) => counts[i] > 0 && handleBarClick(e, i)}
          >
            {activoIdx === i && tooltipDias.length > 0 && (
              <div className={[
                styles.tooltip,
                i <= 1 ? styles.tooltipLeft : i >= 4 ? styles.tooltipRight : '',
              ].filter(Boolean).join(' ')}>
                {tooltipDias.map((d) => (
                  <span key={d.label} className={styles.tooltipDia}>
                    {d.label}{d.count > 1 ? ` ×${d.count}` : ''}
                  </span>
                ))}
              </div>
            )}
            {counts[i] > 0 && (
              <span className={styles.count}>{counts[i]}</span>
            )}
            <div className={styles.track}>
              <div
                className={[
                  styles.bar,
                  w.isCurrent ? styles.barActual : '',
                  activoIdx === i ? styles.barSeleccionado : '',
                ].filter(Boolean).join(' ')}
                style={{ height: `${Math.max((counts[i] / max) * 100, counts[i] > 0 ? 10 : 3)}%` }}
              />
            </div>
            <span className={`${styles.label} ${w.isCurrent ? styles.labelActual : ''}`}>
              {w.label}
            </span>
          </div>
        ))}

        {mostrarLinea && (
          <div
            className={styles.estrategiaLinea}
            style={{ left: `calc(${(estrategiaSemana / 6) * 100}% - 1px)` }}
          />
        )}
      </div>

      {mostrarLinea && (
        <div className={styles.estrategiaLeyenda}>
          <span className={styles.estrategiaTrazo} />
          <span>inicio de estrategia</span>
        </div>
      )}
    </div>
  )
}
