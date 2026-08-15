import React from 'react'
import { Plus } from 'lucide-react'
import styles from './botonRegistrar.module.css'

// Botón único del Home. Sin eyebrow, sin subtexto: el Home tiene UNA acción y
// se entiende sola. Reemplaza a CTAPrimary.
//
// `avisoCupo` es el chip discreto del plan free cuando quedan pocos momentos.
// Va DEBAJO del botón y solo aparece cuando aplica: nunca ocupa espacio si el
// usuario no está cerca del límite.
export function BotonRegistrar({ onClick, avisoCupo = null }) {
  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.boton} onClick={onClick}>
        <Plus size={20} strokeWidth={2.6} />
        Registrar un momento
      </button>
      {avisoCupo && <span className={styles.chip}>{avisoCupo}</span>}
    </div>
  )
}
