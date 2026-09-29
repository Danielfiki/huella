import { DUENO_PERSONAJE } from '../../components/personaje/bienvenida'

// Rediseño de Momentos (lista sobria + momento abierto en pantalla propia):
// solo la cuenta de Daniel mientras se prueba, la misma condición que el
// personaje. Las demás cuentas ven Momentos como antes.
export function usaMomentosNuevo(userId) {
  return userId === DUENO_PERSONAJE
}

// "28 sept · 03:00 p. m." — fecha corta y hora del momento abierto.
export function fechaMomento(fecha) {
  const d = new Date(fecha)
  const mes = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${d.getDate()} ${mes} · ${hora}`
}
