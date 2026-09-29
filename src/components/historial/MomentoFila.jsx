import React from 'react'
import { ChevronRight } from 'lucide-react'
import { emoTileClass } from './helpers'
import styles from './MomentoFila.module.css'

function formatHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

// Tarjeta cerrada de Momentos (rediseño): toda la tarjeta abre el momento.
// Ícono + tipo (entero, puede bajar a dos líneas) + hora, y abajo el relato del
// papá en dos líneas. Lo demás vive en el momento abierto. `autor` llega solo
// cuando lo registró el otro adulto.
export default function MomentoFila({ momento, autor = '', onAbrir }) {
  const relato = momento.descripcionLibre || momento.descripcion || ''
  const tono = emoTileClass(momento.tipo)
  return (
    <button
      type="button"
      id={`momento-${momento.id}`}
      className={styles.fila}
      onClick={onAbrir}
    >
      <span className={styles.cabeza}>
        <span className={`${styles.icono} ${styles[`icono_${tono}`] || ''}`} aria-hidden="true">{momento.emoji}</span>
        <span className={`${styles.tipo} ${momento.tipo === 'pregunta' ? styles.tipoPregunta : ''}`}>{momento.titulo}</span>
        <span className={styles.hora}>
          {formatHora(momento.fecha)}
          {autor && <span className={styles.autor}> · {autor}</span>}
        </span>
        <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
      </span>
      {relato && <span className={styles.relato}>{relato}</span>}
    </button>
  )
}
