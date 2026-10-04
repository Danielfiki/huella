// Que se ve en "/" cuando la portada pase a ser la entrada (TODAVIA SIN
// ACTIVAR: hoy "/" sigue yendo al login sin sesion, por ProtectedRoute).
//
//   - Con sesion                      -> /panel, como hoy.
//   - Sin sesion, desde el navegador  -> portada.
//   - Sin sesion, dentro de la app de Android (TWA lat.huella.app) o en la
//     app instalada (PWA, display-mode standalone) -> /login, como hoy.
//
// La TWA se reconoce porque al abrirla `document.referrer` empieza con
// android-app://lat.huella.app. Ese dato solo existe en la primera carga, asi
// que se guarda en sessionStorage para las navegaciones siguientes de esa
// sesion. sessionStorage y no localStorage: la TWA comparte almacenamiento con
// Chrome, y una marca permanente le escondería la portada tambien al navegador.
//
// Para activarlo, en App.jsx la ruta "/" pasa a ser publica y su index usa
// <EntradaRaiz />: con `destinoRaiz(...)` decide entre <Navigate to="/panel">,
// <PortadaPage /> o <Navigate to="/login">, y espera a que `loading` del
// AuthContext termine antes de decidir (si no, un usuario con sesion veria la
// portada un instante).

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
