import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import styles from './PerfilPage.module.css'

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const { state } = useHuella()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    try {
      await signOut()
      navigate('/login')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.titulo}>Perfil</h2>

      <Card className={styles.userCard}>
        <div className={styles.avatar}>
          <User size={32} color="var(--color-primary)" />
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userEmail}>
            <Mail size={14} />
            <span>{user?.email}</span>
          </div>
          {state.hijo && (
            <p className={styles.hijoNombre}>
              Hijo: <strong>{state.hijo.nombre}</strong>
              {state.hijo.edad ? `, ${state.hijo.edad} años` : ''}
            </p>
          )}
        </div>
      </Card>

      <Card className={styles.statsCard}>
        <h3 className={styles.statsTitle}>Tu actividad</h3>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{state.episodios.length}</span>
            <span className={styles.statLabel}>Episodios</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{state.hitos.length}</span>
            <span className={styles.statLabel}>Hitos</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{state.estrategias.length}</span>
            <span className={styles.statLabel}>Estrategias</span>
          </div>
        </div>
      </Card>

      <Button
        variant="secondary"
        fullWidth
        loading={loading}
        onClick={handleSignOut}
      >
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  )
}
