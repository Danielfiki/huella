import React, { useState, useEffect, useRef } from 'react'
import styles from './TooltipAyuda.module.css'

export default function TooltipAyuda({ texto }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  return (
    <span className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setAbierto((v) => !v)} type="button" aria-label="Ayuda">
        ?
      </button>
      {abierto && (
        <div className={styles.burbuja}>
          <div className={styles.flecha} />
          {texto}
        </div>
      )}
    </span>
  )
}
