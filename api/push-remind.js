import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  // Vercel cron sends Authorization: Bearer {CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')

  if (!subs?.length) return res.json({ sent: 0, total: 0 })

  const now = new Date()
  let sent = 0

  for (const sub of subs) {
    const userId = sub.user_id

    // Fetch last 7 days of episodes for this user
    const cutoff7d = new Date(now.getTime() - 7 * 864e5).toISOString()
    const [{ data: episodios }, { data: estrategias }, { data: hijo }] =
      await Promise.all([
        supabase
          .from('episodios')
          .select('id, fecha, intensidad')
          .eq('user_id', userId)
          .gte('fecha', cutoff7d)
          .order('fecha', { ascending: false })
          .limit(20),
        supabase
          .from('estrategias')
          .select('habilidad, semana_actual')
          .eq('user_id', userId)
          .lt('semana_actual', 4)
          .limit(1),
        supabase
          .from('hijos')
          .select('nombre')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

    const nombreHijo = hijo?.nombre || 'tu hijo/a'
    const lastEp = episodios?.[0]

    let notification = null

    // 1. Sin registro en 3+ días (solo si alguna vez registraron)
    if (lastEp) {
      const daysSince = Math.floor((now - new Date(lastEp.fecha)) / 864e5)
      if (daysSince >= 3) {
        notification = {
          title: 'Huella 📋',
          body: `Llevas ${daysSince} días sin registrar. ¿Cómo ha estado ${nombreHijo}?`,
          url: '/registro',
        }
      }
    }

    // 2. Episodio difícil hace 20-48h → check-in al día siguiente
    if (!notification) {
      const hardEp = episodios?.find((e) => {
        const hoursAgo = (now - new Date(e.fecha)) / 3600000
        return e.intensidad >= 4 && hoursAgo >= 20 && hoursAgo <= 48
      })
      if (hardEp) {
        notification = {
          title: 'Huella 💙',
          body: `Ayer fue un día difícil con ${nombreHijo}. ¿Cómo estás tú hoy?`,
          url: `/checkin/${hardEp.id}`,
        }
      }
    }

    // 3. Estrategia activa (solo de lunes a viernes)
    if (!notification && estrategias?.length) {
      const dayOfWeek = now.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        notification = {
          title: 'Huella 🌱',
          body: `Tu plan "${estrategias[0].habilidad}" sigue activo. ¿Revisaste las tareas de esta semana?`,
          url: '/estrategias',
        }
      }
    }

    if (!notification) continue

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(notification)
      )
      sent++
    } catch (e) {
      // Suscripción expirada o revocada — limpiar
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return res.json({ sent, total: subs.length })
}
