import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Home, Plus, Target, Star, BookOpen, User } from 'lucide-react'
import Onboarding, { shouldShowOnboarding } from '../onboarding/Onboarding'
import styles from './Layout.module.css'

const navItems = [
  { to: '/panel', icon: Home, label: 'Inicio' },
  { to: '/registro', icon: Plus, label: 'Registrar' },
  { to: '/estrategias', icon: Target, label: 'Estrategias' },
  { to: '/hitos', icon: Star, label: 'Hitos' },
  { to: '/historial', icon: BookOpen, label: 'Historial' },
]

export default function Layout() {
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding())

  return (
    <div className={styles.container}>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>huella</span>
          <NavLink to="/perfil" className={styles.profileBtn}>
            <User size={20} />
          </NavLink>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav}>
        {navItems.map(({ to, icon: Icon, label }) => (
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
        ))}
      </nav>
    </div>
  )
}
