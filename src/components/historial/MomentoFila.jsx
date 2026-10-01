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
//
// `horaAbajo` (cuentas en prueba): el tipo usa todo el ancho de la fila, en una
// sola línea, y la hora (o "Pasó ayer") baja a una línea chica debajo.
export default function MomentoFila({ momento, autor = '', onAbrir, horaAbajo = false }) {
  const relato = momento.descripcionLibre || momento.descripcion || ''
  const tono = emoTileClass(momento.tipo)
  const hora = (
    <span className={styles.hora}>
      {/* "Pasó ayer" reemplaza a la hora cuando pasó otro día. */}
      {momento.pasoEl || formatHora(momento.fecha)}
      {autor && <span className={styles.autor}> · {autor}</span>}
    </span>
  )
  if (horaAbajo) {
    return (
      <button type="button" id={`momento-${momento.id}`} className={styles.fila} onClick={onAbrir}>
        <span className={`${styles.cabeza} ${styles.cabezaAbajo}`}>
          <span className={`${styles.icono} ${styles[`icono_${tono}`] || ''}`} aria-hidden="true">{momento.emoji}</span>
          <span className={styles.textos}>
            <span className={`${styles.tipo} ${momento.tipo === 'pregunta' ? styles.tipoPregunta : styles.tipoUnaLinea}`}>{momento.titulo}</span>
            {hora}
          </span>
          <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
        </span>
        {relato && <span className={styles.relato}>{relato}</span>}
      </button>
    )
  }
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
        {hora}
        <ChevronRight size={16} className={styles.chevron} aria-hidden="true" />
      </span>
      {relato && <span className={styles.relato}>{relato}</span>}
    </button>
  )
}
