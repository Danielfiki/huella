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

// ── Paso 8 — la zona del cerebro que la IA marca al final de la orientación ──
//
// La orientación es texto plano, no JSON (a diferencia de la Acción Rápida).
// Para no romper ese contrato, la zona viaja como una línea marcada al final
// del texto, y esta función la separa: devuelve el texto YA LIMPIO y el slug
// aparte, para que la zona se guarde en su propia columna y el texto que se
// persiste no lleve nunca el marcador.
//
// Que el texto salga limpio de acá no es cosmética: `orientacion_ia` se
// imprime crudo en el informe PDF (`InformePDF.jsx`). Si el marcador viajara
// dentro del texto, saldría impreso en el informe del hijo.
//
// El marcador NO usa ninguno de los caracteres que el prompt prohíbe (#, *,
// _, -) — por eso "Zona del cerebro:" y no "ZONA_CEREBRO:".
const MARCADOR_ZONA = 'zona del cerebro'

// Los seis slugs de ZONAS en contenidoCerebro.js. Se repiten acá en vez de
// importarlos para que este util siga sin dependencias: lo usan el servicio de
// IA y el front, y contenidoCerebro.js arrastra el copy entero del cerebro.
// Si alguna vez se agrega una zona, hay que tocar las dos listas.
const ZONAS_VALIDAS = new Set([
  'amigdala', 'frontal', 'hipocampo', 'cerebelo', 'tronco', 'corteza',
])

// Normaliza el slug que escribió la IA: minúsculas, sin tildes y sin espacios.
// La IA puede escribir "amígdala" con tilde aunque el prompt pida el slug.
function normalizarSlug(valor) {
  return (valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

export function separarZona(texto) {
  if (!texto) return { texto: '', zona: null }

  const lineas = texto.split('\n')
  let zona = null
  const limpias = []

  for (const linea of lineas) {
    // Se busca en CUALQUIER línea, no solo en la última: si el modelo pone el
    // marcador antes de "Qué evitar" el texto igual queda limpio. Es la misma
    // defensa que ya tiene `esTituloSeccion`, tolerante en vez de exacta.
    const norm = linea.normalize('NFC').trim().toLowerCase()
    if (norm.startsWith(MARCADOR_ZONA)) {
      // Solo se queda con el PRIMER marcador válido; los demás se descartan
      // igual (la línea nunca vuelve al texto).
      if (!zona) {
        const slug = normalizarSlug(linea.slice(linea.indexOf(':') + 1))
        if (ZONAS_VALIDAS.has(slug)) zona = slug
      }
      continue
    }
    limpias.push(linea)
  }

  return { texto: limpias.join('\n').trim(), zona }
}
