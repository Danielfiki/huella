import React from 'react'

const FEATURES = [
  'Estrategias personalizadas ilimitadas',
  'Exportar informes PDF del historial',
  'Registro ilimitado de episodios',
  'Seguimiento post-episodio (check-in)',
]

export default function UpgradeModal({ onClose, tituloCustom, mensajeCustom }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000, padding: '0 0 env(safe-area-inset-bottom)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '28px 24px 32px', width: '100%', maxWidth: '480px',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '36px', margin: '0 0 8px' }}>✨</p>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#3a2e28' }}>
            {tituloCustom || 'Huella Pro'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#8a7a70', lineHeight: 1.5 }}>
            {mensajeCustom || 'Todo lo que necesitas para acompañar el desarrollo emocional de tu hijo/a con profundidad.'}
          </p>
        </div>

        <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FEATURES.map((f) => (
            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#3a2e28' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#c96f45' }}>$5.990</span>
          <span style={{ fontSize: '14px', color: '#8a7a70' }}> / mes</span>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', background: '#c96f45', color: '#fff',
            border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700,
            cursor: 'pointer', marginBottom: '10px',
          }}
        >
          Probar 7 días gratis
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', background: 'transparent', color: '#8a7a70',
            border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
