import { createClient } from '@supabase/supabase-js'

// Firma las dos fotos de una invitacion para la pantalla publica /invitar.
//
// POR QUE EXISTE ESTE ENDPOINT
//
// La pantalla /invitar la abre la pareja SIN SESION. El RPC
// `get_invitation_public_by_token` le entrega los nombres y los PATHS de las
// dos fotos, pero el cliente anonimo NO PUEDE convertir esos paths en una URL:
//
//   * El bucket `avatares` NO es publico en produccion. Verificado contra la
//     API real: GET /storage/v1/object/public/avatares/... responde
//     "Bucket not found" (igual que `momentos`). El `public = true` que dice
//     supabase/schema.sql quedo desactualizado: la app entera firma siempre y
//     no usa `getPublicUrl` en ninguna parte.
//   * Y firmar como anon tampoco sirve: la RLS de storage.objects esconde las
//     filas del rol anonimo, asi que createSignedUrl devuelve "Object not
//     found" -- indistinguible de un archivo que no existe.
//
// Las alternativas eran peores. Abrir una policy de lectura anonima sobre
// `avatares` haria publicas TODAS las fotos de TODAS las familias para
// cualquiera que adivine un path. Guardar URLs firmadas de 7 dias en la fila
// de la invitacion deja una credencial de larga duracion en la base. Este
// endpoint firma bajo demanda, con TTL corto, y no abre nada.
//
// PROPIEDAD DE SEGURIDAD IMPORTANTE: ante cualquier problema -- token invalido,
// expirado, inexistente, falta de configuracion, error de Storage -- responde
// 200 con `{}`. Nunca distingue un token malo de uno bueno sin fotos, asi que
// no sirve como oraculo para adivinar tokens, y la pantalla simplemente cae a
// las iniciales, que es un estado valido y no un error.

const TTL = 300   // 5 min: la pantalla se ve una vez y se abandona

async function firmar(cliente, path) {
  if (!path || typeof path !== 'string' || /^https?:\/\//i.test(path)) return null
  try {
    const { data } = await cliente.storage.from('avatares').createSignedUrl(path, TTL)
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Nunca cachear: las URLs firmadas vencen y una respuesta cacheada dejaria
  // fotos rotas para el siguiente visitante.
  res.setHeader('Cache-Control', 'no-store')

  const token = req.query?.token
  if (!token || typeof token !== 'string') return res.status(200).json({})

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(200).json({})

  try {
    const admin = createClient(url, key, { auth: { persistSession: false } })

    // Se reusa el MISMO RPC que consume la pantalla en vez de consultar las
    // tablas a mano: la validacion del token (existe, pendiente, vigente) vive
    // en un solo lugar y no puede desincronizarse.
    const { data, error } = await admin.rpc('get_invitation_public_by_token', { p_token: token })
    if (error || !data?.valid) return res.status(200).json({})

    const [inviter, hijo] = await Promise.all([
      firmar(admin, data.inviterFotoPath),
      firmar(admin, data.hijoFotoPath),
    ])

    return res.status(200).json({ inviter, hijo })
  } catch {
    return res.status(200).json({})
  }
}
