import crypto from 'node:crypto'
import { playConfigurado, supabaseServicio, leerSuscripcion, aplicar, PAQUETE } from './_lib/play.js'

// POST /api/play-rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>
//
// Notificaciones en tiempo real de Google Play (Pub/Sub push): renovación,
// cancelación, vencimiento, pausa, suspensión, reembolso. No se confía en el
// tipo de aviso: con el token se vuelve a leer la suscripción en Google y se
// aplica el estado real, igual que en play-verificar.
//
// Pub/Sub reintenta todo lo que no sea 2xx, así que lo que no se puede o no
// hace falta procesar responde 200.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secreto = process.env.GOOGLE_PLAY_RTDN_TOKEN
  if (!secreto || !playConfigurado()) return res.status(503).json({ code: 'play_no_configurado' })

  const recibido = String(req.query?.token ?? '')
  const a = Buffer.from(recibido), b = Buffer.from(secreto)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ code: 'no_autorizado' })

  let aviso
  try {
    aviso = JSON.parse(Buffer.from(req.body?.message?.data ?? '', 'base64').toString('utf8'))
  } catch {
    return res.status(200).json({ ok: true, ignorado: 'cuerpo ilegible' })
  }

  if (aviso?.packageName !== PAQUETE) return res.status(200).json({ ok: true, ignorado: 'otro paquete' })
  if (aviso.testNotification) {
    console.log('[play-rtdn] notificación de prueba recibida')
    return res.status(200).json({ ok: true, prueba: true })
  }

  // Suscripción (renovada, cancelada, vencida, pausada…) o reembolso/anulación.
  const purchaseToken = aviso.subscriptionNotification?.purchaseToken ?? aviso.voidedPurchaseNotification?.purchaseToken
  if (!purchaseToken) return res.status(200).json({ ok: true, ignorado: 'sin token de suscripción' })

  try {
    const db = supabaseServicio()
    const { data: fila } = await db.from('suscripciones_google')
      .select('user_id, product_id').eq('purchase_token', purchaseToken).maybeSingle()

    // Token que todavía no pasó por play-verificar: no se sabe de qué usuario
    // es. Se ignora; la app lo sincroniza al abrirse.
    if (!fila) {
      console.log('[play-rtdn] token sin usuario todavía', { tipo: aviso.subscriptionNotification?.notificationType })
      return res.status(200).json({ ok: true, ignorado: 'token sin usuario' })
    }

    // Reembolso o anulación, o un token que Google ya no devuelve: se queda sin
    // acceso. Si no, manda el estado que Google tiene hoy.
    const anulada = Boolean(aviso.voidedPurchaseNotification)
    const sub = anulada ? null : await leerSuscripcion(purchaseToken)
    const sinAcceso = {
      subscriptionState: anulada ? 'ANULADA' : 'SUBSCRIPTION_STATE_EXPIRED',
      lineItems: [{ productId: fila.product_id, expiryTime: new Date().toISOString() }],
    }
    const r = await aplicar(db, fila.user_id, purchaseToken, sub ?? sinAcceso)
    console.log('[play-rtdn]', { tipo: aviso.subscriptionNotification?.notificationType ?? 'anulada', userId: fila.user_id, estado: r.estado, pro: r.pro })
    return res.status(200).json({ ok: true })
  } catch (err) {
    // 500: Pub/Sub lo reintenta más tarde.
    console.error('[play-rtdn] fallo:', err?.message)
    return res.status(500).json({ code: 'play_error' })
  }
}
