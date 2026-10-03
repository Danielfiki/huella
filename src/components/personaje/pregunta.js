import { diaChile } from '../../utils/fechaChile'
import { tocaBienvenida } from './bienvenida'

// Visita de la ficha "?" en el Home (para todos desde el 3 oct 2026). Mismo
// video empaquetado y misma escala que los orgullosos (base 24, craneo x1,085),
// pero fuera de su alternancia: no entra en VARIANTES_ORGULLOSO.
// Hoy hay una sola; la eleccion ya alterna sin repetir la ultima para cuando
// lleguen la 2 y la 3.
export const VARIANTES_PREGUNTA = [
  // video 30-pregunta-1 (mano en el menton), cuadros 1 a 239 (el 0 es el
  // destello); los ultimos 6 con fundido a transparente: el ultimo, vacio.
  { id: 'pregunta1', video: '/personaje/home/pregunta-1-alfa.mp4', ancho: 432, alto: 562, pixel: [216, 550] },
  // video 31-pregunta-2 (se rasca la cabeza), cuadros 1 a 233 (el 0 es el
  // destello; desde el 234 vuelve a asomar). El 218 al 233 ya vienen vacios.
  // Recorte mas ancho a la izquierda por la mano, mismo borde derecho, repisa
  // y escala que el 30: cae en el mismo lugar de la pantalla.
  { id: 'pregunta2', video: '/personaje/home/pregunta-2-alfa.mp4', ancho: 476, alto: 562, pixel: [260, 550] },
]

// Una vez al dia por usuario en este telefono, igual que la bienvenida: guarda
// el dia de Chile en que ya se mostro. Solo despues de que la bienvenida ya se
// vio hoy (la primera apertura del dia es de ella). Si localStorage falla, no
// se muestra.
const claveDia = (userId) => `huella_visita_pregunta_${userId}`
const claveUltima = (userId) => `huella_visita_pregunta_ultima_${userId}`

export function tocaVisitaPregunta(userId) {
  try {
    return !tocaBienvenida(userId) && localStorage.getItem(claveDia(userId)) !== diaChile(new Date())
  } catch {
    return false
  }
}

// Al azar sin repetir la ultima mostrada.
export function elegirPregunta(userId) {
  let ultima = null
  try { ultima = localStorage.getItem(claveUltima(userId)) } catch { /* sin ultima */ }
  const opciones = VARIANTES_PREGUNTA.length > 1 ? VARIANTES_PREGUNTA.filter((v) => v.id !== ultima) : VARIANTES_PREGUNTA
  return opciones[Math.floor(Math.random() * opciones.length)]
}

// Con el primer cuadro de verdad: marca el dia y la variante. Si el video
// falla antes, no se marca y se intenta en la proxima entrada al Home.
export function marcarPregunta(userId, id) {
  try {
    localStorage.setItem(claveDia(userId), diaChile(new Date()))
    localStorage.setItem(claveUltima(userId), id)
  } catch { /* sin marca */ }
}
