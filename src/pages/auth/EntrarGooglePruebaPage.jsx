import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/ui/Logo'
import { GOOGLE_CLIENT_ID_WEB, cargarGoogle, crearNonce, entrarConTokenGoogle } from '../../services/googleIdToken'
import styles from './AuthPage.module.css'
import propios from './EntrarGooglePruebaPage.module.css'

// Prueba del boton oficial de Google (ruta publica, sin enlace en la app). El
// login de /login sigue igual. Al entrar va al mismo destino que /login:
// ?redirect= si viene, o /panel.
export default function EntrarGooglePruebaPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pedido = params.get('redirect')
  const destino = pedido && pedido.startsWith('/') ? pedido : '/panel'
  const cajaRef = useRef(null)
  const [error, setError] = useState('')
  const [entro, setEntro] = useState(false)

  // Navega recien cuando AuthContext ya tiene al usuario: si se navega antes,
  // la ruta protegida lo manda de vuelta a /login.
  useEffect(() => {
    if (entro && user) navigate(destino, { replace: true })
  }, [entro, user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [google, nonce] = await Promise.all([cargarGoogle(), crearNonce()])
        if (!vivo || !cajaRef.current) return
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID_WEB,
          nonce: nonce.hash,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            setError('')
            try {
              await entrarConTokenGoogle(credential, nonce.crudo)
              setEntro(true)
            } catch (e) {
              console.error('[entrar-google] signInWithIdToken:', e)
              setError('No se pudo entrar con Google. Intenta de nuevo.')
            }
          },
        })
        // el boton de Google acepta de 200 a 400 px de ancho
        const ancho = Math.max(200, Math.min(400, Math.floor(cajaRef.current.clientWidth)))
        google.accounts.id.renderButton(cajaRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          locale: 'es-419',
          width: ancho,
        })
      } catch (e) {
        console.error('[entrar-google] carga:', e)
        if (vivo) setError('No se pudo cargar el botón de Google. Revisa tu conexión.')
      }
    })()
    return () => { vivo = false }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Logo className={styles.logoMark} height={56} />
        <h1 className={styles.title}>Entra a Huella</h1>
        <p className={styles.subtitle}>Con tu cuenta de Google</p>

        <div ref={cajaRef} className={propios.boton} />

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.footer}>
          <Link to="/privacidad" className={styles.link}>Política de privacidad</Link>
        </p>
      </div>
    </div>
  )
}
