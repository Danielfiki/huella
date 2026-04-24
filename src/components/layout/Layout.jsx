import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Home, Plus, Target, Star, BookOpen, User } from 'lucide-react'
import Onboarding from '../onboarding/Onboarding'
import NotifBanner from '../NotifBanner'
import { useHuella } from '../../context/HuellaContext'
import CitaLoader from '../ui/CitaLoader'
import styles from './Layout.module.css'

const navItems = [
  { to: '/panel',       icon: Home,     label: 'Inicio' },
  { to: '/historial',   icon: BookOpen, label: 'Historial' },
  { to: '/nuevo',       icon: Plus,     label: 'Registrar', destacado: true },
  { to: '/estrategias', icon: Target,   label: 'Estrategias' },
  { to: '/hitos',       icon: Star,     label: 'Logros' },
]

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
  const { state, dataLoading } = useHuella()
  const [showOnboarding, setShowOnboarding] = useState(true)

  return (
    <div className={styles.container}>
      {dataLoading && <div className={styles.loadingBar} />}
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>huella</span>
          <NavLink to={state.hijo ? '/hijo' : '/perfil'} className={styles.profileBtn}>
            {state.hijo?.avatarUrl
              ? <img src={state.hijo.avatarUrl} alt="Avatar" className={styles.profileAvatar} />
              : <User size={20} />}
          </NavLink>
        </div>
      </header>

      <main className={styles.main}>
        <NotifBanner />
        {dataLoading ? <SkeletonLoader /> : <Outlet />}
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
