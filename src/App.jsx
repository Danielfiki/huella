import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HuellaProvider } from './context/HuellaContext'
import ProtectedRoute from './components/ProtectedRoute'
import { supabaseConfigured } from './lib/supabase'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import PanelPage from './pages/panel/PanelPage'
import RegistroPage from './pages/registro/RegistroPage'
import EstrategiasPage from './pages/estrategias/EstrategiasPage'
import HitosPage from './pages/hitos/HitosPage'
import HistorialPage from './pages/historial/HistorialPage'
import ParejasPage from './pages/pareja/ParejasPage'
import PerfilPage from './pages/perfil/PerfilPage'

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
      <HuellaProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/panel" replace />} />
              <Route path="panel" element={<PanelPage />} />
              <Route path="registro" element={<RegistroPage />} />
              <Route path="estrategias" element={<EstrategiasPage />} />
              <Route path="hitos" element={<HitosPage />} />
              <Route path="historial" element={<HistorialPage />} />
              <Route path="pareja" element={<ParejasPage />} />
              <Route path="perfil" element={<PerfilPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </HuellaProvider>
    </AuthProvider>
  )
}
