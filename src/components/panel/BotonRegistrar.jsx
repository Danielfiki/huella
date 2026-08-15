import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import styles from './botonRegistrar.module.css'

// Botón único del Home — "la pastilla". Sin eyebrow, sin subtexto: el Home
// tiene UNA acción y se entiende sola.
//
// El símbolo es el escarabajo, no un "+": el mismo SVG mono que ya usan los
// badges, el registro y el análisis (fill="currentColor", así que se recolorea
// desde CSS). Aparece dos veces y con dos funciones distintas — nítido dentro
// del disco crema, y gigante al 10% como marca de agua detrás del label.
//
// `avisoCupo` es el chip discreto del plan free cuando quedan pocos momentos.
// Va DEBAJO del botón y solo aparece cuando aplica: nunca ocupa espacio si el
// usuario no está cerca del límite.
export function BotonRegistrar({ onClick, avisoCupo = null }) {
  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.boton} onClick={onClick}>
        {/* Decorativos: el nombre accesible del botón lo da solo el label.
            Sin aria-hidden, el Escarabajo aporta su propio aria-label="Huella"
            y el botón se anunciaría como "Huella Registrar un momento Huella". */}
        <span className={styles.marca} aria-hidden="true">
          <Escarabajo className={styles.marcaIcon} />
        </span>
        <span className={styles.label}>Registrar un momento</span>
        <span className={styles.disco} aria-hidden="true">
          <Escarabajo className={styles.discoIcon} />
        </span>
      </button>
      {avisoCupo && <span className={styles.chip}>{avisoCupo}</span>}
    </div>
  )
}
