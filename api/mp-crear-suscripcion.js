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

// ══════════════════════════════════════════════════════════════
// REGISTRO DE INTENTOS (telemetría) — tabla `pagos_intentos`, migración 009
//
// REGLA INVIOLABLE: esto NUNCA puede romper ni demorar el pago. Si la
// escritura falla, se ignora en silencio y el flujo sigue exactamente
// igual que antes de instrumentar. Por eso todo lo de abajo:
//   • vive dentro de try/catch que se traga absolutamente todo,
//   • tiene techo de tiempo propio (Promise.race), así un Supabase lento
//     no puede colgar el endpoint,
//   • usa un cliente service-role PROPIO, separado del cliente anon que
//     autentica al usuario más abajo (ese no se toca),
//   • devuelve `null` ante cualquier problema, y `null` es un valor
//     perfectamente válido río abajo: se responde sin referencia.
// Ninguna llamada a registrarIntento() puede lanzar. Si algún día una
// lanza, es un bug de esta sección, no del pago.
// ══════════════════════════════════════════════════════════════

// Techo de tiempo del registro. Un insert normal desde Vercel tarda entre
// 50 y 200 ms; este tope solo entra en juego si Supabase está degradado.
const REGISTRO_TIMEOUT_MS = 1200

// Tope del texto crudo de Mercado Pago. La columna es `text` (sin límite),
// pero truncamos igual para no guardar respuestas absurdas: el diagnóstico
// útil siempre viene en los primeros caracteres.
const ERROR_DETALLE_MAX = 4000

// Tope del user agent. Los reales rondan los 150 caracteres.
const USER_AGENT_MAX = 1000

// Cliente service-role cacheado entre invocaciones tibias del lambda.
// Se crea perezosamente: si faltan las variables, queda en null y el
// registro simplemente no ocurre (el pago sigue igual).
let clienteRegistro
function obtenerClienteRegistro() {
  if (clienteRegistro !== undefined) return clienteRegistro
  try {
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    clienteRegistro = (url && key)
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null
  } catch {
    clienteRegistro = null
  }
  return clienteRegistro
}

// Deriva plataforma del user agent. Es el dato clave del diagnóstico: el
// camino silencioso que estamos cazando NO se reproduce en Chrome de
// escritorio, así que separar celular de escritorio es la mitad del caso.
// Orden importante: tablet ANTES que móvil, porque los iPad y varios
// Android de tablet traen 'Mobile' o 'Android' en el user agent.
function derivarPlataforma(ua) {
  if (!ua) return null
  const s = String(ua).toLowerCase()
  if (s.includes('ipad') || s.includes('tablet') || (s.includes('android') && !s.includes('mobile'))) {
    return 'tablet'
  }
  if (s.includes('mobile') || s.includes('iphone') || s.includes('ipod') || s.includes('android')) {
    return 'movil'
  }
  return 'escritorio'
}

// Convierte cualquier cosa a texto para `error_detalle`. La columna es
// `text` y no `jsonb` justamente para que nada acá pueda hacer fallar el
// insert: si un objeto tiene referencias circulares o un getter que
// explota, caemos a String() y si eso también falla, devolvemos null.
function serializarDetalle(valor) {
  if (valor === null || valor === undefined) return null
  let texto
  try {
    texto = typeof valor === 'string' ? valor : JSON.stringify(valor)
  } catch {
    try {
      texto = String(valor)
    } catch {
      return null
    }
  }
  if (typeof texto !== 'string') return null
  return texto.length > ERROR_DETALLE_MAX
    ? `${texto.slice(0, ERROR_DETALLE_MAX)}…[truncado]`
    : texto
}

