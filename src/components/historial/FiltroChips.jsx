import React, { useRef, useEffect } from 'react'
import styles from './FiltroChips.module.css'

const TIPOS = [
  // 'todos' lista episodios + hitos agrupados por día (los patrones NO entran
  // aquí: no tienen fecha de ocurrencia, son un estado continuo). El label es
  // "Momentos" porque es exacto y ya es la palabra de la app (encabezado
  // "12 MOMENTOS", CTA "Registrar un momento").
  { key: 'todos', label: 'Momentos' },
  { key: 'dificiles', label: 'Difíciles' },
  { key: 'logros', label: 'Avances' },
  // B3 · reemplaza al álbum, que era una tab aparte dentro de Logros. Las
  // fotos no se movieron a ninguna galería nueva: siempre estuvieron en la
  // línea de tiempo, dentro de la tarjeta de su momento. Esto solo deja
  // verlas juntas.
  { key: 'fotos', label: 'Con foto' },
  { key: 'patrones', label: 'Acompañas' },
]

// Margen que se deja respirando al chip cuando hay que traerlo a la vista.
// Es el mismo padding lateral de la barra, para que no quede pegado al borde.
const AIRE = 20

export default function FiltroChips({ active, onChange, counts = {}, hijo, rango = '14 días' }) {
  const barraRef = useRef(null)
  const activoRef = useRef(null)

  // Trae el chip activo a la vista si quedó fuera.
  //
  // La barra scrollea en horizontal y tiene 7 chips: "Acompañas" es el quinto,
  // así que en un celular queda FUERA DE PANTALLA. Quien llega derivado desde
  // el tope de 3 patrones caía en una lista filtrada sin ver por cuál filtro,
  // que se lee como si la app hubiera perdido registros.
  //
  // Se mueve `scrollLeft` a mano en vez de usar `scrollIntoView`: ese método
  // también corrige el eje vertical, y como la barra es `sticky` terminaba
  // moviendo la página entera. Acá solo se toca el horizontal, y solo si hace
  // falta.
  useEffect(() => {
    const barra = barraRef.current
    const chip = activoRef.current
    if (!barra || !chip) return
    const izq = chip.offsetLeft
    const der = izq + chip.offsetWidth
    if (der > barra.scrollLeft + barra.clientWidth) {
      barra.scrollLeft = der - barra.clientWidth + AIRE
    } else if (izq < barra.scrollLeft) {
      barra.scrollLeft = Math.max(0, izq - AIRE)
    }
  }, [active])

  return (
    <nav className={styles.bar} aria-label="Filtros del historial" ref={barraRef}>
      {TIPOS.map((t) => (
        <button
          key={t.key}
          ref={active === t.key ? activoRef : undefined}
          className={`${styles.chip} ${active === t.key ? styles.on : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {typeof counts[t.key] === 'number' ? ` · ${counts[t.key]}` : ''}
        </button>
      ))}
      {hijo && (
        <span className={`${styles.chip} ${styles.context}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="3" />
            <path d="M9 12v6" />
          </svg>
          {hijo}
        </span>
      )}
      <span className={`${styles.chip} ${styles.context}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
        </svg>
        {rango}
      </span>
    </nav>
  )
}
