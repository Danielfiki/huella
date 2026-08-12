import React from 'react'
import { AUTORES, MAPA_DIMENSIONES } from '../../services/anthropic'
import Escarabajo from '../ui/Escarabajo'
import styles from './AccionRapida.module.css'

// AccionRapida — visible siempre en la EpisodioCard (no detrás de botón).
// Recibe el objeto persistido en columnas `accion_rapida_*` del episodio,
// más una flag `regenerando` cuando la cola está actualizando esta card
// en background tras detectar cambio de bucket de tiempo.
// `label` existe porque en la pantalla de guardado esto se lee como el paso que
// viene ("Para la próxima"), mientras que en el historial sigue siendo la acción
// rápida de una card. El default deja el historial intacto.
export default function AccionRapida({ data, regenerando = false, label = 'Acción rápida', tono = 'primary' }) {
  // Si no hay texto persistido y tampoco estamos regenerando, nada que mostrar.
  // El estado "regenerando sin data" puede ocurrir en episodios viejos creados
  // antes del rediseño v1.2: la cola los procesa y queremos mostrar placeholder.
  const tieneTexto = !!data?.texto
  if (!tieneTexto && !regenerando) return null

  const lente = data ? obtenerLente(data) : ''

  return (
    <div className={`${styles.panel} ${tono === 'verde' ? styles.panelVerde : ''}`}>
      <div className={styles.head}>
        <span className={styles.h} aria-hidden="true"><Escarabajo className={styles.hIcon} /></span>
        <span className={styles.lbl}>{label}</span>
        {regenerando && (
          <span className={styles.regenerando} aria-live="polite">
            {tieneTexto ? 'Actualizando…' : 'Preparando…'}
          </span>
        )}
      </div>

      {tieneTexto ? (
        <p className={styles.texto}>{data.texto}</p>
      ) : (
        <p className={styles.textoPlaceholder}>Preparando una orientación calibrada al tiempo transcurrido…</p>
      )}

      {tieneTexto && data.autor && (
        <p className={styles.firma}>
          — <span className={styles.firmaAutor}>{data.autor}</span>
          {lente && (
            <>
              <span className={styles.firmaSep}> · </span>
              <span className={styles.firmaLente}>{lente}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

// Resuelve la lente para la firma. Prioridad:
//   1. AUTORES[autor].lente — siempre que el autor esté en el banco.
//   2. MAPA_DIMENSIONES[dimension].lente — si la dimensión vino persistida.
//   3. Reformatea la dimensión a texto humano como último recurso.
function obtenerLente(data) {
  if (data.autor && AUTORES[data.autor]?.lente) return AUTORES[data.autor].lente
  if (data.dimension && MAPA_DIMENSIONES[data.dimension]?.lente) return MAPA_DIMENSIONES[data.dimension].lente
  if (data.dimension) {
    return data.dimension
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
  }
  return ''
}
