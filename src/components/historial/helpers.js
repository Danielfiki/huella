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

export function statColorFor(value) {
  if (value < 2) return 'calm'
  if (value > 3.5) return 'alert'
  return 'warm'
}

export function groupEpisodios(episodios, today = new Date()) {
  const grupos = []
  const dayMs = 86400000
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const t0 = startOfDay(today).getTime()

  const buckets = new Map()
  const overflow = []

  for (const ep of episodios) {
    const epDay = startOfDay(new Date(ep.fecha)).getTime()
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
        date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) +
        ` · ${buckets.get(key).length}`,
      isToday: diffDays === 0,
      episodios: buckets.get(key),
    })
  }

  if (overflow.length > 0) {
    const oldest = new Date(overflow[overflow.length - 1].fecha)
    const newest = new Date(overflow[0].fecha)
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
    grupos.push({
      type: 'range',
      label: `${fmt(newest)} — ${fmt(oldest)}`,
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
    default:
      return 'tangerine'
  }
}
