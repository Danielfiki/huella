import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject    = Deno.env.get('VAPID_SUBJECT') ?? 'https://huella-theta.vercel.app'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const supabase = createClient(supabaseUrl, serviceRoleKey)

Deno.serve(async () => {
  // Cargar todas las suscripciones activas
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500 })
  }

  let sent = 0, failed = 0

  for (const sub of subs ?? []) {
    // Buscar estrategia activa del usuario para este hijo
    let query = supabase
      .from('estrategias')
      .select('habilidad, semana_actual, tareas')
      .eq('user_id', sub.user_id)
      .lte('semana_actual', 4)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
    if (sub.hijo_id) query = query.eq('hijo_id', sub.hijo_id)
    const { data: estrategias } = await query

    const estrategia = estrategias?.[0]
    if (!estrategia) continue

    const semana = String(estrategia.semana_actual)
    const tareasActuales: Array<{ texto: string; completada: boolean }> =
      estrategia.tareas?.[semana] ?? []
    const pendientes = tareasActuales.filter((t) => !t.completada)

    let body: string
    if (pendientes.length > 0) {
      body = pendientes[0].texto
    } else {
      body = `Semana ${estrategia.semana_actual} de "${estrategia.habilidad}" — ¡sigue así!`
    }

    const payload = JSON.stringify({
      title: 'Huella — tarea del día',
      body,
      icon:  '/icons/icon-192x192.png',
      url:   '/estrategias',
    })

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      // 404 / 410 significa suscripción expirada — limpiarla
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
      failed++
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
