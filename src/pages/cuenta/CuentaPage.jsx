import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import UpgradeModal from '../../components/ui/UpgradeModal'

const FREE_FEATURES = [
  { ok: true,  text: 'Registro de episodios (hasta 15)' },
  { ok: true,  text: 'Orientación IA post-episodio' },
  { ok: true,  text: 'Logros y álbum de fotos' },
  { ok: true,  text: 'Gráficos de patrones' },
  { ok: false, text: 'Registro ilimitado de episodios' },
  { ok: false, text: 'Estrategias personalizadas ilimitadas' },
  { ok: false, text: 'Exportar informe PDF del historial' },
  { ok: false, text: 'Seguimiento post-episodio (check-in)' },
]

const PRO_FEATURES = [
  'Registro ilimitado de episodios',
  'Estrategias personalizadas ilimitadas',
  'Exportar informe PDF del historial',
  'Seguimiento post-episodio (check-in)',
  'Orientación IA post-episodio',
  'Logros y álbum de fotos',
  'Gráficos de patrones',
]

export default function CuentaPage() {
  const { isPro, isAdmin } = useHuella()
  const navigate = useNavigate()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const pro = isPro()
  const admin = isAdmin()
  const planLabel = admin ? 'Admin' : pro ? 'Pro' : 'Gratuito'
  const planColor = pro ? '#4a9e6f' : '#8a7a70'
  const planBg   = pro ? '#edf7f2' : '#f5f0eb'

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 80px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#8a7a70', fontSize: '14px', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        ← Volver
      </button>

      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#3a2e28', margin: '0 0 4px' }}>
        Mi plan
      </h2>
      <p style={{ fontSize: '14px', color: '#8a7a70', margin: '0 0 24px' }}>
        Gestiona tu suscripción a Huella.
      </p>

      {/* ── Badge de plan actual ── */}
      <div style={{
        background: planBg, borderRadius: '14px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: planColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Plan actual
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#3a2e28' }}>
            Huella {planLabel}
          </p>
        </div>
        <span style={{
          background: planColor, color: '#fff', borderRadius: '20px',
          padding: '5px 14px', fontSize: '13px', fontWeight: 700,
        }}>
          {planLabel}
        </span>
      </div>

      {pro ? (
        /* ── Vista Pro / Admin ── */
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#3a2e28' }}>
            ✅ Plan Pro activo
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#8a7a70' }}>
            Tienes acceso completo a todas las funcionalidades de Huella.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PRO_FEATURES.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#3a2e28' }}>
                <span style={{ color: '#4a9e6f', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* ── Vista Free ── */
        <>
          {/* Tabla de comparación */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#3a2e28' }}>
              ¿Qué incluye tu plan?
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {FREE_FEATURES.map((f) => (
                <li key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: f.ok ? '#3a2e28' : '#b0a098' }}>
                  <span style={{ flexShrink: 0, fontSize: '15px' }}>{f.ok ? '✓' : '✗'}</span>
                  {f.text}
                  {!f.ok && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#c96f45', background: '#fdf0e8', borderRadius: '10px', padding: '2px 8px', flexShrink: 0 }}>
                      Pro
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Pro */}
          <div style={{
            background: 'linear-gradient(135deg, #fdf0e8 0%, #fff5ef 100%)',
            border: '1.5px solid #f0d8c8', borderRadius: '16px', padding: '20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '20px' }}>✨</p>
            <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#3a2e28' }}>
              Huella Pro
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#8a7a70', lineHeight: 1.5 }}>
              Desbloquea el acompañamiento completo para el desarrollo emocional de tu hijo/a.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#c96f45' }}>$5.990</span>
              <span style={{ fontSize: '14px', color: '#8a7a70' }}> / mes</span>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                width: '100%', padding: '14px', background: '#c96f45', color: '#fff',
                border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Activar Pro — $5.990/mes
            </button>
          </div>
        </>
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
