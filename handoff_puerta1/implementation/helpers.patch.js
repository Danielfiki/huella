// helpers.patch.js
// Único cambio en src/pages/estrategias/helpers.js para Puerta 1 · Concepto C.
//
// MOTIVO: el mosaico de evidencia muestra hasta 5 episodios detonantes. El detector
// estructurado (detectarPatronesEstructurado) ya devuelve hasta 5 ids en el campo
// episodios_ids. El recorte a 3 vivía sólo en el adaptador.
//
// CAMBIO 1: en buildSugerenciaFromInterpretacion, subir el slice de 3 a 5.
// Es el único cambio en helpers.js para el conteo de detonantes.
//
// ────────────────────────────────────────────────────────────────────
// LOCALIZAR (dentro de buildSugerenciaFromInterpretacion):
//
//   const detonantes = (patron.episodios_ids || [])
//     .slice(0, 3)                    // ← ESTA LÍNEA
//     .map((id) => episodios.find((e) => e.id === id))
//     ...
//
// REEMPLAZAR el slice por:
//
//   .slice(0, 5)
//
// El resto del map (hidratar id → { id, titulo, emoji, fecha_label, intensidad,
// categoria }) NO se toca aún (ver CAMBIO 2).
//
// ────────────────────────────────────────────────────────────────────
// CAMBIO 2: el componente PuertaUnoHallazgo necesita además created_at para
// calcular el día del tile (Lun/Mar/...) y el span de días del stamp arriba.
// Agregar `created_at` al objeto hidratado:
//
//   .map((e) => ({
//     id: e.id,
//     titulo: e.titulo || e.resumen?.slice(0, 40) || 'Momento',
//     emoji: e.emoji || '·',
//     fecha_label: relativoCorto(e.created_at),
//     intensidad: e.intensidad || 3,
//     categoria: e.categoria || 'rutina',
//     created_at: e.created_at,           // ← AGREGAR
//   }));
//
// Estos dos cambios son los ÚNICOS en helpers.js. No tocar nada más.
// ────────────────────────────────────────────────────────────────────
