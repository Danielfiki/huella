import React from 'react'

// Glifo SVG de una medalla segun su tono. Vivia dentro de HitosPage.jsx; se
// extrajo en B3 al mudarse las medallas a Perfil. No usa CSS module: hereda el
// color del contenedor via currentColor, igual que antes.
export default function MedalIcon({ tono, abierta }) {
  if (!abierta) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" />
      </svg>
    )
  }
  switch (tono) {
    case 'estrella':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.5L22 10l-5.4 4.7L18 22l-6-3.6L6 22l1.4-7.3L2 10l7.1-1.5L12 2z" />
        </svg>
      )
    case 'celebracion':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7-4.8-9.3-9C0.8 7.6 4 4 8 5.5c1.6.6 3 1.9 4 3.4 1-1.5 2.4-2.8 4-3.4 4-1.5 7.2 2.1 5.3 6.5C19 16.2 12 21 12 21z" />
        </svg>
      )
    case 'calma':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-3 4.5-6 8-6 11.5A6 6 0 0 0 12 21a6 6 0 0 0 6-6.5C18 11 15 7.5 12 3z" />
        </svg>
      )
    case 'constancia':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      )
    case 'base':
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}
