// ──────────────────────────────────────────────────────────────────────
// TAXONOMÍA DE EMOCIONES — fuente única
//
// Vivía dentro de RegistroPage.jsx, pero `extraerEpisodio` (servicio de IA)
// necesita la misma lista para armar su prompt y para validar que la
// específica que devuelve el modelo exista de verdad. Un servicio no debe
// importar de una página, y copiar la lista habría creado un segundo
// inventario que se desincroniza — el repo ya arrastra ese problema con los
// autores. Así que vive acá y ambos la importan.
//
// Los `color` y `colorBg` apuntan a tokens de src/index.css: la UI los usa
// tal cual, el prompt de IA solo lee `label` y `especificas`.
// ──────────────────────────────────────────────────────────────────────

export const TAXONOMIA_EMOCIONES = [
  {
    id: 'miedo',
    label: 'Miedo / Angustia',
    emoji: '😨',
    color: 'var(--color-emocion-miedo)',
    colorBg: 'var(--color-emocion-miedo-bg)',
    especificas: [
      'Miedo al abandono',
      'Miedo a lo desconocido',
      'Miedo a fracasar',
      'Miedo a hacerse daño',
      'Miedo a la oscuridad',
    ],
  },
  {
    id: 'rabia',
    label: 'Rabia / Frustración',
    emoji: '😠',
    color: 'var(--color-emocion-rabia)',
    colorBg: 'var(--color-emocion-rabia-bg)',
    especificas: [
      'Rabia por injusticia',
      'Rabia por no conseguir algo',
      'Rabia por ser interrumpido',
      'Rabia por perder el control',
      'Frustración acumulada',
    ],
  },
  {
    id: 'tristeza',
    label: 'Tristeza / Pena',
    emoji: '😢',
    color: 'var(--color-emocion-tristeza)',
    colorBg: 'var(--color-emocion-tristeza-bg)',
    especificas: [
      'Tristeza por un cambio o pérdida',
      'Tristeza por sentirse solo',
      'Tristeza por decepción',
      'Añoranza de alguien',
      'Tristeza sin causa clara',
    ],
  },
  {
    id: 'alegria',
    label: 'Alegría / Desborde',
    emoji: '🤩',
    color: 'var(--color-emocion-alegria)',
    colorBg: 'var(--color-emocion-alegria-bg)',
    especificas: [
      'Euforia que se desbordó',
      'Alegría que terminó en llanto',
      'Excitación extrema',
      'Emoción por anticipación',
    ],
  },
  {
    id: 'asco',
    label: 'Asco / Rechazo',
    emoji: '🤢',
    color: 'var(--color-emocion-asco)',
    colorBg: 'var(--color-emocion-asco-bg)',
    especificas: [
      'Rechazo a comida o textura',
      'Rechazo a una actividad',
      'Disgusto sensorial',
      'Vergüenza',
    ],
  },
  {
    id: 'confusion',
    label: 'Confusión / Sorpresa',
    emoji: '😵',
    color: 'var(--color-emocion-confusion)',
    colorBg: 'var(--color-emocion-confusion-bg)',
    especificas: [
      'Confusión por cambio de reglas',
      'Sorpresa que asustó',
      'No entendió lo que pasó',
      'Se sintió ignorado',
    ],
  },
]
