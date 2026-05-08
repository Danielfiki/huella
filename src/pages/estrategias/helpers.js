// helpers.js — Estrategias
// Catálogo de habilidades (mockup aprobado: 11 habilidades · 2 grupos)
// + utilidades varias

export const HABILIDADES_CATALOGO = {
  emocional: {
    nombre: 'Regulación emocional',
    items: [
      { id: 'berrinches',  label: 'Berrinches',  emoji: '🌋' },
      { id: 'tristeza',    label: 'Tristeza',    emoji: '💧' },
      { id: 'miedos',      label: 'Miedos',      emoji: '🫧' },
      { id: 'frustracion', label: 'Frustración', emoji: '😤' },
      { id: 'ansiedad',    label: 'Ansiedad',    emoji: '🌀' },
      { id: 'enojo',       label: 'Enojo',       emoji: '🔥' },
    ],
  },
  desarrollo: {
    nombre: 'Desarrollo y aprendizaje',
    items: [
      { id: 'socializar',   label: 'Socializar',   emoji: '👋' },
      { id: 'limites',      label: 'Límites',      emoji: '🤝' },
      { id: 'sueno',        label: 'Sueño',        emoji: '🌙' },
      { id: 'alimentacion', label: 'Alimentación', emoji: '🍽️' },
      { id: 'autonomia',    label: 'Autonomía',    emoji: '🌱' },
    ],
  },
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
      titulo: e.titulo || e.resumen?.slice(0, 40) || 'Momento',
      emoji: e.emoji || '·',
      fecha_label: relativoCorto(e.created_at),
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
// ─────────────────────────────────────────────────────────────────────
export function debeMostrarSugerencia(sugerencia, descartes) {
  if (!sugerencia) return false;
  const d = descartes.find((x) => x.fingerprint === sugerencia.fingerprint);
  if (!d) return true;
  const dias = (Date.now() - new Date(d.descartada_at).getTime()) / 86400000;
  return dias > 14;
}
