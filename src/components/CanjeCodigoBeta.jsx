import React, { useState } from 'react'
import { Ticket } from 'lucide-react'
import { useHuella } from '../context/HuellaContext'

// Seccion de canje de codigo de beta. Componente compartido entre el Home
// (PanelPage) y la pagina de plan (CuentaPage) para no duplicar ni el markup
// ni el manejo de estado. La logica de canje vive en el contexto
// (canjearCodigoBeta): llama la RPC, mapea el resultado a mensaje y en exito
// hace reloadData() para que isPro() cambie al instante.
//
// Auto-gating: el componente se esconde solo cuando el usuario ya es Pro, PERO
// prioriza mostrar el mensaje de exito. Asi, tras un canje OK, reloadData()
// vuelve true a isPro() y aun asi la confirmacion en verde sigue visible (se
// evalua resultado.ok ANTES que isPro). Por eso el padre lo monta sin gatear:
// el gate {!isPro()} vive aca dentro para no perder la confirmacion en el
// instante en que el plan pasa a Pro.
export default function CanjeCodigoBeta() {
  const { canjearCodigoBeta, isPro } = useHuella()
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)   // { ok, mensaje } | null

  const exito = resultado?.ok === true

  async function handleSubmit(e) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setResultado(null)
    const r = await canjearCodigoBeta(codigo)
    setResultado(r)
    if (r.ok) setCodigo('')
    setEnviando(false)
  }

  // Ya es Pro y no acaba de canjear aqui: nada que mostrar.
  if (isPro() && !exito) return null

  const cardStyle = {
    background: exito ? 'var(--color-success-bg)' : 'var(--color-surface)',
    border: `1.5px solid ${exito ? 'var(--color-success)' : 'var(--color-primary-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    boxShadow: 'var(--shadow-sm)',
  }

  // Estado de exito: card en verde solo con la confirmacion.
  if (exito) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-success)' }}>
          {resultado.mensaje}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'var(--color-accent-mocha)', color: 'var(--color-on-mocha)',
          display: 'grid', placeItems: 'center',
        }}>
          <Ticket size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Acceso de beta
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
            ¿Tienes un código de invitación?
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ingresa tu código"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={enviando}
          style={{
            flex: 1, minWidth: 0,
            padding: '10px 12px',
            fontSize: '14px',
            fontFamily: 'inherit',
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            textTransform: 'uppercase',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={enviando}
          style={{
            flexShrink: 0,
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
            color: 'var(--color-on-mocha)',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: enviando ? 'default' : 'pointer',
            opacity: enviando ? 0.7 : 1,
          }}
        >
          {enviando ? 'Activando…' : 'Activar'}
        </button>
      </div>

      {resultado && !resultado.ok && (
        <p style={{
          margin: '10px 0 0',
          fontSize: '13px',
          color: 'var(--color-danger-text)',
        }}>
          {resultado.mensaje}
        </p>
      )}
    </form>
  )
}
