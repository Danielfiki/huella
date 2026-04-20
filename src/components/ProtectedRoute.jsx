import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CitaLoader from './ui/CitaLoader'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'var(--color-bg)',
        padding: '0 32px',
      }}>
        <CitaLoader categoria="general" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
