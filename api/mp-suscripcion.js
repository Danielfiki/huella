import { createClient } from '@supabase/supabase-js'
import { supabaseServicio, venceDe, buscarAutorizada, guardarSuscripcion } from './_lib/mp.js'

// POST /api/mp-suscripcion  { accion }  + Authorization: Bearer <sesión>
//
// La usa /cuenta en la web para el Pro pagado con Mercado Pago.
//   accion 'consultar' → { mp, cancelada, vence }
//       mp: el Pro viene de una suscripción de Mercado Pago (cobrando, o
//       cancelada y aún pagada). vence: hasta cuándo está pagada (o null).
//   accion 'cancelar'  → { cancelada: true, vence }
//       Anota la cancelación con su `vence` y recién después la cancela en
//       Mercado Pago, para que el webhook ya la encuentre y no baje el Pro
//       antes de tiempo. El job vencer_pro_mp lo apaga al llegar `vence`.
//
// El usuario sale del token de la sesión, nunca del body.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ code: 'mp_no_configurado' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ code: 'sin_sesion' })
  const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data: u } = await anon.auth.getUser(token).catch(() => ({ data: null }))
  const userId = u?.user?.id
  if (!userId) return res.status(401).json({ code: 'sin_sesion' })

  const accion = req.body?.accion
  const db = supabaseServicio()

  try {
    if (accion === 'consultar') {
      const sub = await buscarAutorizada(userId)
      if (sub) return res.status(200).json({ mp: true, cancelada: false, vence: venceDe(sub) })
      // Cancelada desde Huella o desde Mercado Pago, con Pro hasta `vence`.
      const { data: filas } = await db.from('suscripciones_mp')
        .select('vence').eq('user_id', userId).eq('estado', 'cancelada')
        .gt('vence', new Date().toISOString()).order('vence', { ascending: false }).limit(1)
      if (filas?.length) return res.status(200).json({ mp: true, cancelada: true, vence: filas[0].vence })
      return res.status(200).json({ mp: false })
    }

    if (accion === 'cancelar') {
      const sub = await buscarAutorizada(userId)
      if (!sub) return res.status(404).json({ code: 'sin_suscripcion' })
      const vence = venceDe(sub)
      // Primero se anota: si la tabla no está, no se cancela nada.
      await guardarSuscripcion(db, { preapprovalId: sub.id, userId, estado: 'cancelada', vence })
      const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(sub.id)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!r.ok) {
        const detalle = await r.text().catch(() => '')
        await guardarSuscripcion(db, { preapprovalId: sub.id, userId, estado: 'activa', vence }).catch(() => {})
        throw new Error(`cancelar preapproval ${r.status} ${detalle.slice(0, 200)}`)
      }
      console.log('[mp-suscripcion] cancelada', { userId, preapprovalId: sub.id, vence })
      return res.status(200).json({ cancelada: true, vence })
    }

    return res.status(400).json({ code: 'accion_invalida' })
  } catch (err) {
    console.error('[mp-suscripcion] fallo:', accion, err?.message)
    return res.status(502).json({ code: 'mp_error' })
  }
}
