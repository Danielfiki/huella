import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import UpgradeModal from '../../components/ui/UpgradeModal'
import { MAX_EPISODIOS_FREE } from '../estrategias/helpers'

const FREE_FEATURES = [
  { ok: true,  text: `Hasta ${MAX_EPISODIOS_FREE} episodios` },
  { ok: true,  text: '1 hijo' },
  { ok: true,  text: 'Orientación IA básica post-episodio' },
  { ok: true,  text: 'Historial últimos 7 días' },
  { ok: false, text: 'Episodios ilimitados' },
  { ok: false, text: 'Hijos ilimitados' },
  { ok: false, text: 'Orientación IA personalizada por episodio' },
  { ok: false, text: 'Acción inmediata IA' },
  { ok: false, text: 'Consejo diario personalizado' },
  { ok: false, text: 'Análisis de patrones con IA' },
  { ok: false, text: 'Estrategias de 4 semanas con tareas concretas' },
  { ok: false, text: 'Check-in emocional al día siguiente' },
  { ok: false, text: 'Historial completo sin límite de tiempo' },
  { ok: false, text: 'Búsqueda en todos tus registros' },
  { ok: false, text: 'Informe PDF exportable' },
  { ok: false, text: 'Rutina diaria con marcadores de riesgo' },
  { ok: false, text: 'Notificaciones inteligentes' },
  { ok: false, text: 'Álbum de avances con fotos' },
  { ok: false, text: 'Medallas y logros (34 badges)' },
  { ok: false, text: 'Modo familia — conecta con tu pareja' },
]

const PRO_FEATURES = [
  { emoji: '♾️', text: 'Episodios ilimitados' },
  { emoji: '👨‍👩‍👧‍👦', text: 'Hijos ilimitados' },
  { emoji: '🧠', text: 'Orientación IA personalizada por episodio (calibrada a edad y perfil)' },
  { emoji: '⚡', text: 'Acción inmediata IA — qué hacer en los próximos minutos' },
  { emoji: '💡', text: 'Consejo diario personalizado basado en tus datos reales' },
  { emoji: '📊', text: 'Análisis de patrones con IA — conexiones entre episodios en el tiempo' },
  { emoji: '🎯', text: 'Estrategias de 4 semanas con tareas concretas por habilidad' },
  { emoji: '🔄', text: 'Check-in emocional al día siguiente — seguimiento real de cada episodio' },
  { emoji: '📂', text: 'Historial completo sin límite de tiempo' },
  { emoji: '🔍', text: 'Búsqueda en todos tus registros' },
  { emoji: '📄', text: 'Informe PDF exportable para psicólogo o especialista' },
  { emoji: '🕐', text: 'Rutina diaria del hijo con marcadores de momentos de riesgo' },
  { emoji: '🔔', text: 'Notificaciones inteligentes — recordatorios y check-ins automáticos' },
  { emoji: '📸', text: 'Álbum de avances con fotos' },
  { emoji: '🏅', text: 'Medallas y logros — 34 badges de progreso parental' },
  { emoji: '👫', text: 'Modo familia — conecta con tu pareja' },
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
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PRO_FEATURES.map((f) => (
              <li key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#3a2e28', lineHeight: 1.4 }}>
                <span style={{ flexShrink: 0, fontSize: '16px', marginTop: '1px' }}>{f.emoji}</span>
                {f.text}
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
