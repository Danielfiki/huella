import { diaChile } from '../../utils/fechaChile'

// La vitrina del personaje (/personaje) es privada: solo la cuenta de Daniel.
// La bienvenida del Home es para todos (una vez al dia por usuario), con sus
// 3 variantes.
export const DUENO_PERSONAJE = '04ddd97a-e674-4e59-8f37-78cb38d46090'

// Marca del dia de la bienvenida, por usuario: guarda el dia de Chile en que
// ya se mostro. localStorage puede fallar (modo privado, bloqueado): si falla,
// la bienvenida se trata como ya vista para no repetirla en cada apertura.
const clave = (userId) => `huella_bienvenida_escarabajo_${userId}`

export function tocaBienvenida(userId) {
  try {
    return localStorage.getItem(clave(userId)) !== diaChile(new Date())
  } catch {
    return false
  }
}

export function marcarBienvenida(userId) {
  try { localStorage.setItem(clave(userId), diaChile(new Date())) } catch { /* sin marca */ }
}

export function borrarMarcaBienvenida(userId) {
  try { localStorage.removeItem(clave(userId)) } catch { /* sin marca */ }
}

// Variantes de la bienvenida. Cada una trae su video empaquetado (color arriba,
// 16 px, mascara abajo) a 3x del tamano en pantalla, su poster y su clase de
// CSS (ancho, proporcion y corte viven en BienvenidaEscarabajo.module.css).
export const VARIANTES = [
  // video 15, cuadros 43 a 219
  { id: 'costado', nombre: 'Costado', video: '/personaje/home/bienvenida-alfa.mp4', poster: '/personaje/home/asomado-saludo-poster.webp', ancho: 450, alto: 568 },
  // video 17, cuadros 7 a 228
  { id: 'derecha', nombre: 'Derecha', video: '/personaje/home/bienvenida-derecha-alfa.mp4', poster: '/personaje/home/bienvenida-derecha-poster.webp', ancho: 642, alto: 652 },
  // video 16, cuadros 0 a 228
  { id: 'centro', nombre: 'Centro', video: '/personaje/home/bienvenida-centro-alfa.mp4', poster: '/personaje/home/bienvenida-centro-poster.webp', ancho: 484, alto: 538 },
]

const claveUltima = (userId) => `huella_bienvenida_ultima_${userId}`
const CLAVE_FORZADA = 'huella_bienvenida_forzada'

// Al azar sin repetir la ultima mostrada. La vitrina puede forzar una (se
// consume cuando la bienvenida entra, en marcarVariante).
export function elegirVariante(userId) {
  const lista = VARIANTES
  try {
    const v = lista.find((x) => x.id === localStorage.getItem(CLAVE_FORZADA))
    if (v) return v
  } catch { /* sin forzar */ }
  let ultima = null
  try { ultima = localStorage.getItem(claveUltima(userId)) } catch { /* sin ultima */ }
  const opciones = lista.length > 1 ? lista.filter((v) => v.id !== ultima) : lista
  return opciones[Math.floor(Math.random() * opciones.length)]
}

export function marcarVariante(userId, id) {
  try {
    localStorage.setItem(claveUltima(userId), id)
    localStorage.removeItem(CLAVE_FORZADA)
  } catch { /* sin ultima */ }
}

export function forzarVariante(id) {
  try { localStorage.setItem(CLAVE_FORZADA, id) } catch { /* sin forzar */ }
}
