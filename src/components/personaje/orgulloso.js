import { DUENO_PERSONAJE } from './bienvenida'

// Estado "orgulloso": el escarabajo celebra una vez cuando Huella responde a un
// avance. Solo la cuenta de Daniel mientras se prueba, y nunca con movimiento
// reducido. Cada variante trae su video empaquetado (color arriba, 16 px,
// mascara abajo) a 3x del tamano en pantalla y el pixel del cuerpo que confirma
// el primer cuadro pintado; ancho y proporcion viven en
// PensandoEscarabajo.module.css. Lista preparada para 3 variantes.
export const VARIANTES_ORGULLOSO = [
  // video 02-orgulloso (manos en la cadera), cuadros 1 a 240, 24 fps
  { id: 'jarra', video: '/personaje/orgulloso-alfa.mp4', ancho: 170, alto: 306, pixel: [85, 184] },
]

const claveUltima = (userId) => `huella_orgulloso_ultima_${userId}`

export function usaOrgulloso(userId) {
  if (userId !== DUENO_PERSONAJE) return false
  try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Al azar sin repetir la ultima mostrada (con una sola variante, siempre esa).
export function elegirOrgulloso(userId) {
  let ultima = null
  try { ultima = localStorage.getItem(claveUltima(userId)) } catch { /* sin ultima */ }
  const opciones = VARIANTES_ORGULLOSO.length > 1 ? VARIANTES_ORGULLOSO.filter((v) => v.id !== ultima) : VARIANTES_ORGULLOSO
  return opciones[Math.floor(Math.random() * opciones.length)]
}

// Se llama recien cuando el escarabajo pinta su primer cuadro.
export function marcarOrgulloso(userId, id) {
  try { localStorage.setItem(claveUltima(userId), id) } catch { /* sin ultima */ }
}
