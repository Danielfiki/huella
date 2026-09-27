import { DUENO_PERSONAJE } from './bienvenida'

// Estado "pensando": el escarabajo en loop mientras la IA lee el episodio.
// Solo la cuenta de Daniel mientras se prueba, y nunca con movimiento reducido.
// Cada variante trae su video empaquetado (color arriba, 16 px, mascara abajo)
// a 3x del tamano en pantalla; ancho, proporcion y posicion viven en
// PensandoEscarabajo.module.css. Faltan la segunda y la tercera variante.
export const VARIANTES_PENSANDO = [
  // video 05-pensando, cuadros 11 a 115 (cierre de loop sin fundido), 30 fps
  { id: 'rascando', video: '/personaje/pensando-alfa.mp4', poster: '/personaje/pensando-poster.webp', ancho: 362, alto: 626 },
]

const claveUltima = (userId) => `huella_pensando_ultima_${userId}`

export function usaPensando(userId) {
  if (userId !== DUENO_PERSONAJE) return false
  try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Al azar sin repetir la ultima mostrada (con una sola variante, siempre esa).
export function elegirPensando(userId) {
  let ultima = null
  try { ultima = localStorage.getItem(claveUltima(userId)) } catch { /* sin ultima */ }
  const opciones = VARIANTES_PENSANDO.length > 1 ? VARIANTES_PENSANDO.filter((v) => v.id !== ultima) : VARIANTES_PENSANDO
  return opciones[Math.floor(Math.random() * opciones.length)]
}

// Como la bienvenida: el video y el componente se bajan antes de hacer falta
// (mientras el papa escribe el relato), asi playing llega dentro de los 1,5 s.
export function precargarPensando(variante) {
  try { fetch(variante.video).catch(() => {}) } catch { /* sin precarga */ }
  import('./PensandoEscarabajo').catch(() => {})
}

export function marcarPensando(userId, id) {
  try { localStorage.setItem(claveUltima(userId), id) } catch { /* sin ultima */ }
}
