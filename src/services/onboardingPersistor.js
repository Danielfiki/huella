// onboardingPersistor.js
// Persiste el objeto `perfil` que entrega el Onboarding · Susurro al pulsar
// "Empezar ahora" en el slide 5. Y expone un helper para marcar el onboarding
// como visto cuando el padre/madre lo salta.
//
// Mapeo del objeto del componente (camelCase) al schema real (snake_case):
//
//   perfil.nombrePadre      → perfiles.nombre
//   perfil.contextoInicial  → perfiles.contexto_inicial   (omitido si vacío/null)
//   perfil.intenciones      → perfiles.intenciones        (text[])
//
//   perfil.nombreHijo       → hijos.nombre
//   perfil.nacimiento       → hijos.fecha_nacimiento      ('YYYY-MM-DD' con padding)
//   perfil.sexo             → hijos.genero                ('Niño' | 'Niña' | 'Otro')
//   perfil.fotoBlob         → hijos.avatar_url            (NULL si no vino foto)
//
// El INSERT del hijo se hace vía la RPC `upsert_family_child` que ya existe
// en producción y que también usa PerfilPage. Esa función SQL se encarga
// internamente de vincular el hijo con el user_id autenticado y, si aplica,
// con el family_id del modo pareja. NO se hace INSERT directo a `hijos`.
//
// Path: src/services/onboardingPersistor.js

import { supabase } from '../lib/supabase'

// Bucket que ya existe en producción y se usa para avatares de hijos desde
// PerfilPage (src/pages/perfil/PerfilPage.jsx). Reutilizado acá para
// mantener un solo lugar de fotos de hijos en Storage.
const BUCKET_AVATARES = 'avatares'

// Clave de sessionStorage para distinguir "vio el onboarding pero no completó"
// (caso skip) de "nunca lo vio". Vive en session — al cerrar el tab vuelve.
const STORAGE_KEY_DISMISSED = 'huella.onboarding.dismissed'

/**
 * Padding cero a 2 dígitos: "5" → "05", "12" → "12", "" → "".
 * Acepta number o string; cualquier otra cosa devuelve "".
 */
function pad2(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  return s.length === 1 ? `0${s}` : s
}

/**
 * Compone 'YYYY-MM-DD' desde { dia, mes, anio } con padding cero.
 * Devuelve null si falta cualquiera de los tres campos o si el año no tiene
 * 4 dígitos. NO valida que la fecha sea real (ej. 32/13/2025 pasa). Esa
 * validación profunda queda como deuda — el componente solo permite tipear
 * dígitos y limita longitud, pero no rechaza fechas inválidas.
 */
function componerFechaNacimiento(nacimiento) {
  if (!nacimiento || typeof nacimiento !== 'object') return null
  const dia  = pad2(nacimiento.dia)
  const mes  = pad2(nacimiento.mes)
  const anio = String(nacimiento.anio ?? '').trim()
  if (!dia || !mes || !anio) return null
  if (anio.length !== 4) return null
  return `${anio}-${mes}-${dia}`
}

/**
 * Sube el File del padre/madre al bucket `avatares` y devuelve el PATH del
 * objeto (`${userId}/${hijoId}.jpg`). El bucket es privado: la app firma la URL
 * al mostrar (HuellaContext), así que en la BD se guarda el path, no una URL.
 *
 * Mismo formato de path que PerfilPage. El bucket es el mismo, así que si el
 * padre/madre vuelve a cambiar la foto desde Perfil más tarde, el upsert
 * sobreescribe limpiamente.
 *
 * Si la subida falla, devuelve null en lugar de tirar: la foto es opcional,
 * no debe bloquear que el hijo quede creado.
 */
async function subirAvatarHijo(userId, hijoId, file) {
  const path = `${userId}/${hijoId}.jpg`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_AVATARES)
    .upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })
  if (uploadError) {
    console.error('[onboardingPersistor] No se pudo subir el avatar:', uploadError)
    return null
  }
  return path
}

/**
 * Persiste el objeto `perfil` del onboarding en `perfiles` y `hijos`.
 *
 * Flujo:
 *   1. Obtiene el usuario autenticado desde Supabase.
 *   2. UPSERT en `perfiles` (PK = user_id): nombre + intenciones + contexto_inicial.
 *      `contexto_inicial` se omite del patch si viene null o string vacío.
 *   3. INSERT en `hijos` vía RPC `upsert_family_child` (sin foto todavía).
 *      Devuelve el UUID del hijo recién creado.
 *   4. Si vino `fotoBlob`, sube la foto al bucket `avatares` y luego hace un
 *      segundo upsert del hijo con `avatar_url` poblada. Si la subida falla,
 *      el hijo igual queda creado (sin foto) y el onboarding no se rompe.
 *
 * Tira (Error) si:
 *   - No hay supabase configurado (env vars).
 *   - No hay usuario autenticado.
 *   - El UPSERT a `perfiles` falla.
 *   - El RPC `upsert_family_child` falla o no devuelve un id.
 *
 * @param {Object} perfil   Forma definida en src/pages/onboarding/Onboarding.jsx EMPTY_PERFIL.
 * @returns {Promise<{ userId: string, hijoId: string | null, avatarUrl: string | null, redirectedToInvitation?: boolean }>}
 *   Cuando hay invitación pendiente, hijoId queda null y redirectedToInvitation:true.
 *   El service ya disparó window.location.assign('/invitar?token=xxx') en ese caso.
 */
