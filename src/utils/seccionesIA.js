// Títulos de sección que la IA escribe como strings EXACTOS (sin markdown), cada
// uno en su propia línea — tanto en el análisis del Home (interpretarPatrones)
// como en la orientación del episodio (analizarEpisodio). El front los detecta
// para darles jerarquía visual (título de sección en Fraunces).
//
// Fuente única compartida entre AnalisisIA (Home) y RespuestaIA (resultado del
// episodio) para que las dos listas no se desincronicen. Los strings deben
// calzar EXACTO con los que produce src/services/anthropic.js.

export const SECTION_TITLES = new Set([
  'Alivio',
  'Lo que está mejorando',
  'Lo que merece atención',
  'Posibles causas',
  'Próximos pasos sugeridos',
  'Qué está pasando',
  'Qué hacer ahora',
  'Qué evitar',
])

// Normaliza una línea para comparar/mostrar como título: forma Unicode NFC,
// trim, y quita uno o más ":" finales (con su espacio previo). Conserva la
// capitalización original (el lowercase es solo para comparar, ver abajo).
function limpiarTitulo(linea) {
  return (linea || '').normalize('NFC').trim().replace(/:+$/, '').trim()
}

// Set de títulos normalizados a minúsculas, para comparación tolerante.
const TITULOS_NORM = new Set(
  [...SECTION_TITLES].map((s) => limpiarTitulo(s).toLowerCase())
)

// Detección TOLERANTE de título de sección: true si la línea, ignorando
// espacios, ":" finales, mayúsculas/minúsculas y forma Unicode, coincide con
// alguno de los SECTION_TITLES. Es la fuente de verdad de la detección.
export function esTituloSeccion(linea) {
  return TITULOS_NORM.has(limpiarTitulo(linea).toLowerCase())
}

// Devuelve el título "limpio" para mostrar (sin ":" final ni espacios sobrantes),
// conservando la capitalización original. Usar cuando esTituloSeccion dio true.
export function tituloSeccionLimpio(linea) {
  return limpiarTitulo(linea)
}

// Saca la sección "Alivio" del resto de la orientación.
//
// El alivio no se lee como las demás secciones: va primero, en una burbuja de
// Huella, mientras el resto queda plegado detrás de "Orientación completa". Por
// eso hay que partirlo en dos antes de renderizar.
//
// Si el modelo no escribió la sección —puede pasar— `alivio` viene vacío y el
// texto entero se devuelve como resto: la pantalla sigue funcionando igual, solo
// que sin burbuja de apertura.
export function separarAlivio(texto) {
  if (!texto) return { alivio: '', resto: '' }

  const lineas = texto.split('\n')
  const inicio = lineas.findIndex((l) => limpiarTitulo(l).toLowerCase() === 'alivio')
  if (inicio === -1) return { alivio: '', resto: texto }

  // El alivio termina donde empieza la próxima sección.
  let fin = lineas.length
  for (let i = inicio + 1; i < lineas.length; i++) {
    if (esTituloSeccion(lineas[i])) { fin = i; break }
  }

  return {
    alivio: lineas.slice(inicio + 1, fin).join('\n').trim(),
    resto: [...lineas.slice(0, inicio), ...lineas.slice(fin)].join('\n').trim(),
  }
}
