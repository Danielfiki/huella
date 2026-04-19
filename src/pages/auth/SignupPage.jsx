import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AuthPage.module.css'

export default function SignupPage() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailConfirmado, setEmailConfirmado] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await signUp(email, password)
      setEmailConfirmado(email)
    } catch (err) {
      setError(err.message === 'User already registered'
        ? 'Ya existe una cuenta con ese email'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  if (emailConfirmado) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>huella</div>
          <div style={{ fontSize: '52px', margin: '8px 0 20px' }}>📬</div>
          <h1 className={styles.title}>Revisa tu correo</h1>
          <p className={styles.subtitle}>
            Te enviamos un enlace de confirmación a
          </p>
          <p style={{
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '20px',
            wordBreak: 'break-all',
            fontSize: '15px',
          }}>
            {emailConfirmado}
          </p>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.65,
            marginBottom: '28px',
          }}>
            Haz clic en el enlace del correo para activar tu cuenta. Luego vuelve aquí e inicia sesión normalmente.
          </p>
          <Link
            to="/login"
            className={styles.btnPrimary}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Ir a iniciar sesión
          </Link>
          <p className={styles.footer}>
            ¿No llegó el correo? Revisa la carpeta de spam o{' '}
            <button
              className={styles.link}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
              onClick={() => setEmailConfirmado('')}
            >
              intenta de nuevo
            </button>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>huella</div>
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.subtitle}>Empieza a conocer mejor a tu hijo</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirmar contraseña</label>
            <input
              type="password"
              className={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Crear cuenta'}
          </button>

          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Al crear una cuenta aceptas nuestros{' '}
            <Link to="/terminos" className={styles.link} style={{ fontSize: '12px' }}>
              Términos de uso y Política de privacidad
            </Link>.
          </p>
        </form>

        <p className={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className={styles.link}>Ingresar</Link>
        </p>
      </div>
    </div>
  )
}
