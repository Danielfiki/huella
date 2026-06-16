import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/ui/Logo'
import styles from './AuthPage.module.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth()
  // El query param ?redirect=... viaja desde InvitarPage cuando una pareja
  // invitada llega al signup. Necesita preservarse a través del email-
  // confirm y del OAuth de Google para que el partner aterrice de vuelta
  // en /invitar?token=xxx tras autenticarse.
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/panel'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [emailConfirmado, setEmailConfirmado] = useState('')

  async function handleGoogleSignIn() {
    setError('')
    setLoadingGoogle(true)
    try {
      await signInWithGoogle(redirectTo)
      // browser will redirect — component unmounts on success
    } catch {
      setError('No se pudo conectar con Google. Intenta de nuevo.')
      setLoadingGoogle(false)
    }
  }

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
          <Logo className={styles.logoMark} height={56} />
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
            to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
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
        <Logo className={styles.logoMark} height={56} />
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.subtitle}>Empieza a conocer mejor a tu hijo</p>

        <button
          type="button"
          className={styles.btnGoogle}
          onClick={handleGoogleSignIn}
          disabled={loadingGoogle || loading}
        >
          {loadingGoogle
            ? <span className={styles.spinnerDark} />
            : <><GoogleIcon /> Continuar con Google</>}
        </button>

        <div className={styles.separator}><span>o</span></div>

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

          <button type="submit" className={styles.btnPrimary} disabled={loading || loadingGoogle}>
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
