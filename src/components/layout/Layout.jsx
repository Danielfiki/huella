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
  const { state, dataLoading, dataLoaded, reloadData } = useHuella()
  const { family, familyLoading } = useFamily()

  // Fuente de verdad del onboarding: los DATOS DE LA CUENTA, no localStorage.
  // Un usuario que ya tiene un hijo creado (el onboarding siempre crea uno) o
  // el nombre de perfil poblado NO es nuevo → nunca ve el onboarding, aunque
  // el storage del dispositivo se haya borrado (eviction de iOS, reinstalar la
  // PWA, etc.). Solo lo ve quien de verdad no tiene cuenta armada todavía.
  const yaTieneCuenta =
    state.hijos.length > 0 || (state.padreNombre || '').trim() !== ''

  // Latch local de cierre inmediato. NO decide quién es nuevo (eso lo hace
  // `yaTieneCuenta`); solo silencia el onboarding apenas el usuario actúa:
  //  - al saltarlo (sessionStorage: vuelve en una sesión nueva si sigue sin
  //    datos, igual que antes);
  //  - al completarlo, para puentear el instante entre el guardado y que
  //    `reloadData` traiga el hijo recién creado (si no, reaparecería un frame).
  const [onboardingCerrado, setOnboardingCerrado] = useState(
    () => !!sessionStorage.getItem('huella.onboarding.dismissed')
  )

  // Solo decidimos DESPUÉS de cargar la cuenta (`dataLoaded`): antes no sabemos
  // si tiene hijo y no debemos mostrarlo "por defecto". La guarda de modo
  // pareja (`role === 'owner'`) se conserva en la propia condición.
  const showOnboarding =
    dataLoaded &&
    !yaTieneCuenta &&
    !onboardingCerrado &&
    (!family || family.role === 'owner')

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
              // Si el guardado falla (red o RPC caída) NO cerramos: re-lanzamos
              // para que el slide final avise y deje reintentar, en vez de dejar
              // al usuario sin perfil ni hijo guardados. El hijo no quedó creado,
              // así que `yaTieneCuenta` sigue false y el onboarding persiste.
              console.error('[Layout] persistirPerfilOnboarding falló:', err)
              throw err
            }
            // Cierre inmediato mientras `reloadData` trae el hijo recién creado.
            // Tras el reload, `hijos.length > 0` lo mantiene cerrado para siempre,
            // sin importar el storage del dispositivo.
            setOnboardingCerrado(true)
          }}
          onSkip={() => {
            marcarOnboardingVisto()
            setOnboardingCerrado(true)
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
