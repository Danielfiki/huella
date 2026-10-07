import { createClient } from '@supabase/supabase-js'
import { playConfigurado, supabaseServicio, leerSuscripcion, aplicar, PRODUCTOS } from './_lib/play.js'

// POST /api/play-verificar  { purchaseToken }  + Authorization: Bearer <sesión>
//
// Lo llama la app de Android después de comprar con Google Play y al abrirse
// (restaurar compras). Verifica el token en Google, lo reconoce (acknowledge),
// guarda token → usuario y activa o baja el mismo Pro que usa Mercado Pago.
//
// Respuestas: 200 { pro, productId, vence } · 401 sin sesión · 404 token que no
// es de lat.huella.app · 409 token de otro usuario · 503 Play sin configurar.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Apagado mientras falten las variables: la app sigue como si no hubiera
  // compra que sincronizar y lo vuelve a intentar en la próxima apertura.
  if (!playConfigurado()) return res.status(503).json({ code: 'play_no_configurado' })

  const purchaseToken = typeof req.body?.purchaseToken === 'string' ? req.body.purchaseToken.trim() : ''
  if (!purchaseToken || purchaseToken.length > 1000) return res.status(400).json({ code: 'token_invalido' })

  const sesion = req.headers.authorization?.replace('Bearer ', '')
  const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data: u } = await anon.auth.getUser(sesion || undefined).catch(() => ({ data: null }))
  const userId = u?.user?.id
  if (!userId) return res.status(401).json({ code: 'sin_sesion' })

  try {
    const db = supabaseServicio()

    // Un token queda atado al primer usuario que lo presentó: otra cuenta no
    // puede reclamar la compra de alguien más.
    const { data: fila, error: eLeer } = await db.from('suscripciones_google')
      .select('user_id').eq('purchase_token', purchaseToken).maybeSingle()
    if (eLeer) throw new Error('suscripciones_google: ' + eLeer.message)
    if (fila && fila.user_id !== userId) {
      console.warn('[play-verificar] token de otro usuario', { userId })
      return res.status(409).json({ code: 'token_de_otro_usuario' })
    }

    const sub = await leerSuscripcion(purchaseToken)
    if (!sub || !(sub.lineItems ?? []).some((l) => PRODUCTOS.includes(l.productId))) {
      return res.status(404).json({ code: 'compra_no_encontrada' })
    }

    const r = await aplicar(db, userId, purchaseToken, sub)
    console.log('[play-verificar]', { userId, productId: r.productId, estado: r.estado, pro: r.pro })
    return res.status(200).json({ pro: r.pro, productId: r.productId, vence: r.vence })
  } catch (err) {
    console.error('[play-verificar] fallo:', err?.message)
    return res.status(502).json({ code: 'play_error' })
  }
}
