import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import PieCientifico from '../patron/PieCientifico'
import { marcoDelEpisodio } from '../../services/anthropic'
import styles from './OrientacionIA.module.css'

// `episodio` e `hijo` son opcionales y alimentan el pie (descargo + lente).
// Es el mismo pie de la pantalla post-guardado y de los patrones, así que un
// episodio viejo (anterior al 27 ago 2026, cuando el marco venía escrito por
// el modelo dentro del texto) cierra igual que uno nuevo: el lente se deriva
// en cliente con `marcoDelEpisodio`, nunca sale del texto.
export default function OrientacionIA({ orientacion, onClose, episodio = null, hijo = null }) {
  const { titulo, resumen } = orientacion
  const { autor, lente } = marcoDelEpisodio({ episodio, hijo })
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.h} aria-hidden="true"><Escarabajo className={styles.hIcon} /></span>
        <span className={styles.lbl}>Orientación de Huella</span>
        {onClose && (
          <button className={styles.close} onClick={onClose} aria-label="Cerrar orientación">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <h4 className={styles.ttl}>{titulo}</h4>
      <p className={styles.body}>{resumen}</p>
      <PieCientifico marco={`${autor} · ${lente}`} etiqueta="Lente" />
    </div>
  )
}
