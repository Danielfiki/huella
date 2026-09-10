import React, { useState } from 'react'
import { useHuella } from '../context/HuellaContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import Logo from './ui/Logo'
import styles from './NotifBanner.module.css'

const STORAGE_KEY = 'huella_notif_banner_dismissed'

// Invitacion a activar el aviso diario (pieza 7 · handoff de Design, 9 sep).
//
// Reemplaza el banner celeste, que estaba en un azul ajeno a la paleta. El
// copy tambien cambio: antes decia "Activa recordatorios para no perder el
// hilo con {nombre}" —"no perder el hilo" le cuelga al padre la idea de que
// ya lo esta perdiendo—. Ahora pregunta y ofrece, y dice de entrada las dos
// cosas que al padre le importan antes de dar un permiso: que es UNA vez al
// dia, y que la hora la elige el.
//
// Se muestra solo si el permiso todavia no esta concedido y el padre no lo
// cerro antes. El descarte vive en localStorage, o sea que es por dispositivo.
export default function NotifBanner() {
  const { state } = useHuella()
  const { permission, isSupported, requestPermission } = usePushNotifications()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  )
  const [loading, setLoading] = useState(false)

  if (!isSupported || permission !== 'default' || dismissed) return null

  const nombreHijo = state.hijo?.nombre || 'tu hijo/a'

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  async function handleActivar() {
    setLoading(true)
    const result = await requestPermission()
    setLoading(false)
    if (result !== 'default') dismiss()
  }

  return (
    <div className={styles.banner}>
      <span className={styles.icono} aria-hidden="true">
        <Logo soloSimbolo className={styles.iconoSvg} />
      </span>

      <div>
        <h2 className={styles.titulo}>¿Te aviso una vez al día?</h2>
        <p className={styles.texto}>
          Una pregunta corta sobre {nombreHijo}, a la hora que tú elijas.
        </p>

        <div className={styles.btns}>
          <button
            type="button"
            className={styles.btnActivar}
            onClick={handleActivar}
            disabled={loading}
          >
            {loading ? '…' : 'Activar'}
          </button>
          <button type="button" className={styles.btnDismiss} onClick={dismiss}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
