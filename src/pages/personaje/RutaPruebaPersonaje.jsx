import React, { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { enPrueba } from '../../utils/cuentasEnPrueba'

// Pantalla de prueba de la vitrina, dentro del Layout: solo Daniel y la cuenta
// de prueba (enPrueba). Otra vuelve a /panel y el codigo ni se descarga.
const PruebaPersonajePage = lazy(() => import('./PruebaPersonajePage'))

export default function RutaPruebaPersonaje() {
  const { user } = useAuth()
  if (!enPrueba(user?.id)) return <Navigate to="/panel" replace />
  return (
    <Suspense fallback={null}>
      <PruebaPersonajePage />
    </Suspense>
  )
}
