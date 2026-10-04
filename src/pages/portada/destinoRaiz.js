// Que se ve en "/" (activo desde el 4 oct 2026; lo usa EntradaRaiz.jsx).
//
//   - Con sesion                      -> /panel, como antes.
//   - Sin sesion, desde el navegador  -> portada.
//   - Sin sesion, dentro de la app de Android (TWA lat.huella.app) o en la
//     app instalada (PWA, display-mode standalone) -> /login, como antes.
//
// La TWA se reconoce porque al abrirla `document.referrer` empieza con
// android-app://lat.huella.app. Ese dato solo existe en la primera carga, asi
// que App.jsx llama a recordarSiEsAppAndroid() al cargar y queda en
// sessionStorage para las navegaciones siguientes de esa sesion. sessionStorage
// y no localStorage: la TWA comparte almacenamiento con Chrome, y una marca
// permanente le esconderia la portada tambien al navegador.

const CLAVE_APP = 'huella_en_app_android'
const REFERRER_TWA = 'android-app://lat.huella.app'

export function recordarSiEsAppAndroid() {
  try {
    if (document.referrer.startsWith(REFERRER_TWA)) sessionStorage.setItem(CLAVE_APP, '1')
  } catch { /* sin almacenamiento: se decide solo con el referrer */ }
}

export function estaEnApp() {
  try {
    if (document.referrer.startsWith(REFERRER_TWA)) return true
    if (sessionStorage.getItem(CLAVE_APP) === '1') return true
  } catch { /* sigue con display-mode */ }
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

// 'panel' | 'portada' | 'login'
export function destinoRaiz({ conSesion }) {
  if (conSesion) return 'panel'
  return estaEnApp() ? 'login' : 'portada'
}
