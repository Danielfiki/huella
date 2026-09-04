import React from 'react'
import styles from './PieCientifico.module.css'

// Descargo fijo: lo pone el componente, NUNCA la IA. En los episodios tampoco
// la escribe el modelo: el prompt de analizarEpisodio la PROHÍBE desde el 27
// ago 2026 y OrientacionSecciones filtra cualquier resto por inercia. Este
// mismo componente es el pie de las dos salidas (patrones y episodios), así
// que el descargo y el formato del marco viven en un solo lugar.
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
 * `etiqueta` es la palabra que precede al marco. En patrones es "Marco" (el
 * modelo nombra al autor cuyo enfoque guió esa orientación, regla dura del
 * prompt). En episodios es "Lente": ahí el marco se deriva en cliente
 * (`marcoDelEpisodio`) y es el lente con que Huella miró el episodio, no el
 * autor que escribió el texto. Misma línea, mismo estilo, palabra honesta.
 *
 * @param {Object} props
 * @param {string} [props.marco] - Valor de `orientacion_ia.marco_aplicado`, o el "Autor · Lente" derivado.
 * @param {boolean} [props.sinDescargo=false] - Oculta la línea del descargo.
 * @param {string} [props.etiqueta='Marco'] - Palabra que precede al marco.
 */
export default function PieCientifico({ marco, sinDescargo = false, etiqueta = 'Marco' }) {
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
        {marcoLimpio && `${etiqueta}: ${marcoLimpio}`}
      </p>
    </div>
  )
}
