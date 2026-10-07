import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────
// Google Play Billing (app de Android) — lo que comparten play-verificar y
// play-rtdn. El archivo vive en api/_lib: el guion bajo hace que Vercel no lo
// publique como endpoint.
//
// Fuente de verdad: Google Play Developer API (purchases.subscriptionsv2). El
// cliente solo manda el purchaseToken; el estado, el producto y el vencimiento
// se leen siempre de Google.
//
// Variables de entorno (sin ellas todo queda apagado y responde sin error):
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  el JSON completo de la cuenta de servicio
//   GOOGLE_PLAY_RTDN_TOKEN            secreto de la URL de push de Pub/Sub
//   SUPABASE_SERVICE_ROLE_KEY         (ya existe, la usa mp-webhook)
// ──────────────────────────────────────────────────────────────────────

export const PAQUETE = 'lat.huella.app'
export const PRODUCTOS = ['huella_pro_mensual', 'huella_pro_anual']

// Estados de subscriptionsv2 que dan acceso. CANCELED = el usuario apagó la
// renovación pero sigue pagado hasta expiryTime; por eso se mira también la fecha.
const CON_ACCESO = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
])

export function cuentaDeServicio() {
  const crudo = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!crudo) return null
  try {
    const c = JSON.parse(crudo)
    return c.client_email && c.private_key ? c : null
  } catch {
    console.error('[play] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON no es un JSON válido')
    return null
  }
}

export function playConfigurado() {
  return Boolean(cuentaDeServicio() && process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function supabaseServicio() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

// Token de acceso OAuth con la cuenta de servicio (JWT firmado RS256). Se
// guarda en memoria mientras la función siga caliente.
let tokenGoogle = null
async function accesoGoogle() {
  if (tokenGoogle && tokenGoogle.vence > Date.now() + 60000) return tokenGoogle.valor
  const cuenta = cuentaDeServicio()
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const ahora = Math.floor(Date.now() / 1000)
  const cuerpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: cuenta.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  })}`
  const firma = crypto.createSign('RSA-SHA256').update(cuerpo).sign(cuenta.private_key, 'base64url')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cuerpo}.${firma}`,
    }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.access_token) throw new Error(`oauth ${r.status} ${j.error || ''}`)
  tokenGoogle = { valor: j.access_token, vence: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return tokenGoogle.valor
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PAQUETE}/purchases`

// Lee la suscripción en Google. El paquete va en la URL: un token de otra app
// no existe para lat.huella.app y Google responde 404/400 → null.
export async function leerSuscripcion(purchaseToken) {
  const r = await fetch(`${BASE}/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { authorization: `Bearer ${await accesoGoogle()}` },
  })
  if (r.status === 404 || r.status === 400 || r.status === 410) return null
  if (!r.ok) throw new Error(`subscriptionsv2 ${r.status}`)
  return r.json()
}

// Sin acknowledge, Google reembolsa y revoca la compra a los 3 días.
async function reconocer(productId, purchaseToken) {
  const r = await fetch(
    `${BASE}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    { method: 'POST', headers: { authorization: `Bearer ${await accesoGoogle()}`, 'content-type': 'application/json' }, body: '{}' },
  )
  if (!r.ok) throw new Error(`acknowledge ${r.status}`)
}

// Resume lo que importa de la respuesta de Google.
export function resumir(sub) {
  const item = (sub?.lineItems ?? []).find((l) => PRODUCTOS.includes(l.productId))
  const vence = item?.expiryTime ? new Date(item.expiryTime) : null
  const estado = sub?.subscriptionState ?? 'DESCONOCIDO'
  return {
    productId: item?.productId ?? null,
    estado,
    vence,
    renovacion: item?.autoRenewingPlan?.autoRenewEnabled ?? null,
    conAcceso: Boolean(item && CON_ACCESO.has(estado) && vence && vence > new Date()),
    porReconocer: sub?.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING',
    tokenAnterior: sub?.linkedPurchaseToken ?? null,
  }
}

// Aplica el estado de Google a Huella: guarda token → usuario, reconoce la
// compra si hace falta y deja el plan igual que Mercado Pago (plan='pro' o, al
// perder el acceso, 'free' solo si estaba en 'pro', así admin no se toca).
export async function aplicar(db, userId, purchaseToken, sub) {
  const s = resumir(sub)
  if (!s.productId) return { ...s, pro: false }

  if (s.porReconocer && (s.estado === 'SUBSCRIPTION_STATE_ACTIVE' || s.estado === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD')) {
    await reconocer(s.productId, purchaseToken)
  }

  const { error: e1 } = await db.from('suscripciones_google').upsert({
    purchase_token: purchaseToken,
    user_id: userId,
    product_id: s.productId,
    estado: s.estado,
    vence: s.vence?.toISOString() ?? null,
    renovacion_automatica: s.renovacion,
    token_anterior: s.tokenAnterior,
    actualizado: new Date().toISOString(),
  }, { onConflict: 'purchase_token' })
  if (e1) throw new Error('suscripciones_google: ' + e1.message)

  if (s.conAcceso) {
    const { error } = await db.from('perfiles').upsert({ user_id: userId, plan: 'pro' }, { onConflict: 'user_id' })
    if (error) throw new Error('perfiles pro: ' + error.message)
  } else {
    // Solo se baja si no le queda otra suscripción de Google con acceso.
    const { data: otras } = await db.from('suscripciones_google')
      .select('purchase_token').eq('user_id', userId).neq('purchase_token', purchaseToken)
      .in('estado', [...CON_ACCESO]).gt('vence', new Date().toISOString())
    if (!otras?.length) {
      const { error } = await db.from('perfiles').update({ plan: 'free' }).eq('user_id', userId).eq('plan', 'pro')
      if (error) throw new Error('perfiles free: ' + error.message)
    }
  }
  return { ...s, pro: s.conAcceso }
}
