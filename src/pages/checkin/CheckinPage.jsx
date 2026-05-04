import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { generarReflexionCheckin } from '../../services/anthropic'

const OPCIONES_PASO1 = [
  'Me calmé primero antes de actuar',
  'Lo acompañé sin hablar',
  'Usé palabras concretas y breves',
  'Le di espacio hasta que se calmó',
]

const OPCIONES_EVOLUCION = [
  { valor: 'mejoro', emoji: '📈', label: 'Mejoró',  color: '#4a9e6f' },
  { valor: 'igual',  emoji: '➡️', label: 'Igual',   color: '#b8860b' },
  { valor: 'empero', emoji: '📉', label: 'Empeoró', color: '#c96f45' },
]

const OPCIONES_ESTADO = [
  { valor: 'agotado',   emoji: '😮‍💨', label: 'Agotado/a'   },
  { valor: 'frustrado', emoji: '😤',   label: 'Frustrado/a' },
  { valor: 'neutral',   emoji: '😐',   label: 'Neutral'     },
  { valor: 'bien',      emoji: '🙂',   label: 'Bien'        },
  { valor: 'orgulloso', emoji: '🥲',   label: 'Orgulloso/a' },
]

export default function CheckinPage() {
  const { episodioId } = useParams()
  const navigate = useNavigate()
  const { state, addCheckin, getCheckin } = useHuella()
  const { episodios, hijo } = state

  const episodio = episodios.find(e => e.id === episodioId) ?? null
  const nombreHijo = hijo?.nombre || 'tu hijo/a'

  const [paso, setPaso] = useState(0)
  const [opcionSeleccionada, setOpcionSeleccionada] = useState(null)
  const [queIntentaste, setQueIntentaste] = useState('')
  const [evolucion, setEvolucion] = useState(null)
  const [respuestaHijo, setRespuestaHijo] = useState('')
  const [estadoPadre, setEstadoPadre] = useState(null)
  const [reflexionIA, setReflexionIA] = useState('')
  const [cargandoIA, setCargandoIA] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [yaHecho, setYaHecho] = useState(false)

  useEffect(() => {
    getCheckin(episodioId).then(existing => { if (existing) setYaHecho(true) })
  }, [episodioId])

  const contextoIA = episodio?.orientacionIA
    ? episodio.orientacionIA.split('\n').filter(l => l.trim()).slice(0, 2).join(' ')
    : null

  function queIntentasteTexto() {
    return opcionSeleccionada || queIntentaste.trim()
  }

  async function handleSiguiente() {
    if (paso < 2) { setPaso(p => p + 1); return }
    setCargandoIA(true)
    setPaso(3)
    try {
      const texto = await generarReflexionCheckin({
        hijo,
        episodio,
        checkin: {
          queIntentaste: queIntentasteTexto(),
          respuestaHijo,
          evolucion,
          estadoPadre,
        },
      })
      setReflexionIA(texto ?? '')
    } catch {
      setReflexionIA('')
    } finally {
      setCargandoIA(false)
    }
  }

  async function handleGuardar() {
    setGuardando(true)
    try {
      await addCheckin(episodioId, {
        queIntentaste: queIntentasteTexto() || null,
        respuestaHijo: respuestaHijo || null,
        evolucion,
        estadoPadre,
        reflexionIA: reflexionIA || null,
      })
      navigate('/historial')
    } catch {
      setGuardando(false)
    }
  }

  if (!episodio) {
    return (
      <div style={s.page}>
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: '40px' }}>
          Episodio no encontrado.
        </p>
      </div>
    )
  }

  if (yaHecho) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <p style={{ fontSize: '36px', textAlign: 'center', margin: '0 0 8px' }}>✓</p>
          <p style={{ ...s.subtitle, textAlign: 'center' }}>
            Ya registraste el seguimiento de este episodio.
          </p>
          <button style={s.btnPrimary} onClick={() => navigate('/historial')}>
            Volver al historial
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.dots}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ ...s.dot, background: i <= paso ? 'var(--color-primary, #c96f45)' : '#e0d5cc' }} />
        ))}
      </div>

      {/* ── Paso 0: ¿Qué intentaste? ── */}
      {paso === 0 && (
        <div style={s.card}>
          <h2 style={s.titulo}>¿Qué intentaste?</h2>
          {contextoIA && (
            <div style={s.contextoBox}>
              <span style={s.contextoLabel}>Huella te orientó a</span>
              <p style={s.contextoTexto}>{contextoIA}</p>
            </div>
          )}
          <div style={s.opciones}>
            {OPCIONES_PASO1.map(op => (
              <button
                key={op}
                style={{ ...s.opcionBtn, ...(opcionSeleccionada === op ? s.opcionBtnActive : {}) }}
                onClick={() => { setOpcionSeleccionada(op); setQueIntentaste('') }}
              >
                {op}
              </button>
            ))}
          </div>
          <p style={s.oLabel}>O escribe lo que hiciste:</p>
          <textarea
            style={s.textarea}
            placeholder="Describe en pocas palabras…"
            value={queIntentaste}
            onChange={e => { setQueIntentaste(e.target.value); setOpcionSeleccionada(null) }}
            rows={3}
          />
          <button
            style={{ ...s.btnPrimary, ...(!queIntentasteTexto() ? s.btnDisabled : {}) }}
            onClick={handleSiguiente}
            disabled={!queIntentasteTexto()}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* ── Paso 1: ¿Cómo respondió [nombre]? ── */}
      {paso === 1 && (
        <div style={s.card}>
          <h2 style={s.titulo}>¿Cómo respondió {nombreHijo}?</h2>
          <div style={s.evolucionRow}>
            {OPCIONES_EVOLUCION.map(op => (
              <button
                key={op.valor}
                style={{
                  ...s.evolucionBtn,
                  borderColor: evolucion === op.valor ? op.color : '#e0d5cc',
                  background:  evolucion === op.valor ? op.color + '1a' : '#fff',
                }}
                onClick={() => setEvolucion(op.valor)}
              >
                <span style={{ fontSize: '28px' }}>{op.emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#3a2e28', marginTop: '6px' }}>
                  {op.label}
                </span>
              </button>
            ))}
          </div>
          <textarea
            style={{ ...s.textarea, marginTop: '4px' }}
            placeholder="¿Qué pasó exactamente? (opcional)"
            value={respuestaHijo}
            onChange={e => setRespuestaHijo(e.target.value)}
            rows={3}
          />
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={() => setPaso(0)}>Atrás</button>
            <button
              style={{ ...s.btnPrimary, ...(!evolucion ? s.btnDisabled : {}) }}
              onClick={handleSiguiente}
              disabled={!evolucion}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2: ¿Cómo estás tú? ── */}
      {paso === 2 && (
        <div style={s.card}>
          <h2 style={s.titulo}>¿Cómo estás tú?</h2>
          <p style={s.subtitle}>Tu estado emocional también importa registrarlo.</p>
          <div style={s.estadoRow}>
            {OPCIONES_ESTADO.map(op => (
              <button
                key={op.valor}
                style={{
                  ...s.estadoBtn,
                  borderColor: estadoPadre === op.valor ? 'var(--color-primary, #c96f45)' : '#e0d5cc',
                  background:  estadoPadre === op.valor ? '#fdf0e8' : '#fff',
                }}
                onClick={() => setEstadoPadre(op.valor)}
              >
                <span style={{ fontSize: '24px' }}>{op.emoji}</span>
                <span style={{ fontSize: '11px', color: '#5a4a42', marginTop: '4px', textAlign: 'center', lineHeight: 1.2 }}>
                  {op.label}
                </span>
              </button>
            ))}
          </div>
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={() => setPaso(1)}>Atrás</button>
            <button
              style={{ ...s.btnPrimary, ...(!estadoPadre ? s.btnDisabled : {}) }}
              onClick={handleSiguiente}
              disabled={!estadoPadre}
            >
              Ver reflexión
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 3: Reflexión IA ── */}
      {paso === 3 && (
        <div style={s.card}>
          <h2 style={s.titulo}>Reflexión</h2>
          {cargandoIA ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-muted, #8a7a70)', fontSize: '14px' }}>
                Generando reflexión…
              </p>
            </div>
          ) : (
            <div style={s.reflexionBox}>
              <p style={s.reflexionTexto}>
                {reflexionIA || 'No se pudo generar una reflexión. Puedes guardar igual.'}
              </p>
            </div>
          )}
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={() => setPaso(2)} disabled={guardando || cargandoIA}>
              Atrás
            </button>
            <button
              style={{ ...s.btnPrimary, ...(guardando || cargandoIA ? s.btnDisabled : {}) }}
              onClick={handleGuardar}
              disabled={guardando || cargandoIA}
            >
              {guardando ? 'Guardando…' : 'Guardar y terminar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '24px 16px 80px',
  },
  dots: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background 0.2s',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  },
  titulo: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#3a2e28',
    margin: '0 0 16px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8a7a70',
    margin: '0 0 16px',
    lineHeight: 1.5,
  },
  contextoBox: {
    background: '#fdf6f0',
    borderLeft: '3px solid #c96f45',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '16px',
  },
  contextoLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#c96f45',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '4px',
  },
  contextoTexto: {
    fontSize: '13px',
    color: '#5a4a42',
    margin: 0,
    lineHeight: 1.5,
  },
  opciones: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  opcionBtn: {
    background: '#fff',
    border: '1.5px solid #e0d5cc',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '14px',
    color: '#3a2e28',
    textAlign: 'left',
    cursor: 'pointer',
  },
  opcionBtnActive: {
    borderColor: '#c96f45',
    background: '#fdf0e8',
    fontWeight: 600,
  },
  oLabel: {
    fontSize: '13px',
    color: '#8a7a70',
    margin: '0 0 8px',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1.5px solid #e0d5cc',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#3a2e28',
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: '16px',
    outline: 'none',
  },
  evolucionRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
  },
  evolucionBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 6px',
    border: '2px solid #e0d5cc',
    borderRadius: '12px',
    background: '#fff',
    cursor: 'pointer',
  },
  estadoRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '20px',
  },
  estadoBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px',
    border: '1.5px solid #e0d5cc',
    borderRadius: '10px',
    background: '#fff',
    cursor: 'pointer',
  },
  reflexionBox: {
    background: '#fdf6f0',
    borderRadius: '12px',
    padding: '18px',
    marginBottom: '20px',
    minHeight: '80px',
  },
  reflexionTexto: {
    fontSize: '15px',
    color: '#3a2e28',
    lineHeight: 1.65,
    margin: 0,
  },
  btnRow: {
    display: 'flex',
    gap: '10px',
  },
  btnPrimary: {
    flex: 1,
    padding: '13px',
    background: '#c96f45',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '13px 18px',
    background: '#f5ede6',
    color: '#c96f45',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}
