import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from './AuthPage.module.css'

// ResetPasswordPage — ruta pública /reset-password (hermana de /login y
// /signup, fuera de ProtectedRoute). Tiene dos modos automáticos según
// cómo se llega a la página:
//
//   · Modo SOLICITAR — el usuario llegó tocando "¿Olvidaste tu contraseña?"
//     desde LoginPage. Se le pide su email y se le envía el link.
//
//   · Modo ACTUALIZAR — el usuario llegó haciendo click en el link del
//     email que recibió. La URL trae #access_token=...&type=recovery, que
//     el cliente Supabase auto-procesa al cargar la página. Se le pide
//     contraseña nueva y se la actualizamos con supabase.auth.updateUser.
//
// La detección del modo se hace mirando el hash de la URL al mount. Si
// contiene 'type=recovery', esperamos a que Supabase termine de procesarlo
// (vía onAuthStateChange con evento PASSWORD_RECOVERY) y entramos en
// modo actualizar. Si en 2s no llega la sesión, asumimos que el link
// está expirado o malformado.
export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()

  const tieneHashRecovery = typeof window !== 'undefined'
    && window.location.hash.includes('type=recovery')

  // 'detectando' → cargando mientras Supabase procesa el hash.
  // 'solicitar'  → form para pedir email y enviar el link.
  // 'enviado'    → confirmación "📬 Te enviamos un correo a X".
  // 'actualizar' → form para escribir la contraseña nueva.
  // 'exito'      → contraseña actualizada, invitar a volver a login.
  // 'link_invalido' → el hash venía pero la sesión nunca llegó.
  const [modo, setModo] = useState(tieneHashRecovery ? 'detectando' : 'solicitar')

  // Modo SOLICITAR
  const [email, setEmail] = useState('')
  const [emailEnviado, setEmailEnviado] = useState('')

  // Modo ACTUALIZAR
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Estados compartidos
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Detección del flujo de recovery cuando la URL trae el hash.
  // Nos suscribimos a onAuthStateChange para capturar el evento que
  // dispara Supabase al procesar el hash. Si no llega en 2s, caemos a
  // 'link_invalido'. La suscripción se limpia al desmontar.
  useEffect(() => {
    if (!tieneHashRecovery) return

    let resuelto = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        resuelto = true
        setModo('actualizar')
      }
    })

    // Fallback: si el evento ya disparó antes de que la suscripción
    // quedara activa, la sesión ya está en localStorage.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session && !resuelto) {
        resuelto = true
        setModo('actualizar')
      }
    })

    const timeout = setTimeout(() => {
      if (!resuelto) {
        setModo('link_invalido')
      }
    }, 2000)

    return () => {
      subscription?.unsubscribe?.()
      clearTimeout(timeout)
    }
  }, [tieneHashRecovery])

  async function handleSolicitar(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const emailNorm = email.trim().toLowerCase()
      await resetPassword(emailNorm)
      setEmailEnviado(emailNorm)
      setModo('enviado')
    } catch (err) {
      setError(err.message || 'No se pudo enviar el link. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleActualizar(e) {
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
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr
      // Cerramos la sesión de recovery para que el usuario inicie sesión
      // fresco con la nueva contraseña — flujo limpio sin sesiones colgadas.
      await supabase.auth.signOut()
      setModo('exito')
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (modo === 'detectando') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>huella</div>
          <p className={styles.subtitle} style={{ marginTop: 16 }}>Verificando link…</p>
        </div>
      </div>
    )
  }

  if (modo === 'enviado') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>huella</div>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-surface-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <polyline points="3 7 12 13 21 7" />
            </svg>
          </div>
          <h1 className={styles.title}>Te enviamos un correo</h1>
          <p className={styles.subtitle}>Lo mandamos a</p>
          <p style={{
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '20px',
            wordBreak: 'break-all',
            fontSize: '15px',
          }}>
            {emailEnviado}
          </p>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.65,
            marginBottom: '28px',
          }}>
            Revisa tu bandeja de entrada (y la carpeta spam por si acaso). El link expira en una hora.
          </p>
          <Link
            to="/login"
            className={styles.btnPrimary}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (modo === 'exito') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>huella</div>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="5 12 10 17 19 8" />
            </svg>
          </div>
          <h1 className={styles.title}>Contraseña actualizada</h1>
          <p className={styles.subtitle} style={{ marginBottom: '28px' }}>
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Link
            to="/login"
            className={styles.btnPrimary}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (modo === 'link_invalido') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>huella</div>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--color-surface-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="17 9 12 12 9 10" />
            </svg>
          </div>
          <h1 className={styles.title}>Link inválido o expirado</h1>
          <p className={styles.subtitle} style={{ marginBottom: '28px' }}>
            Este link ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
          </p>
          <Link
            to="/login"
            className={styles.btnPrimary}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  if (modo === 'actualizar') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>huella</div>
          <h1 className={styles.title}>Crea una contraseña nueva</h1>
          <p className={styles.subtitle}>Esta será tu contraseña a partir de ahora.</p>

          <form onSubmit={handleActualizar} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Nueva contraseña</label>
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
                placeholder="Repite la nueva contraseña"
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // modo === 'solicitar' (default)
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>huella</div>
        <h1 className={styles.title}>¿Olvidaste tu contraseña?</h1>
        <p className={styles.subtitle}>Te enviamos un link para recuperarla.</p>

        <form onSubmit={handleSolicitar} className={styles.form}>
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

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Enviar link'}
          </button>
        </form>

        <p className={styles.footer}>
          <Link to="/login" className={styles.link}>Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