// Escribe una fila en `pagos_intentos` y devuelve la referencia HP-XXXXXX
// que generó la BASE (no se calcula en JS: la genera el default de la
// columna y la leemos de vuelta con `select`). Devuelve null si el
// registro no se pudo hacer por cualquier motivo.
//
// `family_id` queda en null a propósito: resolverla exige una consulta
// extra a family_members y este helper no puede darse el lujo de gastar
// tiempo. El user_id alcanza para cruzar el reclamo con la fila.
async function registrarIntento(req, datos) {
  try {
    const cliente = obtenerClienteRegistro()
    if (!cliente) return null

    const ua = req?.headers?.['user-agent'] ?? null

    const insercion = cliente
      .from('pagos_intentos')
      .insert({
        user_id: datos.userId ?? null,
        origen: 'endpoint',
        etapa: datos.etapa,
        resultado: datos.resultado,
        error_mensaje: datos.errorMensaje ?? null,
        error_detalle: serializarDetalle(datos.errorDetalle),
        user_agent: ua ? String(ua).slice(0, USER_AGENT_MAX) : null,
        plataforma: derivarPlataforma(ua),
      })
      .select('referencia')
      .single()
      // Doble red: supabase-js devuelve los errores en `{ error }` en vez de
      // lanzarlos, pero un fallo de red sí puede rechazar la promesa.
      .then(({ data }) => data?.referencia ?? null, () => null)

    // Techo de tiempo: si el insert no vuelve a tiempo, seguimos sin
    // referencia. La promesa del insert queda corriendo sola y a nadie le
    // importa — nunca la volvemos a mirar y no puede lanzar sin manejar.
    const techo = new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), REGISTRO_TIMEOUT_MS)
      if (typeof t?.unref === 'function') t.unref()
    })

    return await Promise.race([insercion, techo])
  } catch {
    // Silencio absoluto y a propósito: el pago manda.
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    const referencia = await registrarIntento(req, {
      etapa: 'endpoint',
      resultado: 'error',
      errorMensaje: 'metodo_no_permitido',
      errorDetalle: { method: req.method },
    })
    return res.status(405).json({ error: 'Method not allowed', referencia })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    console.error('mp-crear-suscripcion: falta MP_ACCESS_TOKEN')
    const referencia = await registrarIntento(req, {
      etapa: 'endpoint',
      resultado: 'error',
      errorMensaje: 'falta_mp_access_token',
    })
    return res.status(500).json({ error: 'Pasarela de pago no configurada', referencia })
  }

  // Autenticamos al usuario con su token de Supabase (mismo patrón que
  // push-subscribe): el anon key + el Bearer del header dejan que Supabase
  // resuelva quién es. Necesitamos su id y su email para la suscripción.
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    const referencia = await registrarIntento(req, {
      etapa: 'endpoint',
      resultado: 'error',
      errorMensaje: 'sin_header_authorization',
    })
    return res.status(401).json({ error: 'Unauthorized', referencia })
  }

  const { ciclo } = req.body ?? {}
  const config = CICLOS[ciclo]
  if (!config) {
    const referencia = await registrarIntento(req, {
      etapa: 'endpoint',
      resultado: 'error',
      errorMensaje: 'ciclo_invalido',
      errorDetalle: { ciclo: ciclo ?? null },
    })
    return res.status(400).json({ error: 'Ciclo inválido', referencia })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }
  )

  // getUser puede fallar por token expirado, por red, o devolver user null.
  // Antes los tres casos salían por el mismo 401 mudo; ahora quedan escritos.
  let user = null
  let errorSesion = null
  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user ?? null
    errorSesion = error ?? null
  } catch (err) {
    errorSesion = err
  }

  if (!user) {
    const referencia = await registrarIntento(req, {
      etapa: 'endpoint',
      resultado: 'error',
      errorMensaje: 'sesion_invalida',
      errorDetalle: errorSesion ? { message: errorSesion.message, name: errorSesion.name } : null,
    })
    return res.status(401).json({ error: 'Unauthorized', referencia })
  }

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
      // El detalle crudo de MP se guarda acá. Hasta hoy solo iba a
      // console.error, donde vencía en una hora y nadie lo veía nunca.
      const referencia = await registrarIntento(req, {
        userId: user.id,
        etapa: 'preapproval',
        resultado: 'error',
        errorMensaje: `mp_sin_init_point_${response.status}`,
        errorDetalle: data,
      })
      return res.status(502).json({ error: 'No se pudo crear la suscripción', detail: data, referencia })
    }

    // Camino exitoso. Antes no dejaba NINGÚN rastro: no existía forma de
    // saber que alguien había llegado hasta acá. Ahora sí.
    await registrarIntento(req, {
      userId: user.id,
      etapa: 'preapproval',
      resultado: 'ok',
    })

    return res.status(200).json({ init_point: data.init_point })
  } catch (err) {
    console.error('mp-crear-suscripcion handler error:', err)
    // Cae acá sobre todo cuando el fetch a Mercado Pago no responde
    // (MP caído, DNS, timeout de red): el flujo quedó en la etapa
    // preapproval sin llegar a tener init_point.
    const referencia = await registrarIntento(req, {
      userId: user.id,
      etapa: 'preapproval',
      resultado: 'error',
      errorMensaje: 'mp_inalcanzable',
      errorDetalle: { name: err?.name, message: err?.message, stack: err?.stack },
    })
    return res.status(500).json({ error: 'Error interno', referencia })
  }
}
