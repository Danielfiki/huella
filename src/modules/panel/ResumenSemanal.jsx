import React from 'react'
import Card from '../../components/ui/Card'

function getUltimos7Dias(episodios) {
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  return episodios.filter((e) => new Date(e.fecha) >= hace7)
}

function promedioIntensidad(eps) {
  if (!eps.length) return 0
  return (eps.reduce((s, e) => s + (e.intensidad || 0), 0) / eps.length).toFixed(1)
}

export default function ResumenSemanal({ episodios }) {
  const semana = getUltimos7Dias(episodios)
  const total = semana.length
  const promedio = promedioIntensidad(semana)

  const frecuenciaTipos = semana.reduce((acc, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + 1
    return acc
  }, {})
  const tipoFrecuente = Object.entries(frecuenciaTipos).sort((a, b) => b[1] - a[1])[0]

  return (
    <Card>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600 }}>
        Últimos 7 días
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{total}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted, #6b7280)', margin: 0 }}>episodios</p>
        </div>
        <div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{promedio}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted, #6b7280)', margin: 0 }}>intensidad</p>
        </div>
        <div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            {tipoFrecuente ? tipoFrecuente[1] : '—'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted, #6b7280)', margin: 0 }}>
            {tipoFrecuente ? tipoFrecuente[0] : 'sin datos'}
          </p>
        </div>
      </div>
      {total === 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-muted, #6b7280)', textAlign: 'center' }}>
          Sin episodios esta semana.
        </p>
      )}
    </Card>
  )
}
