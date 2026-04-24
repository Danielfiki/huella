import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const isSupported =
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [isSupported])

  // Si el permiso ya estaba concedido (sesión anterior), re-suscribir silenciosamente
  // para asegurar que la suscripción está guardada en la DB.
  useEffect(() => {
    if (!isSupported || Notification.permission !== 'granted' || !VAPID_PUBLIC_KEY) return
    saveSubscription()
  }, [isSupported])

  async function saveSubscription() {
    if (!VAPID_PUBLIC_KEY) return
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))
      const json = sub.toJSON()
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        }),
      })
    } catch (e) {
      console.error('Push subscription error:', e)
    }
  }

  async function requestPermission() {
    if (!isSupported) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') await saveSubscription()
    return result
  }

  return { permission, isSupported, requestPermission }
}
