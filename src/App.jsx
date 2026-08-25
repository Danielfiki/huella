import React, { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FamilyProvider } from './context/FamilyContext'
import { HuellaProvider } from './context/HuellaContext'
import ProtectedRoute from './components/ProtectedRoute'
import { supabaseConfigured } from './lib/supabase'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import PanelPage from './pages/panel/PanelPage'
import RegistroPage from './pages/registro/RegistroPage'
import NuevoPage from './pages/nuevo/NuevoPage'
import PatronPage from './pages/patron/PatronPage'
import PatronLecturaPage from './pages/patron/PatronLecturaPage'
import EstrategiasPage from './pages/estrategias/EstrategiasPage'
import EstrategiaNuevaPage from './pages/estrategias/EstrategiaNuevaPage'
import EstrategiaDetailPage from './pages/estrategias/EstrategiaDetailPage'
import EstrategiaCierrePage from './pages/estrategias/EstrategiaCierrePage'
import HistorialPage from './pages/historial/HistorialPage'
import PerfilPage from './pages/perfil/PerfilPage'
import HijoPage from './pages/hijo/HijoPage'
import CerebroPage from './pages/cerebro/CerebroPage'
import TerminosPage from './pages/legal/TerminosPage'
import EliminarCuentaPage from './pages/legal/EliminarCuentaPage'
import InvitarPage from './pages/invitar/InvitarPage'
import CheckinPage from './pages/checkin/CheckinPage'
import CuentaPage from './pages/cuenta/CuentaPage'
import BetaPage from './pages/beta/BetaPage'
import MockupViewer from '../design_handoff_estrategias/mockups/MockupViewer'

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60dvh', padding: '32px',
          textAlign: 'center', gap: '12px',
        }}>
          <div style={{ fontSize: '36px' }}>⚠️</div>
          <h3 style={{ margin: 0, color: '#3a2e28' }}>Esta página tuvo un error</h3>
          <p style={{ color: '#8a7a70', margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            No pudimos cargar esta sección. Tus datos están a salvo.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '10px 22px', background: '#c96f45', color: '#fff',
              border: 'none', borderRadius: '10px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', marginTop: '4px',
            }}
          >
            Reintentar
          </button>
          <a href="/panel" style={{ fontSize: '13px', color: '#8a7a70', textDecoration: 'underline' }}>
            Volver al inicio
          </a>
        </div>
      )
    }
    return this.props.children
  }
}

function PageTracker() {
  const location = useLocation()
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    if (typeof window.plausible === 'function') {
      window.plausible('pageview')
    }
  }, [location.pathname])

  return null
}

function NotFoundPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '65dvh', padding: '32px',
      textAlign: 'center', gap: '14px',
    }}>
      <div style={{ fontSize: '52px' }}>🔍</div>
      <h2 style={{ margin: 0, color: 'var(--color-text)', fontSize: '20px' }}>
        Página no encontrada
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.65, maxWidth: '260px', margin: 0 }}>
        Esta dirección no existe en Huella. Puede que el enlace esté roto o que hayas escrito la URL a mano.
      </p>
      <Link
        to="/panel"
        style={{
          marginTop: '4px', padding: '12px 24px',
          background: 'var(--color-primary)', color: '#fff',
          borderRadius: 'var(--radius-md)', fontWeight: 700,
          fontSize: '14px', textDecoration: 'none',
        }}
      >
        Volver al inicio
      </Link>
    </div>
  )
}

function MissingConfig() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100dvh', padding: '32px',
      fontFamily: 'sans-serif', background: '#fdf6f0', color: '#3a2e28',
      textAlign: 'center', gap: '12px', maxWidth: '400px', margin: '0 auto',
    }}>
      <div style={{ fontSize: '40px' }}>⚙️</div>
      <h2 style={{ margin: 0 }}>Configuración incompleta</h2>
      <p style={{ color: '#8a7a70', margin: 0, lineHeight: 1.6 }}>
        Faltan las variables de entorno de Supabase.<br />
        Agrega <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> en{' '}
        Vercel → Settings → Environment Variables y redeploya.
      </p>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <MissingConfig />

  return (
    <AuthProvider>
      <FamilyProvider>
        <HuellaProvider>
          <BrowserRouter>
            <PageTracker />
            <Routes>
              <Route path="/login"          element={<LoginPage />} />
              <Route path="/signup"         element={<SignupPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terminos"       element={<TerminosPage />} />
              <Route path="/eliminar-cuenta" element={<EliminarCuentaPage />} />
              <Route path="/invitar"  element={<PageErrorBoundary><InvitarPage /></PageErrorBoundary>} />
              <Route path="/mockups"  element={<PageErrorBoundary><MockupViewer /></PageErrorBoundary>} />
              {/* Tablero privado de la beta. Fuera del Layout (sin barra de
                  navegación), detrás de login. Solo se llega escribiendo /beta. */}
              <Route path="/beta"     element={<ProtectedRoute><PageErrorBoundary><BetaPage /></PageErrorBoundary></ProtectedRoute>} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/panel" replace />} />
                <Route path="panel"       element={<PageErrorBoundary><PanelPage /></PageErrorBoundary>} />
                <Route path="nuevo"       element={<PageErrorBoundary><NuevoPage /></PageErrorBoundary>} />
                <Route path="patron"      element={<PageErrorBoundary><PatronPage /></PageErrorBoundary>} />
                <Route path="patron/:id"  element={<PageErrorBoundary><PatronLecturaPage /></PageErrorBoundary>} />
                <Route path="registro"    element={<PageErrorBoundary><RegistroPage /></PageErrorBoundary>} />
                <Route path="estrategias" element={<PageErrorBoundary><EstrategiasPage /></PageErrorBoundary>} />
                <Route path="estrategias/nuevo" element={<PageErrorBoundary><EstrategiaNuevaPage /></PageErrorBoundary>} />
                <Route path="estrategias/:id" element={<PageErrorBoundary><EstrategiaDetailPage /></PageErrorBoundary>} />
                <Route path="estrategias/:id/cierre/:cicloNumero" element={<PageErrorBoundary><EstrategiaCierrePage /></PageErrorBoundary>} />
                {/* B3 · "Logros" dejo de ser una pagina: el album se fusiono con la linea
                    de tiempo (/historial) y las medallas se mudaron a Perfil. La ruta
                    sobrevive como redireccion para no romper links viejos. */}
                {/* B3 · "Logros" dejo de ser una pagina: el album se fusiono con la
                    linea de tiempo (/historial) y las medallas se mudaron a Perfil.
                    La ruta sobrevive como redireccion para no romper links viejos
                    (notificaciones, historial del navegador, PWA instalada). */}
                <Route path="hitos"       element={<Navigate to="/historial" replace />} />
                <Route path="historial"   element={<PageErrorBoundary><HistorialPage /></PageErrorBoundary>} />
                <Route path="perfil"      element={<PageErrorBoundary><PerfilPage /></PageErrorBoundary>} />
                <Route path="hijo"                    element={<PageErrorBoundary><HijoPage /></PageErrorBoundary>} />
                <Route path="cerebro"                 element={<PageErrorBoundary><CerebroPage /></PageErrorBoundary>} />
                <Route path="checkin/:episodioId"  element={<PageErrorBoundary><CheckinPage /></PageErrorBoundary>} />
                <Route path="cuenta"              element={<PageErrorBoundary><CuentaPage /></PageErrorBoundary>} />
                <Route path="*"                    element={<PageErrorBoundary><NotFoundPage /></PageErrorBoundary>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </HuellaProvider>
      </FamilyProvider>
    </AuthProvider>
  )
}
