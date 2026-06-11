import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Webhook de Mercado Pago para Suscripciones (preapproval).
// Maneja el ciclo de vida del plan según el status real de la suscripción:
//   - authorized          → activa plan='pro'  (upsert: crea fila si no existe)
//   - paused | cancelled  → baja plan='free'   (update solo si estaba en 'pro')
//   - pending u otro       → no toca nada (solo loguea)
// Usa el cliente service-role (SUPABASE_SERVICE_ROLE_KEY) para escribir saltando
// RLS, igual que push-remind. Siempre consulta el status EN VIVO con
// GET /preapproval/{id}, así actúa sobre el estado actual aunque los eventos de
// MP lleguen desordenados.

// Valida la firma del header x-signature contra MP_WEBHOOK_SECRET.
// Formato del header: "ts=<timestamp>,v1=<hash>". El manifiesto que MP firma
// es: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con HMAC-SHA256.
// Si el data.id es alfanumérico, MP lo espera en minúsculas.
function validarFirma(req, secret) {
  const signature = req.headers['x-signature']
  const requestId = req.headers['x-request-id']
  if (!signature) return { ok: false, motivo: 'falta header x-signature' }

  // Parseo tolerante de "ts=...,v1=..." (orden y espacios variables).
  let ts, v1
  for (const parte of signature.split(',')) {
    const [clave, valor] = parte.split('=').map((s) => s?.trim())
    if (clave === 'ts') ts = valor
    if (clave === 'v1') v1 = valor
  }
  if (!ts || !v1) return { ok: false, motivo: 'x-signature sin ts o v1' }

  // El data.id del manifiesto viene del query param de la URL de notificación.
  // Fallback al body por si MP solo lo manda ahí.
  const dataIdRaw = req.query?.['data.id'] ?? req.body?.data?.id
  if (!dataIdRaw) return { ok: false, motivo: 'sin data.id para el manifiesto' }
  const dataId = String(dataIdRaw).toLowerCase()

  let manifiesto = `id:${dataId};`
  if (requestId) manifiesto += `request-id:${requestId};`
  manifiesto += `ts:${ts};`

  const esperado = crypto.createHmac('sha256', secret).update(manifiesto).digest('hex')

  // Comparación a tiempo constante; si los largos difieren ya no calza.
  const a = Buffer.from(esperado)
  const b = Buffer.from(v1)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, motivo: 'firma no coincide' }
  }
  return { ok: true }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.MP_WEBHOOK_SECRET
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!secret || !accessToken) {
    console.error('mp-webhook: falta MP_WEBHOOK_SECRET o MP_ACCESS_TOKEN')
    return res.status(500).json({ error: 'Webhook no configurado' })
  }

  // 1. Validar firma antes de tocar nada.
  const firma = validarFirma(req, secret)
  if (!firma.ok) {
    console.error('mp-webhook: firma inválida —', firma.motivo)
    return res.status(401).json({ error: 'Firma inválida' })
  }

  // 2. Leer el cuerpo de la notificación.
  const { type, action, data } = req.body ?? {}
  console.log('mp-webhook: notificación recibida', { type, action, dataId: data?.id })

  // Solo nos interesan las notificaciones de suscripción. Cualquier otra
  // (pagos, planes) la reconocemos con 200 para que MP no reintente.
  if (type !== 'subscription_preapproval') {
    console.log('mp-webhook: tipo ignorado por ahora —', type)
    return res.status(200).json({ ok: true, ignorado: type })
  }

  const preapprovalId = data?.id
  if (!preapprovalId) {
    console.error('mp-webhook: notificación de suscripción sin data.id')
    return res.status(200).json({ ok: true, sinId: true })
  }

  try {
    // 3. Consultar el estado real de la suscripción en MP.
    const resp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const sub = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      console.error('mp-webhook: error consultando preapproval', preapprovalId, sub)
      // 200 igual: que MP no reintente en loop por un problema de lectura puntual.
      return res.status(200).json({ ok: true, consultaFallida: true })
    }

    const status = sub.status
    const externalReference = sub.external_reference
    console.log('mp-webhook: suscripción', { preapprovalId, status, externalReference })

    // 4. Decidir la rama según el status real. Solo 'authorized' activa;
    //    'paused'/'cancelled' bajan el plan; el resto (pending, etc.) no toca.
    const ACTIVAR = status === 'authorized'
    const BAJAR = status === 'paused' || status === 'cancelled'

    if (!ACTIVAR && !BAJAR) {
      console.log('mp-webhook: status sin acción —', status)
      return res.status(200).json({ ok: true, status })
    }
    if (!externalReference) {
      console.error('mp-webhook: suscripción sin external_reference', preapprovalId, '— status', status)
      return res.status(200).json({ ok: true, sinExternalReference: true })
    }

    // Cliente service-role (salta RLS) para activar o bajar el plan.
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 5a. DOWNGRADE: 'paused'/'cancelled' → 'free'. Usamos UPDATE (no upsert):
    // si no existe fila, no hay Pro que bajar (free es la ausencia de Pro). El
    // filtro plan='pro' protege a admin y deja intactos a free/null; 0 filas
    // afectadas es resultado VÁLIDO (no había Pro que bajar, o era admin/free).
    if (BAJAR) {
      const { data: filas, error } = await supabase
        .from('perfiles')
        .update({ plan: 'free' })
        .eq('user_id', externalReference)
        .eq('plan', 'pro')
        .select()

      if (error) {
        console.error('mp-webhook: error bajando plan en perfiles', externalReference, error)
        // 200 para no entrar en loop; el log deja el rastro para diagnosticar.
        return res.status(200).json({ ok: true, downgradeFallido: true })
      }

      const filasAfectadas = filas?.length ?? 0
      console.log('mp-webhook: plan bajado a free para', externalReference, '— status', status, '— filas afectadas:', filasAfectadas)
      return res.status(200).json({ ok: true, bajado: true, status, filasAfectadas })
    }

    // 5b. ACTIVAR el plan a 'pro'. Usamos UPSERT (no UPDATE) con el mismo
    // onConflict: 'user_id' que ocupa savePadreNombre en HuellaContext: si el
    // usuario ya tiene fila, le actualiza plan='pro'; si todavía no la tiene
    // (pagó antes de guardar su nombre), la crea con plan='pro' y nombre null
    // (el usuario lo completa después). Un UPDATE plano fallaba en silencio
    // (0 filas) en ese caso.
    const { data: filas, error } = await supabase
      .from('perfiles')
      .upsert({ user_id: externalReference, plan: 'pro' }, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('mp-webhook: error activando plan en perfiles', externalReference, error)
      // 200 para no entrar en loop; el log deja el rastro para diagnosticar.
      return res.status(200).json({ ok: true, upsertFallido: true })
    }

    // Cuántas filas tocó el upsert: ayuda al QA a leer los logs de Vercel.
    const filasAfectadas = filas?.length ?? 0
    console.log('mp-webhook: plan activado a pro para', externalReference, '— filas afectadas:', filasAfectadas)
    return res.status(200).json({ ok: true, activado: true, filasAfectadas })
  } catch (err) {
    console.error('mp-webhook handler error:', err)
    return res.status(200).json({ ok: true, error: true })
  }
}