export async function persistirPerfilOnboarding(perfil) {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }
  if (!perfil || typeof perfil !== 'object') {
    throw new Error('Falta el objeto perfil del onboarding.')
  }

  // 1. Auth — el usuario debe estar autenticado cuando el onboarding cierra.
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    throw new Error('No hay un usuario autenticado.')
  }
  const user = authData.user

  // Defensa final contra duplicado en modo parejas. Si llegamos hasta acá
  // con una invitación pendiente activa, las fallas 1 y 2 no funcionaron —
  // no creamos hijo nuevo. Redirigimos al flujo de aceptación con un hard
  // navigate (window.location.assign) para que /invitar monte limpio sin
  // arrastrar el state del onboarding actual.
  //
  // Defensivo: si la RPC no existe todavía en producción (migración 004
  // pendiente) o falla por cualquier razón, tratamos como "no hay
  // invitación" y seguimos el flujo normal — el código nuevo se puede
  // deployar antes que el SQL sin romper a usuarios solos.
  try {
    const { data: invData, error: invErr } = await supabase.rpc('get_my_pending_invitation')
    if (!invErr && invData?.hasInvitation && invData.token) {
      if (typeof window !== 'undefined') {
        window.location.assign(`/invitar?token=${encodeURIComponent(invData.token)}`)
      }
      return {
        userId: user.id,
        hijoId: null,
        avatarUrl: null,
        redirectedToInvitation: true,
      }
    }
  } catch (rpcErr) {
    console.warn(
      '[onboardingPersistor] get_my_pending_invitation falló (¿migración 004 pendiente?). Continúo flujo normal:',
      rpcErr
    )
  }

  // Normalizaciones defensivas.
  const nombrePadre = (perfil.nombrePadre || '').trim()
  const nombreHijo  = (perfil.nombreHijo  || '').trim()
  const intenciones = Array.isArray(perfil.intenciones) ? perfil.intenciones : []
  const fechaNac    = componerFechaNacimiento(perfil.nacimiento)
  const genero      = perfil.sexo || null
  const contexto    = (perfil.contextoInicial || '').trim()

  // 2. UPSERT a `perfiles`. PK = user_id, así que onConflict apunta ahí.
  //    `contexto_inicial` solo se incluye si vino con texto real (decisión
  //    del bundle: no persistir string vacío para no contaminar el dato).
  const perfilPatch = {
    user_id: user.id,
    nombre: nombrePadre || null,
    intenciones,
  }
  if (contexto) {
    perfilPatch.contexto_inicial = contexto
  }
  const { error: perfilErr } = await supabase
    .from('perfiles')
    .upsert(perfilPatch, { onConflict: 'user_id' })
  if (perfilErr) {
    throw new Error(`No se pudo guardar tu perfil: ${perfilErr.message}`)
  }

  // 3. INSERT del hijo vía RPC. Misma RPC que usa PerfilPage para crear/editar
  //    hijos — maneja internamente user_id y family_id (modo pareja).
  const { data: hijoId, error: hijoErr } = await supabase.rpc(
    'upsert_family_child',
    {
      p_nombre:           nombreHijo || null,
      p_edad:             null,
      p_avatar_url:       null,
      p_fecha_nacimiento: fechaNac,
      p_genero:           genero,
      p_hijo_id:          null,
    }
  )
  if (hijoErr || !hijoId) {
    throw new Error(
      `No se pudo guardar a tu hijo/a: ${hijoErr?.message || 'sin id devuelto'}`
    )
  }

  // 4. Foto opcional. Si no vino, avatar_url queda en NULL.
  let avatarUrl = null
  const esArchivo =
    perfil.fotoBlob instanceof File || perfil.fotoBlob instanceof Blob
  if (esArchivo) {
    const subido = await subirAvatarHijo(user.id, hijoId, perfil.fotoBlob)
    if (subido) {
      avatarUrl = subido
      // Segundo upsert ahora con avatar_url. Si falla, dejamos pasar:
      // la foto está subida y el hijo creado — es un fallo cosmético que
      // se puede arreglar manualmente o desde Perfil más tarde.
      const { error: updErr } = await supabase.rpc('upsert_family_child', {
        p_nombre:           nombreHijo || null,
        p_edad:             null,
        p_avatar_url:       avatarUrl,
        p_fecha_nacimiento: fechaNac,
        p_genero:           genero,
        p_hijo_id:          hijoId,
      })
      if (updErr) {
        console.error(
          '[onboardingPersistor] No se pudo asociar el avatar al hijo/a:',
          updErr
        )
      }
    }
  }

  return { userId: user.id, hijoId, avatarUrl }
}

/**
 * Marca que el padre/madre vio el onboarding y lo saltó (no lo completó).
 * Se persiste en sessionStorage para que en la misma sesión no vuelva a
 * mostrarse, pero al cerrar el tab vuelve. Decisión del bundle: el skip
 * no es un "completado" — solo silencia el flujo por la sesión actual.
 *
 * Es no-throw: si sessionStorage no está disponible (modo privado, Storage
 * deshabilitado), tragamos la excepción y seguimos.
 */
export function marcarOnboardingVisto() {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(
      STORAGE_KEY_DISMISSED,
      new Date().toISOString()
    )
  } catch {
    // sessionStorage no disponible — no rompemos el flujo de skip.
  }
}
