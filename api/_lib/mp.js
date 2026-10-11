import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────
// Mercado Pago (web) — lo que comparten mp-webhook, mp-verificar-suscripcion
// y mp-suscripcion. Vive en api/_lib: el guion bajo hace que Vercel no lo
// publique como endpoint.
//
// Tabla suscripciones_mp (migración 031): preapproval → usuario, estado en
// Huella ('activa' | 'cancelada' | 'vencida') y hasta cuándo está pagada.
// Una cancelada sigue con Pro hasta `vence`; la apaga el job vencer_pro_mp.
// ──────────────────────────────────────────────────────────────────────

export function supabaseServicio() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// Hasta cuándo está pagada una suscripción, según lo que devuelve Mercado
// Pago en GET /preapproval: la fecha del próximo cobro y, si no viene, el
// último cobro más la frecuencia. null si no se puede saber o ya pasó.
export function venceDe(sub, ahora = Date.now()) {
  const proximo = Date.parse(sub?.next_payment_date ?? '')
  if (Number.isFinite(proximo) && proximo > ahora) return new Date(proximo)
  const ultimo = Date.parse(sub?.summarized?.last_charged_date ?? '')
  const frecuencia = Number(sub?.auto_recurring?.frequency)
  if (!Number.isFinite(ultimo) || !(frecuencia > 0)) return null
  const d = new Date(ultimo)
  const tipo = sub?.auto_recurring?.frequency_type
  if (tipo === 'months') d.setMonth(d.getMonth() + frecuencia)
  else if (tipo === 'days') d.setDate(d.getDate() + frecuencia)
  else return null
  return d.getTime() > ahora ? d : null
}

export async function leerPreapproval(id) {
  const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  const sub = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`preapproval ${r.status}`)
  return sub
}

// La suscripción autorizada (cobrando) de este usuario, o null.
export async function buscarAutorizada(userId) {
  const url = `https://api.mercadopago.com/preapproval/search?external_reference=${encodeURIComponent(userId)}&status=authorized`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`preapproval/search ${r.status}`)
  const resultados = Array.isArray(data.results) ? data.results : []
  return resultados.find((s) => s?.status === 'authorized' && s?.external_reference === userId) ?? null
}

export async function guardarSuscripcion(db, { preapprovalId, userId, estado, vence }) {
  const { error } = await db.from('suscripciones_mp').upsert({
    preapproval_id: preapprovalId,
    user_id: userId,
    estado,
    vence: vence ? vence.toISOString() : null,
    actualizado: new Date().toISOString(),
  }, { onConflict: 'preapproval_id' })
  if (error) throw new Error('suscripciones_mp: ' + error.message)
}

export async function leerFila(db, preapprovalId) {
  const { data, error } = await db.from('suscripciones_mp')
    .select('user_id, estado, vence').eq('preapproval_id', preapprovalId).maybeSingle()
  if (error) throw new Error('suscripciones_mp: ' + error.message)
  return data
}
