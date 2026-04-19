import React from 'react'
import Card from '../../components/ui/Card'

const TIPO_EMOJIS = {
  'Rabieta / explosión': '😤',
  'Llanto intenso': '😢',
  'Golpes / agresividad': '👊',
  'Miedo / angustia': '😨',
  'No quiere dormir': '😴',
  'Se aisló / no quiso relacionarse': '🫂',
  'Se cerró / no respondía': '😶',
  'Oposición / no coopera': '🙅',
  'Otro': '❓',
}

function getUltimos7Dias(items) {
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  return items.filter((e) => new Date(e.fecha) >= hace7)
}

function promedioIntensidad(eps) {
  if (!eps.length) return 0
  return (eps.reduce((s, e) => s + (e.intensidad || 0), 0) / eps.length).toFixed(1)
}

export default function ResumenSemanal({ episodios, hitos = [] }) {
  const semana = getUltimos7Dias(episodios)
  const total = semana.length
  const promedio = promedioIntensidad(semana)
  const hitosSemana = getUltimos7Dias(hitos).length

  const frecuenciaTipos = semana.reduce((acc, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + 1
    return acc
  }, {})
  const tipoFrecuente = Object.entries(frecuenciaTipos).sort((a, b) => b[1] - a[1])[0]

  const tipoNombre = tipoFrecuente ? tipoFrecuente[0] : null
  const tipoEmoji = tipoNombre ? (TIPO_EMOJIS[tipoNombre] || '❓') : null

  return (
    <Card>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600 }}>
        Últimos 7 días
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{total}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>episodios</p>
        </div>
        <div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{promedio}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>intensidad</p>
        </div>
        <div>
          {tipoNombre ? (
            <>
              <p style={{ fontSize: '1.4rem', margin: 0 }}>{tipoEmoji}</p>
              <p style={{
                fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text)',
                margin: '1px 0 0', lineHeight: 1.2,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {tipoNombre}
              </p>
              <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '1px 0 0' }}>
                más frecuente
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>—</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>sin datos</p>
            </>
          )}
        </div>
      </div>

      {hitosSemana > 0 && (
        <p style={{
          marginTop: '0.75rem', fontSize: '0.82rem',
          color: 'var(--color-success)',
          textAlign: 'center', borderTop: '1px solid var(--color-border)',
          paddingTop: '0.6rem',
        }}>
          ⭐ {hitosSemana} {hitosSemana === 1 ? 'hito positivo' : 'hitos positivos'} esta semana
        </p>
      )}

      {total === 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Sin episodios esta semana.
        </p>
      )}
    </Card>
  )
}
