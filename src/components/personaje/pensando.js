// Estado "pensando": el escarabajo en loop mientras la IA lee el episodio.
// Para todos los usuarios, nunca con movimiento reducido (la vitrina sigue
// siendo solo de Daniel por RutaPersonaje).
// Cada variante trae su video empaquetado (color arriba, 16 px, mascara abajo)
// a 3x del tamano en pantalla; ancho, proporcion y posicion viven en
// PensandoEscarabajo.module.css.
export const VARIANTES_PENSANDO = [
  // video 05-pensando, cuadros 11 a 115 (cierre de loop sin fundido), 30 fps
  { id: 'rascando', video: '/personaje/pensando-alfa.mp4', poster: '/personaje/pensando-poster.webp', ancho: 362, alto: 626 },
  // video 21-pensando-2 (mano en la barbilla), cuadros 4 a 190, 24 fps
  { id: 'barbilla', video: '/personaje/pensando-2-alfa.mp4', poster: '/personaje/pensando-2-poster.webp', ancho: 216, alto: 294 },
  // video 22-pensando-3 (manos en la guata), cuadros 4 a 214, 24 fps
  { id: 'manos', video: '/personaje/pensando-3-alfa.mp4', poster: '/personaje/pensando-3-poster.webp', ancho: 226, alto: 298 },
]

const claveUltima = (userId) => `huella_pensando_ultima_${userId}`

export function usaPensando(userId) {
  if (!userId) return false
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

// Arranque rapido en iOS: mientras el papa escribe, el video elegido queda
// montado oculto (opacidad 0, tamano natural), muted + playsinline, con play()
// y pausado en el cuadro 0 al llegar playing. Si play() se rechaza no pasa
// nada: el sello entra a los 2,5 s. Devuelve la limpieza.
export function calentarPensando(variante) {
  let video = null
  try {
    video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('aria-hidden', 'true')
    video.preload = 'auto'
    video.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-1'
    video.addEventListener('playing', () => { video.pause(); video.currentTime = 0 }, { once: true })
    video.src = variante.video
    document.body.appendChild(video)
    const p = video.play()
    if (p && p.catch) p.catch(() => {})
  } catch { /* sin calentar */ }
  return () => { try { video?.pause(); video?.remove() } catch { /* ya fuera */ } }
}

export function marcarPensando(userId, id) {
  try { localStorage.setItem(claveUltima(userId), id) } catch { /* sin ultima */ }
}
