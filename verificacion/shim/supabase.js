// Supabase falso y controlable. Reemplaza a src/lib/supabase.js en el bundle
// de verificacion (lo intercepta el plugin de vite.config.mjs), asi que el
// AuthContext bajo prueba es el REAL, sin tocar una linea.

let control = null

export function __controlar(c) {
  control = c
  control.desuscrito = false
  control.callback = null
  return control
}

export const supabaseConfigured = true

export const supabase = {
  auth: {
    getSession: () => control.getSession(),
    onAuthStateChange: (cb) => {
      control.callback = cb
      return {
        data: {
          subscription: {
            unsubscribe() { control.desuscrito = true },
          },
        },
      }
    },
  },
}

// Helpers para armar escenarios de red.
export function sesionDe(id) {
  return { data: { session: { user: { id } } } }
}
export const sinSesion = { data: { session: null } }

// Promesa que NUNCA settlea: es el corazon del bug (el refresh de un token
// vencido que se queda colgado sin timeout).
export function colgada() {
  return new Promise(() => {})
}
