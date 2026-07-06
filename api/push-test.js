// ⚠️ ELIMINAR ANTES DE LA BETA — endpoint temporal de prueba de Web Push.
// Envía una notificación fija SIEMPRE a las suscripciones del owner (Daniel),
// nunca a terceros. Dos formas de dispararlo, ambas restringidas:
//
//   GET  /api/push-test?secret=<CRON_SECRET>   ← la vía simple.
//        Abrir la URL en el navegador del PC; el iPhone (PWA) recibe la push.
//        Gated por CRON_SECRET. Lee las suscripciones del owner con service_role
//        (no hay sesión en un GET). El destino está hardcodeado al owner, así
//        que ni con el secreto se puede empujar a otro usuario.
//   POST /api/push-test   con Authorization: Bearer <token de sesión del owner>.
//        Valida getUser + user_id === owner. Lee vía RLS.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const OWNER_ID = '04ddd97a-e674-4e59-8f37-78cb38d46090'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const PAYLOAD = JSON.stringify({
  title: 'Prueba de Huella',
  body: 'Si ves esto, las notificaciones funcionan.',
  url: '/',
})

// Envía la push de prueba a todas las suscripciones del owner usando el
// cliente que se pase (service_role para GET, autenticado para POST).
async function enviarAlOwner(client, res) {
  const { data: subs, error } = await client
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', OWNER_ID)

  if (error) return res.status(500).json({ error: error.message })
  if (!subs?.length)
    return res
      .status(404)
      .json({ error: 'No hay suscripciones. Aprieta "Activar" en la app (iPhone) primero.', sent: 0 })

  let sent = 0
  const errores = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        PAYLOAD
      )
      sent++
    } catch (e) {
      errores.push({ endpoint: sub.endpoint, status: e.statusCode })
      // Suscripción expirada o revocada — limpiar (la tabla real no tiene
      // columna id; se borra por endpoint).
      if (e.statusCode === 410 || e.statusCode === 404) {
        await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }
  return res.json({ sent, total: subs.length, errores })
}

export default async function handler(req, res) {
  // ── GET con secreto: abrir la URL en el PC (la vía simple) ──
  if (req.method === 'GET') {
    if (!process.env.CRON_SECRET)
      return res.status(500).json({ error: 'CRON_SECRET no configurado en Vercel' })
    if (req.query.secret !== process.env.CRON_SECRET)
      return res.status(401).json({ error: 'Secreto invalido' })

    const admin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    return enviarAlOwner(admin, res)
  }

  // ── POST con Bearer del owner: la vía original ──
  if (req.method === 'POST') {
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

    return enviarAlOwner(supabase, res)
  }

  return res.status(405).end()
}
