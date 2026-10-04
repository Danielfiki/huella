import { supabase } from '../lib/supabase'

// Entrada con Google por id token: Google Identity Services (el boton oficial)
// entrega un token firmado por Google con el usuario, y Supabase lo canjea por
// la sesion con signInWithIdToken. La pantalla de Google muestra huella.lat,
// no supabase.co. Es el mismo usuario de Supabase que con signInWithOAuth (la
// identidad de Google se reconoce por su id), asi que las cuentas existentes
// quedan iguales.
//
// Para iOS nativo: el SDK de Google entrega el mismo id token; se usa
// crearNonce (el hash va al SDK) y entrarConTokenGoogle (el crudo va a
// Supabase) tal cual. Solo cambia el Client ID (uno de tipo iOS, que tambien
// tiene que estar en Supabase).
export const GOOGLE_CLIENT_ID_WEB = '48774588483-3c3cai6ihdi4ftntkri9sbf29r3cm5qo.apps.googleusercontent.com'

// Nonce contra la reutilizacion del token: Google recibe el hash SHA-256 (lo
// pone dentro del token) y Supabase recibe el crudo, lo hashea y compara. En
// Supabase "Skip nonce checks" esta apagado: sin nonce, el canje falla.
export async function crearNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const crudo = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(crudo))
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return { crudo, hash }
}

// Script de Google, una sola vez por carga de la app.
let carga = null
export function cargarGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (!carga) {
    carga = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = () => resolve(window.google)
      s.onerror = () => { carga = null; reject(new Error('No cargo accounts.google.com/gsi/client')) }
      document.head.appendChild(s)
    })
  }
  return carga
}

export async function entrarConTokenGoogle(token, nonceCrudo) {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce: nonceCrudo })
  if (error) throw error
  return data
}
