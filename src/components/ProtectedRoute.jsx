import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useHuella } from '../context/HuellaContext'
import SplashArranque from './ui/SplashArranque'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { dataLoaded } = useHuella()
  const [splashDone, setSplashDone] = useState(false)

  // Logged-out: no esperamos la carga de datos, directo a login.
  if (!loading && !user) return <Navigate to="/login" replace />

  // La app está lista para revelarse cuando el auth resolvió con usuario Y los
  // datos de la cuenta ya cargaron (`dataLoaded`, el mismo flag del fix del
  // onboarding). Un usuario nuevo sin datos igual libera el splash (dataLoaded
  // pasa a true con datos vacíos) → el onboarding aparece después del fade.
  const appReady = !loading && !!user && dataLoaded

  // El splash es un overlay: la app se monta debajo y el fade la revela. Se
  // mantiene hasta que SplashArranque termina su salida (mínimo 900ms + fade).
  return (
    <>
      {user && children}
      {!splashDone && (
        <SplashArranque ready={appReady} onDone={() => setSplashDone(true)} />
      )}
    </>
  )
}
