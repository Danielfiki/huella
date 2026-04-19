import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Home, Plus, Target, Star, BookOpen, User } from 'lucide-react'
import Onboarding, { shouldShowOnboarding } from '../onboarding/Onboarding'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import styles from './Layout.module.css'

const navItems = [
  { to: '/panel',       icon: Home,     label: 'Inicio' },
  { to: '/registro',    icon: Plus,     label: 'Registrar', destacado: true },
  { to: '/estrategias', icon: Target,   label: 'Estrategias' },
  { to: '/hitos',       icon: Star,     label: 'Logros' },
  { to: '/historial',   icon: BookOpen, label: 'Historial' },
]

function SkeletonLoader() {
  return (
    <div className={styles.skeletonPage}>
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonCard} style={{ height: 80 }} />
      <div className={styles.skeletonCard} style={{ height: 120 }} />
      <div className={styles.skeletonCard} style={{ height: 60 }} />
    </div>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const { dataLoading } = useHuella()
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding(user?.id))

  return (
    <div className={styles.container}>
      {dataLoading && <div className={styles.loadingBar} />}
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} userId={user?.id} />}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>huella</span>
          <NavLink to="/perfil" className={styles.profileBtn}>
            {state.hijo?.avatarUrl
              ? <img src={state.hijo.avatarUrl} alt="Avatar" className={styles.profileAvatar} />
              : <User size={20} />}
          </NavLink>
        </div>
      </header>

      <main className={styles.main}>
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
