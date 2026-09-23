import React, { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Vitrina privada del personaje: solo la ve Daniel. Cualquier otra cuenta
// vuelve a /panel sin ver nada, y el codigo de la vitrina ni se descarga
// (va en un chunk aparte que solo se pide despues del filtro).
const DUENO = '04ddd97a-e674-4e59-8f37-78cb38d46090'

const PersonajePage = lazy(() => import('./PersonajePage'))

export default function RutaPersonaje() {
  const { user } = useAuth()
  if (user?.id !== DUENO) return <Navigate to="/panel" replace />
  return (
    <Suspense fallback={null}>
      <PersonajePage />
    </Suspense>
  )
}
