import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HuellaProvider } from './context/HuellaContext'
import ProtectedRoute from './components/ProtectedRoute'
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

export default function App() {
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
