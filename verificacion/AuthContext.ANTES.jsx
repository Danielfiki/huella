import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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
