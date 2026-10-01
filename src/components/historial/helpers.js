export const PILL_BY_CATEGORIA = {
  frustracion: 'tangerine',
  enojo: 'tangerine',
  resistencia: 'tangerine',
  social: 'tangerine',
  rabieta: 'tangerine',

  cansado: 'lavender',
  sueno: 'lavender',
  somnolencia: 'lavender',
  estado: 'lavender',

  hambre: 'gold',
  comida: 'gold',
  sed: 'gold',
  hito: 'gold',

  transicion: 'blue',
  cambio: 'blue',
  miedo: 'blue',
  ansiedad: 'blue',
  separacion: 'blue',

  logro: 'green',
  bueno: 'green',
  empatia: 'green',
  cooperacion: 'green',
}

export function pillClassFor(gatillante) {
  const slug = String(gatillante || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return PILL_BY_CATEGORIA[slug] || 'tangerine'
}

// Fecha con la que Momentos ordena y agrupa. `fechaOrden` la pone HistorialPage
// (cuando se registró, en las cuentas en prueba); si no viene, cuándo pasó.
const fechaDeOrden = (ep) => ep.fechaOrden ?? ep.fecha

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "Pasó ayer" / "Pasó el 28 sep" cuando el día en que pasó no es el día en que
// se registró. Días en la hora local del teléfono. Sin registro: nada.
export function etiquetaPaso(fecha, createdAt, today = new Date()) {
  if (!fecha || !createdAt) return null
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const paso = new Date(fecha)
  if (dia(paso) === dia(new Date(createdAt))) return null
  const atras = Math.round((dia(today) - dia(paso)) / 86400000)
  if (atras === 0) return 'Pasó hoy'
  if (atras === 1) return 'Pasó ayer'
  const anio = paso.getFullYear() !== today.getFullYear() ? ` ${paso.getFullYear()}` : ''
  return `Pasó el ${paso.getDate()} ${MESES_CORTOS[paso.getMonth()]}${anio}`
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const fechaCorta = (d) => `${DIAS_CORTOS[d.getDay()]}, ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`

// `enPrueba`: meses como en la etiqueta ("sep", no "sept") y un grupo de un
// solo día con una sola fecha. Sin la opción, los encabezados quedan como hoy.
export function groupEpisodios(episodios, today = new Date(), { enPrueba = false } = {}) {
  const grupos = []
  const dayMs = 86400000
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const t0 = startOfDay(today).getTime()

  const buckets = new Map()
  const overflow = []

  for (const ep of episodios) {
    const epDay = startOfDay(new Date(fechaDeOrden(ep))).getTime()
    const diffDays = Math.round((t0 - epDay) / dayMs)
    if (diffDays < 4) {
      const key = epDay
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(ep)
    } else {
      overflow.push(ep)
    }
  }

  const sortedKeys = [...buckets.keys()].sort((a, b) => b - a)
  for (const key of sortedKeys) {
    const date = new Date(key)
    const diffDays = Math.round((t0 - key) / dayMs)
    let label
    if (diffDays === 0) label = 'Hoy'
    else if (diffDays === 1) label = 'Ayer'
    else label = date.toLocaleDateString('es-ES', { weekday: 'long' })
    grupos.push({
      type: 'day',
      label: label.charAt(0).toUpperCase() + label.slice(1),
      meta:
        (enPrueba
          ? `${String(date.getDate()).padStart(2, '0')} ${MESES_CORTOS[date.getMonth()]}`
          : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })) +
        ` · ${buckets.get(key).length}`,
      isToday: diffDays === 0,
      episodios: buckets.get(key),
    })
  }

  if (overflow.length > 0) {
    const oldest = new Date(fechaDeOrden(overflow[overflow.length - 1]))
    const newest = new Date(fechaDeOrden(overflow[0]))
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
    const mismoDia = newest.toDateString() === oldest.toDateString()
    grupos.push({
      type: 'range',
      label: !enPrueba
        ? `${fmt(newest)} — ${fmt(oldest)}`
        : mismoDia ? fechaCorta(newest) : `${fechaCorta(newest)} — ${fechaCorta(oldest)}`,
      meta: `${overflow.length} momento${overflow.length === 1 ? '' : 's'}`,
      isToday: false,
      episodios: overflow,
    })
  }

  return grupos
}

export function intensityDots({ tipo, nivel }) {
  if (tipo === 'logro' || tipo === 'hito') {
    return ['calm', 'empty', 'empty', 'empty', 'empty']
  }
  const result = ['empty', 'empty', 'empty', 'empty', 'empty']
  for (let i = 0; i < Math.min(nivel, 3); i++) result[i] = 'low'
  if (nivel >= 4) result[3] = 'peak'
  if (nivel >= 5) result[4] = 'peak'
  return result
}

export function emoTileClass(tipo) {
  switch (tipo) {
    case 'logro':
      return 'green'
    case 'hito':
      return 'gold'
    case 'sueño':
    case 'cansancio':
      return 'lavender'
    case 'miedo':
    case 'transicion':
      return 'blue'
    case 'pregunta':
      return 'pregunta'
    default:
      return 'tangerine'
  }
}

// Tipos de episodio: etiqueta e ícono de la tarjeta. Los usan la lista de
// Momentos y el momento abierto.
export const TIPOS = {
  rabieta:     { label: 'Rabieta / explosión',              emoji: '💥' },
  llanto:      { label: 'Llanto intenso',                   emoji: '😭' },
  agresividad: { label: 'Golpes / agresividad',             emoji: '👊' },
  miedo:       { label: 'Miedo / angustia',                 emoji: '🫣' },
  sueño:       { label: 'No quiere dormir',                 emoji: '🛏️' },
  social:      { label: 'Se aisló / no quiso relacionarse', emoji: '🫥' },
  desconexion: { label: 'Se cerró / no respondía',          emoji: '🔇' },
  oposicion:   { label: 'Oposición / no coopera',           emoji: '🚫' },
  otro:        { label: 'Otro',                             emoji: '📝' },
}
