import React, { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { DUENO_PERSONAJE as DUENO } from '../../components/personaje/bienvenida'

// Pantalla de prueba de la vitrina, dentro del Layout: solo la cuenta de
// Daniel. Cualquier otra vuelve a /panel y el codigo ni se descarga.
const PruebaPersonajePage = lazy(() => import('./PruebaPersonajePage'))

export default function RutaPruebaPersonaje() {
  const { user } = useAuth()
  if (user?.id !== DUENO) return <Navigate to="/panel" replace />
  return (
    <Suspense fallback={null}>
      <PruebaPersonajePage />
    </Suspense>
  )
}
