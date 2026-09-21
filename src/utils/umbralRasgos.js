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

import { diaChile } from './fechaChile.js'

const FAMILIAS_POSITIVAS = ['mueve', 'fortalezas', 'calma']

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
