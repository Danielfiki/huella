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
