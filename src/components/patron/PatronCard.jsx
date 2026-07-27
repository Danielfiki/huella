import React from 'react'
import styles from './PatronCard.module.css'

// Granularidad del "anotado hace…": días hasta el día 13, semanas del 14 al 59,
// meses desde el 60. El día 0 se muestra como "HOY" (decisión de copy, no había
// forma natural de decir "hace 0 días").
function tiempoDesde(iso) {
  if (!iso) return ''
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'ANOTADO HOY'
  if (dias <= 13) return `ANOTADO HACE ${dias} ${dias === 1 ? 'DÍA' : 'DÍAS'}`
  if (dias <= 59) {
    const s = Math.floor(dias / 7)
    return `ANOTADO HACE ${s} ${s === 1 ? 'SEMANA' : 'SEMANAS'}`
  }
  const m = Math.floor(dias / 30)
  return `ANOTADO HACE ${m} ${m === 1 ? 'MES' : 'MESES'}`
}

// Tarjeta única de patrón. La comparten Home (un solo patrón abierto) e Historial
// (abiertos y cerrados). Los cerrados van atenuados y su meta dice "CERRADO".
// PROHIBIDO mostrar la clasificación (esperable/instalado/derivar): existe en los
// datos pero jamás a la vista — sería colgarle un diagnóstico al niño.
export default function PatronCard({ patron, onClick, authorName }) {
  const cerrado = patron.estado === 'cerrado'
  const conPlan = !!patron.estrategia_id
  const meta = cerrado ? 'CERRADO' : tiempoDesde(patron.created_at)

  return (
    <button
      type="button"
      className={`${styles.card} ${cerrado ? styles.cerrado : ''}`}
      onClick={onClick}
    >
      <div className={styles.texto}>
        <p className={styles.desc}>{patron.descripcion}</p>
        <div className={styles.metaRow}>
          <span className={styles.meta}>{meta}</span>
          {/* Quién lo anotó: misma fuente y formato que episodios/avances
              (getAuthorDisplay en el caller). '' cuando es usuario solo. */}
          {authorName && <span className={styles.meta}>· {authorName}</span>}
          {conPlan && <span className={styles.chipPlan}>Con plan</span>}
        </div>
      </div>
      <span className={styles.chevron}>›</span>
    </button>
  )
}
