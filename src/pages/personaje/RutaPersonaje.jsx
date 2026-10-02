import React, { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { enPrueba } from '../../utils/cuentasEnPrueba'

// Vitrina privada del personaje: solo Daniel y la cuenta de prueba (enPrueba). Otra cuenta
// vuelve a /panel sin ver nada, y el codigo de la vitrina ni se descarga
// (va en un chunk aparte que solo se pide despues del filtro).

const PersonajePage = lazy(() => import('./PersonajePage'))

export default function RutaPersonaje() {
  const { user } = useAuth()
  if (!enPrueba(user?.id)) return <Navigate to="/panel" replace />
  return (
    <Suspense fallback={null}>
      <PersonajePage />
    </Suspense>
  )
}
