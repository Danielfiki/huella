// helpers.js — Estrategias
// Catálogo de habilidades (11 habilidades · 2 grupos · lenguaje situacional)
// + utilidades varias

export const MAX_PLANES_ACTIVOS_FREE = 3;

export const HABILIDADES_CATALOGO = {
  emocional: {
    nombre: 'Regulación emocional',
    items: [
      { id: 'calmarse_explosion',    label: 'Calmarse cuando explota',               emoji: '🌊', tags: ['regulacion_emocional', 'enojo', 'berrinches'] },
      { id: 'aceptar_no',            label: 'Aceptar el "no" sin crisis',             emoji: '💪', tags: ['regulacion_emocional', 'berrinches', 'frustracion'] },
      { id: 'manejar_cambios',       label: 'Manejar los cambios de rutina',          emoji: '🔄', tags: ['regulacion_emocional', 'frustracion'] },
      { id: 'relacionarse_ninos',    label: 'Relacionarse mejor con otros niños',     emoji: '🤝' },
      { id: 'manejar_miedo',         label: 'Manejar el miedo y la angustia',         emoji: '🛡️' },
      { id: 'concentrarse_calmarse', label: 'Concentrarse y calmarse',               emoji: '🧘' },
    ],
  },
  desarrollo: {
    nombre: 'Desarrollo y aprendizaje',
    items: [
      { id: 'mejorar_atencion',        label: 'Mejorar la atención y concentración',   emoji: '🎯' },
      { id: 'autonomia_independencia', label: 'Desarrollar autonomía e independencia', emoji: '🌱' },
      { id: 'rutinas_funcionen',       label: 'Establecer rutinas que funcionen',      emoji: '📅' },
      { id: 'motivacion_autoestima',   label: 'Motivación y autoestima',               emoji: '🌟' },
      { id: 'dificultades_colegio',    label: 'Dificultades en el colegio',            emoji: '🏫' },
    ],
  },
};

// Frases clínicas por habilidad — se muestran en la pantalla de confirmación del plan
export const CONTEXTOS_HABILIDAD = {
  calmarse_explosion:    'La autorregulación emocional es la base de todas las demás habilidades sociales y relacionales.',
  aceptar_no:            'Tolerar la frustración construye resiliencia duradera. Es una de las habilidades más valiosas en la vida adulta.',
  manejar_cambios:       'La flexibilidad ante los cambios reduce el estrés y mejora la adaptación en todo contexto.',
  relacionarse_ninos:    'Las conexiones positivas tempranas son el mayor predictor de bienestar emocional adulto.',
  manejar_miedo:         'Aprender a regular el miedo desde pequeño protege la salud mental a largo plazo.',
  concentrarse_calmarse: 'La calma y el foco son habilidades entrenables con práctica constante, no rasgos fijos.',
  mejorar_atencion:      'La atención sostenida se entrena como un músculo — pequeños ejercicios diarios generan cambios duraderos.',
  autonomia_independencia: 'Cada pequeño paso que hace solo construye confianza en sí mismo y en el mundo.',
  rutinas_funcionen:     'Las rutinas predecibles reducen la ansiedad y liberan energía mental para aprender y crecer.',
  motivacion_autoestima: 'Un niño que se siente capaz intenta cosas nuevas. La autoestima se construye en los pequeños logros de cada día.',
  dificultades_colegio:  'El colegio es un entorno exigente. Con las estrategias correctas, los desafíos se vuelven oportunidades de crecer.',
};

// Lookup helper — devuelve { id, label, emoji, grupo, grupoNombre } o null
export function findHabilidad(id) {
  for (const [grupo, g] of Object.entries(HABILIDADES_CATALOGO)) {
    const it = g.items.find((x) => x.id === id);
    if (it) return { ...it, grupo, grupoNombre: g.nombre };
  }
  return null;
}

// Tono de pill según categoría del episodio (5 tonos del sistema)
export function pillClassFor(categoria) {
  const map = {
    emocional: 'pillEmo',
    rutina: 'pillRut',
    vinculo: 'pillVin',
    juego: 'pillJue',
    salud: 'pillSal',
  };
  return map[categoria] || 'pillRut';
}

// Estado del plan (sin "pausado" — esa lógica vendrá en iteración futura)
export function estadoPlan(p) {
  if (p.completado_at) return 'completado';
  if (p.abandonado_at) return 'abandonado';
  return 'activo';
}

export function mesCortoDe(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
}

// Markdown muy simple. Si ya tienes utils/renderMarkdown úsalo.
export function md(t) {
  if (!t) return '';
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

// ─────────────────────────────────────────────────────────────────────
// Adaptador IA → SugerenciaIACard
//
// Fuente: detectarPatronesEstructurado() en src/services/anthropic.js
// Contrato esperado del detector:
//   { patrones: [{ tipo, descripcion, bajada, episodios_ids, confianza }] }
//   donde tipo ∈ ids del catálogo (berrinches, sueno, limites, etc.)
// ─────────────────────────────────────────────────────────────────────
export function buildSugerenciaFromInterpretacion(interpretacion, episodios) {
  if (!interpretacion || !Array.isArray(interpretacion.patrones) || interpretacion.patrones.length === 0) {
    return null;
  }
  const patron = interpretacion.patrones[0];
  const hab = findHabilidad(patron.tipo);
  if (!hab) return null;

  const detonantes = (patron.episodios_ids || [])
    .slice(0, 3)
    .map((id) => episodios.find((e) => e.id === id))
    .filter(Boolean)
    .map((e) => ({
      id: e.id,
      titulo: e.descripcionLibre?.slice(0, 40) || e.tipo || 'Momento',
      emoji: e.emoji || '·',
      fecha_label: relativoCorto(e.fecha),
      intensidad: e.intensidad || 3,
      categoria: e.categoria || 'rutina',
    }));

  if (detonantes.length === 0) return null;

  return {
    fingerprint: `${hab.id}-${detonantes.map((d) => d.id).sort().join('-')}`,
    habilidad_id: hab.id,
    habilidad_nombre: hab.label,
    habilidad_grupo: hab.grupo,
    narrativa: {
      titulo: `Notamos que ${patron.descripcion || 'hay un patrón'}.`,
      bajada: patron.bajada || `Trabajar ${hab.label.toLowerCase()} podría ayudar.`,
    },
    episodios_detonantes: detonantes,
    confianza: typeof patron.confianza === 'number' ? patron.confianza : 0.6,
  };
}

function relativoCorto(iso) {
  if (!iso) return '';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias}d`;
  return `hace ${Math.floor(dias / 7)}sem`;
}

// ─────────────────────────────────────────────────────────────────────
// Lógica de descarte de sugerencia IA
// Regla: no mostrar sugerencia hasta que pasen ≥7 días desde el último
// rechazo O el usuario registre ≥5 episodios nuevos desde ese rechazo.
// ─────────────────────────────────────────────────────────────────────
export function debeMostrarSugerencia(sugerencia, descartes, totalEpisodios = 0) {
  if (!sugerencia) return false;
  if (!descartes.length) return true;
  const ultimoRechazo = descartes.reduce((latest, d) =>
    !latest || new Date(d.descartada_at) > new Date(latest.descartada_at) ? d : latest, null);
  if (!ultimoRechazo) return true;
  const dias = (Date.now() - new Date(ultimoRechazo.descartada_at).getTime()) / 86400000;
  if (dias >= 7) return true;
  const epCountAtReject = ultimoRechazo.episodios_count_al_rechazar ?? 0;
  if (totalEpisodios - epCountAtReject >= 5) return true;
  return false;
}
