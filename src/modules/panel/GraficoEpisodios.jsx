import React from 'react'

function getLast14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })
}

export default function GraficoEpisodios({ episodios }) {
  const days = getLast14Days()

  const counts = days.map((day) => {
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    return episodios.filter((e) => {
      const f = new Date(e.fecha)
      return f >= day && f < next
    }).length
  })

  const max = Math.max(...counts, 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
      {days.map((day, i) => {
        const height = Math.round((counts[i] / max) * 100)
        const label = day.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
        return (
          <div
            key={i}
            title={`${label}: ${counts[i]} ep.`}
            style={{
              flex: 1,
              height: `${Math.max(height, 4)}%`,
              backgroundColor: counts[i] > 0 ? 'var(--color-primary, #6366f1)' : 'var(--color-border, #e5e7eb)',
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s',
            }}
          />
        )
      })}
    </div>
  )
}
