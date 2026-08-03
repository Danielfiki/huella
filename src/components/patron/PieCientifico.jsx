import React from 'react'
import styles from './PieCientifico.module.css'

// Descargo fijo: lo pone el componente, NUNCA la IA. En los episodios esta misma
// frase la escribe el modelo (va pedida en el prompt); acá la hardcodeamos para
// que no dependa de que el JSON la traiga.
const DESCARGO =
  'Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico.'

/**
 * Pie de las salidas de patrón: descargo + marco teórico.
 *
 * La línea del marco solo aparece si `marco` llegó con contenido — los patrones
 * guardados antes de que existiera el campo no lo tienen, y ahí el bloque queda
 * con una sola línea en vez de mostrar "undefined".
 *
 * `sinDescargo` es para las salidas 'derivar': ahí el cierre médico ya dice
 * "Huella no diagnostica", y repetirlo una línea más abajo le resta peso al
 * momento más serio de la app. El marco sí se mantiene.
 *
 * Si no queda ninguna línea que mostrar, no renderiza nada — ni el div ni el
 * separador, para no dejar un borde suelto sin contenido.
 *
 * @param {Object} props
 * @param {string} [props.marco] - Valor de `orientacion_ia.marco_aplicado`.
 * @param {boolean} [props.sinDescargo=false] - Oculta la línea del descargo.
 */
export default function PieCientifico({ marco, sinDescargo = false }) {
  const marcoLimpio = typeof marco === 'string' ? marco.trim() : ''

  if (sinDescargo && !marcoLimpio) return null

  return (
    <div className={styles.pie}>
      {!sinDescargo && <p className={styles.linea}>{DESCARGO}</p>}
      {marcoLimpio && <p className={styles.linea}>Marco aplicado: {marcoLimpio}</p>}
    </div>
  )
}
