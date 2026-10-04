import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import PortadaPage from './PortadaPage'
import { destinoRaiz } from './destinoRaiz'

// Lo que se ve en "/" (desde el 4 oct 2026): con sesion, el Home; sin sesion
// en el navegador, la portada publica; dentro de la app de Android o en la app
// instalada, el login, como antes. Espera a que AuthContext sepa si hay sesion:
// si decidiera antes, un usuario con sesion veria la portada un instante.
// La query se conserva (enlaces viejos a "/" con ?hijo=... siguen funcionando).
export default function EntradaRaiz() {
  const { user, loading } = useAuth()
  const { search } = useLocation()
  if (loading) return null
  const destino = destinoRaiz({ conSesion: !!user })
  if (destino === 'panel') return <Navigate to={`/panel${search}`} replace />
  if (destino === 'login') return <Navigate to={`/login${search}`} replace />
  return <PortadaPage />
}
