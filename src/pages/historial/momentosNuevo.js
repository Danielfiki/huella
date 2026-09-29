// "28 sept · 03:00 p. m." — fecha corta y hora del momento abierto.
export function fechaMomento(fecha) {
  const d = new Date(fecha)
  const mes = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${d.getDate()} ${mes} · ${hora}`
}
