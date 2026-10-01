import { DUENO_PERSONAJE } from './bienvenida'

// Visita de "orgulloso" en la pantalla de avance guardado: sube desde la barra
// inferior, se muestra orgulloso y se esconde solo, una vez por cada apertura
// de la pantalla. Por ahora solo la cuenta de Daniel; nunca con movimiento
// reducido.
// Cada variante trae su video empaquetado (color arriba, 16 px, mascara abajo)
// a 3x del tamano en pantalla. El borde de abajo de los tres archivos es la
// linea de la repisa (y 677 de la fuente) y la escala es la misma (craneo de
// la bienvenida del centro, x1,085): ancho, proporcion y centrado viven en
// OrgullosoEscarabajo.module.css. `pixel` es un punto del cuerpo (x, y desde
// arriba) que marca que ya hay un cuadro de verdad: el centro de la cabeza,
// 8 px sobre el borde.
export const VARIANTES_ORGULLOSO = [
  // video 23-orgulloso-1 (pulgar arriba), cuadros 2 a 213
  { id: 'pulgar', video: '/personaje/home/orgulloso-pulgar-alfa.mp4', ancho: 424, alto: 556, pixel: [214, 548] },
  // video 25-orgulloso-2 (aplauso suave), cuadros 2 a 219
  { id: 'aplauso', video: '/personaje/home/orgulloso-aplauso-alfa.mp4', ancho: 418, alto: 560, pixel: [194, 552] },
  // video 26-orgulloso-3 (manos en la cintura), cuadros 4 a 236 sin el 25, 27,
  // 29 y 50: la subida de la fuente se frenaba a mitad de camino
  { id: 'jarras', video: '/personaje/home/orgulloso-jarras-alfa.mp4', ancho: 598, alto: 600, pixel: [293, 592] },
]

const claveUltima = (userId) => `huella_orgulloso_ultima_${userId}`

export function usaOrgulloso(userId) {
  if (userId !== DUENO_PERSONAJE) return false
  try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Al azar sin repetir la ultima mostrada.
export function elegirOrgulloso(userId) {
  let ultima = null
  try { ultima = localStorage.getItem(claveUltima(userId)) } catch { /* sin ultima */ }
  const opciones = VARIANTES_ORGULLOSO.filter((v) => v.id !== ultima)
  return opciones[Math.floor(Math.random() * opciones.length)]
}

export function marcarOrgulloso(userId, id) {
  try { localStorage.setItem(claveUltima(userId), id) } catch { /* sin ultima */ }
}

// Al abrir el formulario de avance: baja el video de la variante que toca y
// el codigo del componente, para que la visita asome apenas se guarda. La
// visita igual descarga el video entero antes de mostrarse (si la precarga
// no termino, espera y arranca desde el principio, nunca a mitad).
export function precargarOrgulloso(variante) {
  try { fetch(variante.video).catch(() => {}) } catch { /* sin precarga */ }
  import('./OrgullosoEscarabajo').catch(() => {})
}
