import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiag } from './diagnostico'
import styles from './DiagnosticoBienvenida.module.css'

// TEMPORAL: panel de diagnostico de la bienvenida (solo la cuenta de Daniel).
// Se ve mientras la bienvenida esta montada y 15 s despues. No recibe toques.
const DESPUES = 15000

export default function DiagnosticoBienvenida({ activa }) {
  const lineas = useDiag()
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (activa) { setVisible(true); return }
    const t = setTimeout(() => setVisible(false), DESPUES)
    return () => clearTimeout(t)
  }, [activa])
  if (!visible) return null
  return createPortal(
    <div className={styles.panel} aria-hidden="true">
      {lineas.map((l, i) => <div key={i}>{l}</div>)}
    </div>,
    document.body
  )
}
