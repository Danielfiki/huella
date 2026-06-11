import { createClient } from '@supabase/supabase-js'

// Red de seguridad del pago (Paso 3) — RESPALDO del webhook.
// Cuando el usuario vuelve del checkout a /cuenta?suscripcion=ok, la app llama
// a este endpoint. Consultamos a Mercado Pago el estado REAL de la suscripción
// del usuario (por external_reference = user.id) y, si hay una 'authorized',
// activamos plan='pro'. Así ningún pago aprobado queda sin Pro aunque el
// webhook (la vía rápida) falle o no llegue.
//
// Doble vía: webhook (rápido) + esta verificación al volver (respaldo).
// Es IDEMPOTENTE: si el webhook ya activó el plan, el upsert deja plan='pro'
// igual, sin efecto raro. NO toca cobros reales: usa el MP_ACCESS_TOKEN que
// haya configurado Vercel (hoy, de prueba).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    console.error('mp-verificar-suscripcion: falta MP_ACCESS_TOKEN')
    return res.status(500).json({ error: 'Pasarela de pago no configurada' })
  }

  // Autenticamos al usuario con su token de Supabase (mismo patrón que
  // mp-crear-suscripcion): anon key + Bearer del header → Supabase resuelve
  // quién es. El user.id sale del token verificado, NUNCA del body: así un
  // usuario no puede pedir que se le active el plan a otro.
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

  console.log('mp-verificar-suscripcion: verificación pedida', { userId: user.id })

  try {
    // Buscamos las suscripciones autorizadas de ESTE usuario. external_reference
    // = user.id se mandó al crear el preapproval (mp-crear-suscripcion). El
    // endpoint /preapproval/search filtra por external_reference y status, y
    // devuelve { paging, results: [...] } con los mismos campos que el GET por
    // id que usa el webhook (id, status, external_reference).
    const url = `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(user.id)}&status=authorized`
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      console.error('mp-verificar-suscripcion: error consultando MP', user.id, data)
      return res.status(502).json({ error: 'No se pudo verificar la suscripción' })
    }

    const resultados = Array.isArray(data.results) ? data.results : []
    // Chequeo defensivo: no confiamos sólo en el filtro de MP. Confirmamos que
    // haya una suscripción 'authorized' cuyo external_reference sea exactamente
    // este usuario antes de activar.
    const autorizada = resultados.find(
      (s) => s?.status === 'authorized' && s?.external_reference === user.id
    )
    console.log('mp-verificar-suscripcion: resultado consulta', {
      userId: user.id,
      total: resultados.length,
      autorizada: Boolean(autorizada),
    })

    if (!autorizada) {
      // Todavía no hay suscripción autorizada (el pago aún no se procesa, o el
      // usuario llegó sin pagar). No tocamos nada; el frontend reintenta.
      return res.status(200).json({ pro: false })
    }

    // Activar el plan a 'pro' con el cliente service-role (salta RLS). MISMO
    // patrón que el webhook: UPSERT con onConflict 'user_id' — si el usuario ya
    // tiene fila la actualiza, si no (pagó antes de guardar su nombre) la crea
    // con plan='pro' y nombre null. Idempotente: si el webhook ya lo activó,
    // esto deja plan='pro' igual.
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: filas, error } = await supabaseAdmin
      .from('perfiles')
      .upsert({ user_id: user.id, plan: 'pro' }, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('mp-verificar-suscripcion: error activando plan en perfiles', user.id, error)
      return res.status(500).json({ error: 'No se pudo activar el plan' })
    }

    const filasAfectadas = filas?.length ?? 0
    console.log('mp-verificar-suscripcion: plan activado a pro para', user.id, '— filas afectadas:', filasAfectadas)
    return res.status(200).json({ pro: true })
  } catch (err) {
    console.error('mp-verificar-suscripcion handler error:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
}
