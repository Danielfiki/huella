import React from 'react'

const DOT_FILL = { 1: '#8FA840', 2: '#8FA840', 3: '#F08070', 4: '#E56E26', 5: '#A07060' }

export default function GraficoIntensidad({ episodios }) {
  // Chronological order, last 20
  const data = [...episodios].reverse().slice(-20)

  if (data.length < 2) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
        Registra más episodios para ver la tendencia de intensidad.
      </p>
    )
  }

  const W = 300
  const H = 80
  const P = { top: 8, right: 6, bottom: 4, left: 36 }
  const iW = W - P.left - P.right
  const iH = H - P.top - P.bottom

  const cx = (i) => P.left + (i / (data.length - 1)) * iW
  const cy = (v) => P.top + ((5 - v) / 4) * iH

  const linePts = data.map((ep, i) => `${cx(i)},${cy(ep.intensidad)}`).join(' ')

  const fmtFecha = (str) =>
    new Date(str).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grid lines y etiquetas Y */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line
              x1={P.left} x2={P.left + iW}
              y1={cy(v)} y2={cy(v)}
              stroke="var(--color-border)" strokeWidth="0.7"
              strokeDasharray={v === 3 ? '0' : '3,3'}
            />
            <text
              x={P.left - 4} y={cy(v) + 3.5}
              textAnchor="end" fontSize="8"
              fill="var(--color-text-light)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Línea de tendencia */}
        <polyline
          points={linePts}
          fill="none"
          stroke="var(--color-primary-light)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Puntos */}
        {data.map((ep, i) => (
          <circle
            key={`${ep.id}-${i}`}
            cx={cx(i)} cy={cy(ep.intensidad)} r="4"
            fill={DOT_FILL[ep.intensidad] || 'var(--color-primary-light)'}
            stroke="white" strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Eje X: primera y última fecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-light)' }}>
          {fmtFecha(data[0].fecha)}
        </span>
        {data.length > 2 && (
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            {data.length} episodios
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--color-text-light)' }}>
          {fmtFecha(data[data.length - 1].fecha)}
        </span>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { color: DOT_FILL[1], label: 'Muy leve' },
          { color: DOT_FILL[3], label: 'Moderado' },
          { color: DOT_FILL[5], label: 'Muy intenso' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
