import React, { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useHuella } from '../context/HuellaContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import styles from './NotifBanner.module.css'

const STORAGE_KEY = 'huella_notif_banner_dismissed'

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
      <Bell size={16} className={styles.icon} />
      <p className={styles.texto}>
        Activa recordatorios para no perder el hilo con {nombreHijo}
      </p>
      <div className={styles.btns}>
        <button className={styles.btnActivar} onClick={handleActivar} disabled={loading}>
          {loading ? '…' : 'Activar'}
        </button>
        <button className={styles.btnDismiss} onClick={dismiss} aria-label="Cerrar">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
