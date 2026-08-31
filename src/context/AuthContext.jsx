import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

// Rescate del arranque. `getSession()` era el UNICO eslabon de la cadena de
// arranque sin red de seguridad: no tenia .catch() ni timeout, asi que si la
// promesa se colgaba o fallaba, `loading` se quedaba en true PARA SIEMPRE. Y
// como ProtectedRoute exige !loading tanto para revelar la app como para
// mandar a /login, la app quedaba en un limbo del que no salia: el splash
// latiendo sin fin. Ese es el "se demoro demasiado, no se pudo abrir" que
// reportaron testers antiguos.
//
// Por que les pegaba a ELLOS y no a los nuevos: una cuenta sin sesion guardada
// resuelve al instante, sin tocar la red. Una sesion vieja y vencida obliga a
// getSession() a salir a refrescar el token, y ese fetch no tiene timeout.
//
// 8s va A PROPOSITO por debajo del failsafe visual del splash (12s): el camino
// normal de salida del limbo es este rescate silencioso, no el mensaje de
// "esto esta tardando".
const RESCATE_SESION_MS = 8000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    let vivo = true          // corta cualquier setState despues de desmontar
    let liberado = false     // el arranque ya se solto (por exito, error o rescate)
    let rescate = null       // declarado antes que liberar() para no leerlo en TDZ

    function liberar() {
      if (liberado) return
      liberado = true
      clearTimeout(rescate)
      setLoading(false)
    }

    // Aplica la sesion venga cuando venga. Si el rescate ya nos saco del limbo
    // y la sesion real llega despues, igual la tomamos: el usuario se recupera
    // solo, sin tener que hacer nada.
    function aplicarSesion(session) {
      if (!vivo) return
      setUser(session?.user ?? null)
      liberar()
    }

    rescate = setTimeout(() => {
      if (!vivo || liberado) return
      console.warn(`[Auth] getSession() no respondio en ${RESCATE_SESION_MS}ms; seguimos sin sesion`)
      setUser(null)
      liberar()
    }, RESCATE_SESION_MS)

    supabase.auth.getSession()
      .then(({ data: { session } }) => aplicarSesion(session))
      .catch((err) => {
        console.warn('[Auth] getSession() fallo:', err?.message ?? err)
        aplicarSesion(null)
      })

    // onAuthStateChange tambien entrega la sesion inicial, asi que es la
    // segunda via de recuperacion: si getSession() se colgo pero la sesion
    // termina resolviendose, entra por aca y la app se destraba igual.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!vivo) return
      setUser(session?.user ?? null)
      liberar()
    })

    return () => {
      vivo = false
      clearTimeout(rescate)
      subscription.unsubscribe()
    }
  }, [])

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Envía el correo de reset a `email`. Supabase usa su propio sistema de
  // email para esto (NO Resend) — el correo es independiente del bug de
  // /api/invite. El `redirectTo` apunta a la ruta pública /reset-password
  // del mismo origin; al hacer click en el link del email, Supabase llega
  // a esa URL con una sesión temporal de tipo 'recovery' ya seteada en
  // localStorage, lista para que el usuario actualice su password.
  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  // `nextPath` opcional permite que el flujo OAuth respete el ?redirect=
  // de la URL de origen (típicamente /invitar?token=xxx para parejas
  // invitadas). Si no se pasa, conserva el comportamiento anterior
  // (`/panel`). Acepta paths absolutos relativos al origen.
  async function signInWithGoogle(nextPath = '/panel') {
    const seguro = typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/panel'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${seguro}` },
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, signInWithGoogle, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
