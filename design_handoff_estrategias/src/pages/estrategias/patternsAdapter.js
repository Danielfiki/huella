// patternsAdapter.js
// Capa de traducción entre el output actual de `interpretarPatrones` (services/anthropic.js)
// y el shape que la UI de Puerta 1 necesita: { habilidad_sugerida, episodios_detonantes, narrativa, fingerprint }.
//
// Cuando se mejore el detector real, sólo hay que cambiar esta capa — la UI no se toca.
//
// Contrato actual asumido (verificar contra services/anthropic.js):
//   interpretarPatrones({ episodios, hijo }) =>
//     Promise<{ patrones: Array<{ tipo, conteo, episodios_ids, descripcion }> }>
//
// Contrato que necesita la UI:
//   { id, habilidad: { id, nombre, grupo },
//     episodios_detonantes: Array<{ id, titulo, fecha, intensidad, emoji, categoria }>,
//     narrativa: { titulo, bajada },
//     fingerprint: string }

import { interpretarPatrones } from '../../services/anthropic';
import { episodiosFingerprint, HABILIDADES_CATALOGO } from './helpers';

const MAPA_TIPO_A_HABILIDAD = {
  rabieta: { grupo: 'regulacion', id: 'berrinches' },
  frustracion: { grupo: 'regulacion', id: 'frustracion' },
  miedo: { grupo: 'regulacion', id: 'miedos' },
  tristeza: { grupo: 'regulacion', id: 'tristeza' },
  ansiedad: { grupo: 'regulacion', id: 'ansiedad' },
  transicion: { grupo: 'desarrollo', id: 'limites' },
  sueno: { grupo: 'desarrollo', id: 'sueno' },
  alimentacion: { grupo: 'desarrollo', id: 'alimentacion' },
  social: { grupo: 'desarrollo', id: 'socializar' },
};

function habilidadDe(tipo) {
  const ref = MAPA_TIPO_A_HABILIDAD[tipo];
  if (!ref) return null;
  const grupo = HABILIDADES_CATALOGO[ref.grupo];
  const item = grupo.items.find((i) => i.id === ref.id);
  return item ? { ...item, grupo: ref.grupo, grupoNombre: grupo.nombre } : null;
}

function hidratarEpisodios(ids, episodiosState) {
  return ids
    .map((id) => episodiosState.find((e) => e.id === id))
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Devuelve hasta 2 sugerencias listas para renderizar en Puerta 1.
 * Filtra patrones cuya habilidad ya está en plan activo o ya fue rechazada con
 * el mismo fingerprint en los últimos 14 días (el filtro de descarte se aplica
 * fuera, en el hook useSugerencias).
 */
export async function obtenerSugerencias({ hijo, episodios, planActivo }) {
  if (!hijo || !episodios?.length) return [];

  const { patrones } = await interpretarPatrones({ episodios, hijo });
  if (!Array.isArray(patrones)) return [];

  const sugerencias = patrones
    .map((p, idx) => {
      const habilidad = habilidadDe(p.tipo);
      if (!habilidad) return null;
      if (planActivo?.habilidad_id === habilidad.id) return null;

      const epsHidratados = hidratarEpisodios(p.episodios_ids || [], episodios);
      if (epsHidratados.length < 2) return null;

      return {
        id: `sug-${hijo.id}-${habilidad.id}-${idx}`,
        habilidad,
        episodios_detonantes: epsHidratados,
        narrativa: {
          titulo: `Notamos ${p.conteo} momentos de ${habilidad.label.toLowerCase()} en estas semanas.`,
          bajada: p.descripcion || `Trabajar ${habilidad.label.toLowerCase()} podría ayudar este mes.`,
        },
        fingerprint: episodiosFingerprint(epsHidratados),
      };
    })
    .filter(Boolean)
    .slice(0, 2);

  return sugerencias;
}
