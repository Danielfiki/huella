import React from 'react'
import styles from './PieCientifico.module.css'

// Descargo fijo: lo pone el componente, NUNCA la IA. En los episodios esta misma
// frase la escribe el modelo (va pedida en el prompt); acá la hardcodeamos para
// que no dependa de que el JSON la traiga.
// Versión corta. La larga ("Esta orientación se basa en evidencia del desarrollo
// infantil y no constituye un diagnóstico clínico") decía lo mismo en el doble de
// palabras. Esta es EXACTAMENTE la que ya usa el pie de la orientación del
// post-guardado: además de más corta, deja de haber dos redacciones del mismo
// descargo en la misma app.
const DESCARGO =
  'Esto se apoya en evidencia del desarrollo infantil. No es un diagnóstico.'

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

  // Todo en UNA línea, descargo y marco juntos. Son la misma cosa —de dónde
  // sale esto— y separarlos en dos párrafos le daba a la nota al pie el peso de
  // un bloque de contenido. Medido: 42px contra los 63px de antes, y hasta con
  // un marco de dos autores (el caso más largo posible) queda en 59.
  return (
    <div className={styles.pie}>
      <p className={styles.linea}>
        {!sinDescargo && DESCARGO}
        {!sinDescargo && marcoLimpio && ' '}
        {marcoLimpio && `Marco: ${marcoLimpio}`}
      </p>
    </div>
  )
}
