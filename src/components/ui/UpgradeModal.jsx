import React from 'react'
import { createPortal } from 'react-dom'

const FEATURES = [
  'Estrategias de 4 semanas con tareas concretas',
  'Exportar informes PDF del historial',
  'Registro ilimitado de episodios',
  'Seguimiento post-episodio (check-in)',
]

export default function UpgradeModal({ onClose, tituloCustom, mensajeCustom }) {
  // Portal a document.body: el modal vive fuera de .pageWrap (que queda con
  // transform tras la animación de página y captura el position:fixed). Así
  // el overlay se ancla al viewport y queda centrado, sin importar el scroll.
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 'max(16px, env(safe-area-inset-bottom)) 16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '20px',
          padding: '28px 24px 32px', width: '100%', maxWidth: '480px',
          maxHeight: '90dvh', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#c96f45' }}>CLP 9.990</span>
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
          Activar Huella Pro
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
    </div>,
    document.body
  )
}
