// Umbral para que un rasgo pase de emergente a candidato — fuente unica.
//
// Lo usan los tres lugares que deciden ese paso: la clasificacion del motor
// (detectarRasgos en anthropic.js) y las dos fusiones de evidencia de
// guardarRasgosDetectados (refuerzo y mismo titulo, en HuellaContext.jsx).
// Antes cada uno tenia su `>= 3` escrito a mano.
//
// La regla cambia por familia. El 16 sep La brava tenia 30 fortalezas contra
// 28 cuesta, pero lo positivo no llegaba a candidato: los papas registran
// mas momentos dificiles que avances, asi que las familias positivas casi
// nunca juntaban 3. Para ellas bastan 2 momentos, siempre que sean de dias
// distintos (dos avances de la misma tarde son una sola observacion).
// `cuesta` sigue pidiendo 3.

const FAMILIAS_POSITIVAS = ['mueve', 'fortalezas', 'calma']

// Dia calendario en Chile ('2026-09-21'). Con Intl y no restando horas a
// mano, por el cambio de huso: mismo criterio que api/push-remind.js. En UTC
// un momento de las 22:30 caeria en el dia siguiente.
const formatoDiaChile = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function diaChile(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return formatoDiaChile.format(d)
}

export function esFamiliaPositiva(familia) {
  return FAMILIAS_POSITIVAS.includes(familia)
}

// `evidencia` acepta las dos formas guardadas en rasgos.evidencia: la nueva
// { tipo, id, fecha } y la vieja { episodio_id, fecha }. Solo se lee `fecha`.
// Un item sin fecha valida cuenta para `cuesta` pero no suma dia distinto.
export function cumpleUmbral(familia, evidencia) {
  const items = Array.isArray(evidencia) ? evidencia : []
  if (!esFamiliaPositiva(familia)) return items.length >= 3
  const dias = new Set(items.map((ev) => diaChile(ev?.fecha)).filter(Boolean))
  return dias.size >= 2
}
