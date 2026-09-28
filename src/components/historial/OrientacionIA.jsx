import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import OrientacionSecciones from '../registro/OrientacionSecciones'
import styles from './OrientacionIA.module.css'

// La orientación COMPLETA que se guardó al registrar (`orientacion.completa`),
// partida por sus secciones con el mismo componente y los mismos estilos de la
// pantalla del episodio recién registrado. Antes se mostraba solo la primera
// línea y 4 más, y quedaban fuera "Qué hacer ahora" y "Qué evitar". Una
// orientación vieja sin secciones se muestra entera como texto.
//
// `episodio` e `hijo` son opcionales y alimentan el pie (descargo + lente), que
// pone OrientacionSecciones: el lente se deriva en cliente con
// `marcoDelEpisodio`, nunca sale del texto.
export default function OrientacionIA({ orientacion, onClose, episodio = null, hijo = null }) {
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
      <OrientacionSecciones
        texto={orientacion.completa}
        episodio={episodio}
        hijo={hijo}
        className={styles.secciones}
      />
    </div>
  )
}
