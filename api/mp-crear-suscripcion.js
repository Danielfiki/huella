import { createClient } from '@supabase/supabase-js'

// Configuración de los dos ciclos de Huella Pro. Los montos van en CLP
// (sin decimales) y se cobran de forma recurrente: el mensual cada mes,
// el anual cada 12 meses. Sin free_trial.
const CICLOS = {
  mensual: {
    reason: 'Huella Pro mensual',
    auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 9990, currency_id: 'CLP' },
  },
  anual: {
    reason: 'Huella Pro anual',
    auto_recurring: { frequency: 12, frequency_type: 'months', transaction_amount: 99900, currency_id: 'CLP' },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    console.error('mp-crear-suscripcion: falta MP_ACCESS_TOKEN')
    return res.status(500).json({ error: 'Pasarela de pago no configurada' })
  }

  // Autenticamos al usuario con su token de Supabase (mismo patrón que
  // push-subscribe): el anon key + el Bearer del header dejan que Supabase
  // resuelva quién es. Necesitamos su id y su email para la suscripción.
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { ciclo } = req.body ?? {}
  const config = CICLOS[ciclo]
  if (!config) {
    return res.status(400).json({ error: 'Ciclo inválido' })
  }

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

  try {
    // Suscripción sin plan asociado (preapproval al vuelo). Al NO mandar
    // card_token_id, Mercado Pago devuelve un init_point: la página de pago
    // alojada por MP donde el usuario ingresa su tarjeta (no la manejamos
    // nosotros). external_reference = user.id para que el webhook (paso 2)
    // sepa a quién activarle el plan.
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: config.reason,
        auto_recurring: config.auto_recurring,
        payer_email: user.email,
        back_url: 'https://huella.lat/cuenta?suscripcion=ok',
        external_reference: user.id,
        notification_url: 'https://huella.lat/api/mp-webhook',
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.init_point) {
      console.error('Mercado Pago error:', data)
      return res.status(502).json({ error: 'No se pudo crear la suscripción', detail: data })
    }

    return res.status(200).json({ init_point: data.init_point })
  } catch (err) {
    console.error('mp-crear-suscripcion handler error:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
}
