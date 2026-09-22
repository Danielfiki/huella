// Genero del hijo/a — fuente unica.
//
// El dato vive en `hijos.genero` y guarda uno de tres codigos: 'm', 'f' o
// 'nb'. Tambien puede venir vacio (null o ''), porque el paso del genero en el
// onboarding y en el perfil es opcional: hay que tratar ese caso siempre.
//
// Hasta ahora este mapeo vivia inline dentro de `anthropic.js`, donde arma el
// prompt clinico, y era el unico lugar del repo que lo tenia. Al necesitarlo
// tambien la card de propuesta de rasgo se extrajo aca, para no terminar con
// la misma tabla repetida en dos —y despues en tres— archivos.
//
// Los cuatro juegos de palabras son EXACTAMENTE los que ya usaba `anthropic.js`:
// esto es una mudanza, no un cambio de comportamiento.

const PALABRAS = {
  f:  { sustantivo: 'niña',   pronombre: 'ella',    articulo: 'la'    },
  m:  { sustantivo: 'niño',   pronombre: 'él',      articulo: 'lo'    },
  nb: { sustantivo: 'niñe',   pronombre: 'elle',    articulo: 'le'    },
}

// Sin genero guardado se usa la forma doble, que es lo que el prompt ya hacia.
const NEUTRO = { sustantivo: 'niño/a', pronombre: 'él/ella', articulo: 'lo/la' }

/**
 * Palabras con genero para un hijo/a.
 *
 * @param   {Object|null} hijo  Hijo en shape de app; se lee `hijo.genero`.
 * @returns {{ codigo: string|null, sustantivo: string, pronombre: string, articulo: string }}
 *          `codigo` es 'm' | 'f' | 'nb', o null si no hay genero guardado.
 */
export function palabrasGenero(hijo) {
  const codigo = hijo?.genero
  const palabras = PALABRAS[codigo]
  return palabras
    ? { codigo, ...palabras }
    : { codigo: null, ...NEUTRO }
}

// Linea de genero para los prompts de la IA. Va en TODO prompt que reciba
// datos del hijo: sin ella el modelo deducia el genero desde el nombre, y con
// un nombre como "La brava" le hablaba en femenino a un niño.
const DICE = {
  f:  'es una niña',
  m:  'es un niño',
  nb: 'es niñe (no binario)',
}

/**
 * Instruccion de genero lista para pegar en un prompt.
 *
 * @param   {Object|null} hijo  Hijo en shape de app; se leen `nombre` y `genero`.
 * @returns {string}
 */
export function instruccionGenero(hijo) {
  const nombre = (hijo?.nombre || '').trim()
  const dice = DICE[hijo?.genero]
  if (!dice) {
    return `${nombre ? `No sabemos el género de ${nombre}` : 'No sabemos su género'}. No lo deduzcas del nombre: usa formas dobles (niño/a) o frases que no marquen género.`
  }
  const sujeto = nombre ? `${nombre} ${dice}` : dice.charAt(0).toUpperCase() + dice.slice(1)
  return `${sujeto}. Usa siempre ese género para pronombres y adjetivos, aunque el nombre parezca de otro género.`
}
