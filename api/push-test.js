// ⚠️ ELIMINAR ANTES DE LA BETA — endpoint temporal de prueba de Web Push.
// Dispara una notificación fija a las suscripciones del PROPIO usuario
// autenticado. Doble candado de seguridad:
//   (1) Bearer token de sesión válido (getUser), igual que push-subscribe.
//   (2) Solo el user_id del owner (Daniel) puede dispararlo.
// Lee las suscripciones con el cliente autenticado (RLS own_data), así que
// físicamente no puede tocar las de otro usuario. No requiere service_role.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const OWNER_ID = '04ddd97a-e674-4e59-8f37-78cb38d46090'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  if (user.id !== OWNER_ID) return res.status(403).json({ error: 'Forbidden' })

  // RLS own_data restringe estas filas al propio usuario.
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (error) return res.status(500).json({ error: error.message })
  if (!subs?.length)
    return res.status(404).json({ error: 'No tienes suscripciones. Aprieta "Activar" en la app primero.', sent: 0 })

  const payload = JSON.stringify({
    title: 'Prueba de Huella',
    body: 'Si ves esto, las notificaciones funcionan.',
    url: '/',
  })

  let sent = 0
  const errores = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (e) {
      errores.push({ id: sub.id, status: e.statusCode })
      // Suscripción expirada o revocada — limpiar.
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return res.json({ sent, total: subs.length, errores })
}
