import React, { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID_WEB, cargarGoogle, crearNonce, entrarConTokenGoogle } from '../../services/googleIdToken'
import styles from './BotonGoogleOficial.module.css'

// Boton oficial de Google (Google Identity Services). Al elegir la cuenta,
// canjea el id token por la sesion de Supabase (signInWithIdToken con nonce);
// quien lo usa navega cuando AuthContext ya tiene al usuario.
//
// Respaldo: si a los 5 s el boton no esta dibujado (el script no cargo, o
// Google no lo dibuja, p. ej. un origen no autorizado), llama a `onRespaldo`
// para que la pantalla muestre el boton antiguo (signInWithOAuth).
const ESPERA_RESPALDO = 5000

// `onEntro` (opcional): avisa que el canje salio bien, para pantallas que no
// navegan solas cuando aparece el usuario (/signup).
export default function BotonGoogleOficial({ onError, onRespaldo, onEntro }) {
  const cajaRef = useRef(null)
  const avisos = useRef({ onError, onRespaldo, onEntro })
  avisos.current = { onError, onRespaldo, onEntro }

  useEffect(() => {
    let vivo = true
    const reloj = setTimeout(() => {
      const iframe = cajaRef.current?.querySelector('iframe')
      if (vivo && !(iframe && iframe.offsetWidth > 0)) avisos.current.onRespaldo()
    }, ESPERA_RESPALDO)
    ;(async () => {
      try {
        const [google, nonce] = await Promise.all([cargarGoogle(), crearNonce()])
        if (!vivo || !cajaRef.current) return
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID_WEB,
          nonce: nonce.hash,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            avisos.current.onError('')
            try {
              await entrarConTokenGoogle(credential, nonce.crudo)
              avisos.current.onEntro?.()
            } catch (e) {
              console.error('[google] signInWithIdToken:', e)
              avisos.current.onError('No se pudo entrar con Google. Intenta de nuevo.')
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
        console.error('[google] carga:', e)
        if (vivo) { clearTimeout(reloj); avisos.current.onRespaldo() }
      }
    })()
    return () => { vivo = false; clearTimeout(reloj) }
  }, [])

  return <div ref={cajaRef} className={styles.boton} />
}
