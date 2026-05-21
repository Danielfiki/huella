import React, { useEffect, useRef, useState } from 'react'
import s from './MedallaDetalleModal.module.css'

// Mapeo tono → clase del card. Refleja exactamente los 5 tonos de medalla
// definidos en HitosPage.module.css usando los mismos tokens CSS.
const tonoCls = {
  estrella:    s.tEstrella,
  celebracion: s.tCelebracion,
  calma:       s.tCalma,
  constancia:  s.tConstancia,
  base:        s.tBase,
}

const fmtFechaLogro = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function formatFechaLogro(iso) {
  if (!iso) return ''
  try {
    return fmtFechaLogro.format(new Date(iso)).replace(/\./g, '')
  } catch {
    return ''
  }
}

// Glifo SVG por tono · escala 38×38 (el disco interior es 96×96).
function MedalIcon({ tono }) {
  switch (tono) {
    case 'estrella':
      return (
        <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.5L22 10l-5.4 4.7L18 22l-6-3.6L6 22l1.4-7.3L2 10l7.1-1.5L12 2z" />
        </svg>
      )
    case 'celebracion':
      return (
        <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7-4.8-9.3-9C0.8 7.6 4 4 8 5.5c1.6.6 3 1.9 4 3.4 1-1.5 2.4-2.8 4-3.4 4-1.5 7.2 2.1 5.3 6.5C19 16.2 12 21 12 21z" />
        </svg>
      )
    case 'calma':
      return (
        <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-3 4.5-6 8-6 11.5A6 6 0 0 0 12 21a6 6 0 0 0 6-6.5C18 11 15 7.5 12 3z" />
        </svg>
      )
    case 'constancia':
      return (
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      )
    case 'base':
    default:
      return (
        <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}

export default function MedallaDetalleModal({ medalla, dataBadge, onClose }) {
  const overlayRef = useRef(null)
  const closeBtnRef = useRef(null)
  const previaFocusRef = useRef(null)
  const [closing, setClosing] = useState(false)

  const cerrarConAnimacion = () => {
    if (closing) return
    setClosing(true)
    setTimeout(() => { onClose?.() }, 150)
  }

  // Foco inicial al botón cerrar + restaurar foco al elemento previo al cerrar.
  useEffect(() => {
    previaFocusRef.current = document.activeElement
    const t = setTimeout(() => closeBtnRef.current?.focus(), 60)
    return () => {
      clearTimeout(t)
      const target = previaFocusRef.current
      if (target && typeof target.focus === 'function') {
        target.focus()
      }
    }
  }, [])

  // ESC cierra + focus trap dentro del overlay.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cerrarConAnimacion()
        return
      }
      if (e.key !== 'Tab') return
      const cont = overlayRef.current
      if (!cont) return
      const focusables = cont.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const headingId = `medalla-titulo-${medalla.id}`
  const fechaIso = typeof medalla.fechaLogro === 'function'
    ? medalla.fechaLogro(dataBadge)
    : null
  const fechaTxt = formatFechaLogro(fechaIso)

  return (
    <div
      ref={overlayRef}
      className={`${s.overlay} ${closing ? s.closing : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={cerrarConAnimacion}
    >
      <div
        className={`${s.card} ${tonoCls[medalla.tono] || s.tBase} ${closing ? s.closing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className={s.close}
          onClick={cerrarConAnimacion}
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div className={s.disc}>
          <MedalIcon tono={medalla.tono} />
        </div>

        <h2 id={headingId} className={s.titulo}>{medalla.titulo}</h2>
        <p className={s.desc}>{medalla.desc}</p>

        <hr className={s.sep} />

        <p className={s.frase}>«{medalla.frase}»</p>

        {fechaTxt && (
          <p className={s.fecha}>Desbloqueada · {fechaTxt}</p>
        )}
      </div>
    </div>
  )
}
