// ──────────────────────────────────────────────────────────────────────
// CATÁLOGOS DEL EPISODIO — fuente única
//
// Vivían dentro de RegistroPage.jsx. Los necesita también el registro
// conversacional (P1/P2), así que se comparten desde acá en vez de
// duplicarse. Los `id` son los que viajan a la base: no se tocan.
// ──────────────────────────────────────────────────────────────────────

export const TIPOS = [
  // El label dice "Desborde" y no "Rabieta": describe lo que pasó sin la
  // carga de juicio que arrastra la palabra. El id sigue siendo 'rabieta'
  // porque es lo que hay en la base y en TIPO_A_HABILIDAD.
  { id: 'rabieta',     label: 'Desborde / explosión',             emoji: '💥' },
  { id: 'llanto',      label: 'Llanto intenso',                   emoji: '😭' },
  { id: 'agresividad', label: 'Golpes / agresividad',             emoji: '👊' },
  { id: 'miedo',       label: 'Miedo / angustia',                 emoji: '🫣' },
  { id: 'sueño',       label: 'No quiere dormir',                 emoji: '🛏️' },
  { id: 'oposicion',   label: 'Oposición / no coopera',           emoji: '🚫' },
  { id: 'social',      label: 'Se aisló / no quiso relacionarse', emoji: '🫥' },
  { id: 'desconexion', label: 'Se cerró / no respondía',          emoji: '🔇' },
  { id: 'otro',        label: 'Otro',                             emoji: '📝' },
]

export const INTENSIDADES = [
  // 😕 en vez de 😌 para "Muy leve": la cara serena sugería que no pasó
  // nada, y el padre igual está registrando algo que le costó.
  { valor: 1, emoji: '😕', label: 'Muy leve' },
  { valor: 2, emoji: '🙁', label: 'Leve' },
  { valor: 3, emoji: '😟', label: 'Moderado' },
  { valor: 4, emoji: '😣', label: 'Intenso' },
  { valor: 5, emoji: '😱', label: 'Muy intenso' },
]

export const CUANDO_OPCIONES = [
  { id: 'ahora',      label: 'Ahora' },
  { id: 'hora_antes', label: 'Hace ~1 hora' },
  { id: 'manana',     label: 'Esta mañana' },
  { id: 'tarde',      label: 'Esta tarde' },
  { id: 'ayer',       label: 'Ayer' },
  { id: 'custom',     label: 'Otro momento…' },
]

// Helpers de lectura, para no repetir el find en cada pantalla.
export const labelTipo   = (id) => TIPOS.find((t) => t.id === id)?.label ?? null
export const labelCuando = (id) => CUANDO_OPCIONES.find((c) => c.id === id)?.label ?? null
