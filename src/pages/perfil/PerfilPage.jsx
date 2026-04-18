import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Mail, Baby, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import styles from './PerfilPage.module.css'

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const { state, setHijo } = useHuella()
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [edad, setEdad] = useState('')
  const [loadingHijo, setLoadingHijo] = useState(false)
  const [errorHijo, setErrorHijo] = useState('')
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [loadingSignOut, setLoadingSignOut] = useState(false)

  // Pre-fill cuando ya hay datos del hijo
  useEffect(() => {
    if (state.hijo) {
      setNombre(state.hijo.nombre || '')
      setEdad(state.hijo.edad != null ? String(state.hijo.edad) : '')
    }
  }, [state.hijo])

  async function handleGuardarHijo(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoadingHijo(true)
    setErrorHijo('')
    setGuardadoOk(false)
    try {
      await setHijo({ nombre: nombre.trim(), edad: edad ? Number(edad) : null })
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)
    } catch {
      setErrorHijo('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setLoadingHijo(false)
    }
  }

  async function handleSignOut() {
    setLoadingSignOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch {
      setLoadingSignOut(false)
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.titulo}>Perfil</h2>

      {/* ── Hijo ─────────────────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Baby size={18} color="var(--color-primary)" />
          <h3 className={styles.sectionTitle}>
            {state.hijo ? 'Tu hijo/a' : 'Cuéntanos sobre tu hijo/a'}
          </h3>
        </div>
        {!state.hijo && (
          <p className={styles.sectionDesc}>
            Con el nombre y la edad, Huella personaliza cada orientación.
          </p>
        )}

        <form onSubmit={handleGuardarHijo} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre</label>
            <input
              className={styles.input}
              type="text"
              placeholder="¿Cómo se llama?"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Edad (años)</label>
            <input
              className={styles.input}
              type="number"
              placeholder="Ej: 4"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              min={0}
              max={18}
            />
          </div>

          {errorHijo && <p className={styles.error}>{errorHijo}</p>}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!nombre.trim()}
            loading={loadingHijo}
          >
            {guardadoOk ? (
              <><CheckCircle size={15} /> Guardado</>
            ) : (
              state.hijo ? 'Actualizar' : 'Guardar'
            )}
          </Button>
        </form>
      </Card>

      {/* ── Estadísticas ─────────────────────────────── */}
      <Card className={styles.statsCard}>
        <h3 className={styles.sectionTitle}>Tu actividad</h3>
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

      {/* ── Cuenta ───────────────────────────────────── */}
      <Card className={styles.cuentaCard}>
        <div className={styles.sectionHeader}>
          <User size={18} color="var(--color-text-muted)" />
          <h3 className={styles.sectionTitle}>Cuenta</h3>
        </div>
        <div className={styles.emailRow}>
          <Mail size={14} color="var(--color-text-muted)" />
          <span className={styles.emailText}>{user?.email}</span>
        </div>
      </Card>

      <Button
        variant="secondary"
        fullWidth
        loading={loadingSignOut}
        onClick={handleSignOut}
      >
        <LogOut size={16} />
        Cerrar sesión
      </Button>
    </div>
  )
}
