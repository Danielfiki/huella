// Títulos de sección que la IA escribe como strings EXACTOS (sin markdown), cada
// uno en su propia línea — tanto en el análisis del Home (interpretarPatrones)
// como en la orientación del episodio (analizarEpisodio). El front los detecta
// para darles jerarquía visual (título de sección en Fraunces).
//
// Fuente única compartida entre AnalisisIA (Home) y RespuestaIA (resultado del
// episodio) para que las dos listas no se desincronicen. Los strings deben
// calzar EXACTO con los que produce src/services/anthropic.js.

export const SECTION_TITLES = new Set([
  'Lo que está mejorando',
  'Lo que merece atención',
  'Posibles causas',
  'Próximos pasos sugeridos',
  'Qué está pasando',
  'Qué hacer ahora',
  'Qué evitar',
])
