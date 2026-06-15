import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Plus, Target, Star, BookOpen, User } from 'lucide-react'
import Onboarding from '../../pages/onboarding/Onboarding'
import Logo from '../ui/Logo'
import { persistirPerfilOnboarding, marcarOnboardingVisto } from '../../services/onboardingPersistor'
import NotifBanner from '../NotifBanner'
import { useHuella } from '../../context/HuellaContext'
import { useFamily } from '../../context/FamilyContext'
import CitaLoader from '../ui/CitaLoader'
import styles from './Layout.module.css'

const navItems = [
  { to: '/panel',       icon: Home,     label: 'Inicio' },
  { to: '/historial',   icon: BookOpen, label: 'Historial' },
  { to: '/nuevo',       icon: Plus,     label: 'Registrar', destacado: true },
  { to: '/estrategias', icon: Target,   label: 'Estrategias' },
  { to: '/hitos',       icon: Star,     label: 'Logros' },
]

const NAV_PATHS = navItems.map((n) => n.to)

function getNavIndex(pathname) {
  return NAV_PATHS.findIndex((p) => pathname.startsWith(p))
}

function PageTransition({ children, direction }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  let animClass = ''
  if (ready) {
    if (direction === 'forward')   animClass = styles.pageSlideRight
    else if (direction === 'backward') animClass = styles.pageSlideLeft
    else                           animClass = styles.pageVisible
  }

  return (
    <div className={`${styles.pageWrap}${animClass ? ` ${animClass}` : ''}`}>
      {children}
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className={styles.skeletonPage}>
      <CitaLoader categoria="general" />
      <div className={styles.skeletonCard} style={{ height: 80 }} />
      <div className={styles.skeletonCard} style={{ height: 120 }} />
      <div className={styles.skeletonCard} style={{ height: 60 }} />
    </div>
  )
}

export default function Layout() {
  const { state, dataLoading, reloadData } = useHuella()
  const { family, familyLoading } = useFamily()
  // Onboarding visible solo si el usuario no lo completó (localStorage,
  // persiste para siempre en el dispositivo) Y tampoco lo saltó en esta
  // sesión (sessionStorage, vuelve a aparecer al cerrar el tab).
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (localStorage.getItem('onboarding_done')) return false
    if (sessionStorage.getItem('huella.onboarding.dismissed')) return false
    return true
  })

  // Defensa contra el bug de modo parejas. Si el usuario es partner de una
  // familia existente, no debe ver el onboarding de creación de hijo nuevo.
  // FamilyContext puede tardar en cargar; cuando termina y resulta ser
  // partner, cerramos el state. El render además se gatea con familyLoading
  // para evitar que el onboarding aparezca brevemente antes de que sepamos
  // el rol del usuario.
  useEffect(() => {
    if (family?.role && family.role !== 'owner') {
      setShowOnboarding(false)
    }
  }, [family?.role])

  const location = useLocation()

  const prevIndexRef = useRef(null)
  const currentIndex = getNavIndex(location.pathname)
  const prevIndex = prevIndexRef.current
  prevIndexRef.current = currentIndex

  let direction = 'none'
  if (prevIndex !== null && prevIndex !== -1 && currentIndex !== -1 && prevIndex !== currentIndex) {
    direction = currentIndex > prevIndex ? 'forward' : 'backward'
  }

  return (
    <div className={styles.container}>
      {dataLoading && <div className={styles.loadingBar} />}
      {!familyLoading && showOnboarding && (!family || family.role === 'owner') && (
        <Onboarding
          onComplete={async (perfil) => {
            try {
              await persistirPerfilOnboarding(perfil)
              // El perfil y el hijo ya quedaron en la base, pero el contexto
              // sigue con los datos viejos de antes del onboarding. Recargamos
              // para que el Home muestre tu nombre y el del hijo recién creados
              // sin necesidad de un refresh manual.
              reloadData()
            } catch (err) {
              // Si el guardado falla (red o RPC caída) NO marcamos
              // onboarding_done ni cerramos: re-lanzamos para que el slide
              // final avise y deje reintentar, en vez de dejar al usuario sin
              // perfil ni hijo guardados y sin volver a ver el onboarding.
              console.error('[Layout] persistirPerfilOnboarding falló:', err)
              throw err
            }
            localStorage.setItem('onboarding_done', '1')
            setShowOnboarding(false)
          }}
          onSkip={() => {
            marcarOnboardingVisto()
            setShowOnboarding(false)
          }}
        />
      )}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Logo className={styles.logo} height={32} />
          <NavLink to={state.hijo ? '/hijo' : '/perfil'} className={styles.profileBtn}>
            {state.hijo?.avatarUrl
              ? <img src={state.hijo.avatarUrl} alt="Avatar" className={styles.profileAvatar} />
              : <User size={20} />}
          </NavLink>
        </div>
      </header>

      <main className={styles.main}>
        <NotifBanner />
        {dataLoading ? <SkeletonLoader /> : (
          <PageTransition key={location.key} direction={direction}>
            <Outlet />
          </PageTransition>
        )}
      </main>

      <nav className={styles.bottomNav}>
        {navItems.map(({ to, icon: Icon, label, destacado }) =>
          destacado ? (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `${styles.navRegistrar} ${isActive ? styles.navRegistrarActive : ''}`
            }>
              <div className={styles.navRegistrarBtn}>
                <Icon size={22} />
              </div>
              <span className={styles.navRegistrarLabel}>{label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          )
        )}
      </nav>
    </div>
  )
}
