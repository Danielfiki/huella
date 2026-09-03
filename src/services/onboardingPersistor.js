// onboardingPersistor.js
// Persiste el objeto `perfil` que entrega el Onboarding al cerrar el acto B.
//
// Mapeo del objeto del componente (camelCase) al schema real (snake_case):
//
//   perfil.nombrePadre      → perfiles.nombre
//
//   perfil.nombreHijo       → hijos.nombre
//   perfil.nacimiento       → hijos.fecha_nacimiento      ('YYYY-MM-DD' con padding)
//   perfil.sexo             → hijos.genero                ('m' | 'f' | 'nb')
//   perfil.fotoBlob         → hijos.avatar_url            (NULL si no vino foto)
//
// Ya NO se escriben `perfiles.intenciones` ni `perfiles.contexto_inicial`:
// eran columnas de escritura muerta (ver el comentario del upsert más abajo).
//
//   perfil.textoMomento     → episodios (descripcion_libre) · el PRIMER episodio
//                             real del hijo, con origen = 'onboarding'. Ver
//                             `crearPrimerEpisodio` al final del archivo.
//
// El INSERT del hijo se hace vía la RPC `upsert_family_child` que ya existe
// en producción y que también usa PerfilPage. Esa función SQL se encarga
// internamente de vincular el hijo con el user_id autenticado y, si aplica,
// con el family_id del modo pareja. NO se hace INSERT directo a `hijos`.
//
// Path: src/services/onboardingPersistor.js

import { supabase } from '../lib/supabase'
import { extraerEpisodio, analizarEpisodio } from './anthropic'

// Bucket que ya existe en producción y se usa para avatares de hijos desde
// PerfilPage (src/pages/perfil/PerfilPage.jsx). Reutilizado acá para
// mantener un solo lugar de fotos de hijos en Storage.
const BUCKET_AVATARES = 'avatares'

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
 * Sube una foto al bucket `avatares` y devuelve el PATH del objeto. El bucket
 * es PRIVADO: la app firma la URL al mostrar (`firmarPath` en HuellaContext),
 * así que en la BD se guarda el path, nunca una URL.
 *
 * Los dos avatares del onboarding pasan por acá, y el `path` es lo único que
 * los distingue — los mismos dos formatos que ya usa PerfilPage, así que si
 * después se cambia una foto desde Perfil, el upsert sobreescribe limpiamente:
 *
 *   hijo    → `${userId}/${hijoId}.jpg`   → va a `hijos.avatar_url`
 *   adulto  → `${userId}/cuidador.jpg`    → va a `perfiles.avatar_url`
 *
 * (El docstring anterior decía "sube el File del padre/madre" describiendo la
 * subida del HIJO. Estaba equivocado desde que se escribió; con dos fotos en
 * juego, dejarlo así era una trampa.)
 *
 * Si la subida falla devuelve null en vez de tirar: las dos fotos son
 * opcionales y ninguna debe bloquear que la cuenta quede creada.
 */
async function subirAvatar(path, file) {
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

// ¿Es algo que se pueda subir? El paso 5 guarda Blobs ya comprimidos, pero un
// File tambien es un Blob, asi que esto cubre los dos casos.
const esImagen = (v) => v instanceof File || v instanceof Blob

/**
 * Persiste el objeto `perfil` del onboarding en `perfiles` y `hijos`.
 *
 * Flujo:
 *   1. Obtiene el usuario autenticado desde Supabase.
 *   2. Si vino `fotoPadreBlob`, sube la foto del adulto a
 *      `avatares/{userId}/cuidador.jpg`.
 *   3. UPSERT en `perfiles` (PK = user_id): el nombre y, si la subida del
 *      paso 2 salió bien, `avatar_url`. Van juntos a propósito — es una sola
 *      escritura, no dos.
 *   4. INSERT en `hijos` vía RPC `upsert_family_child` (sin foto todavía).
 *      Devuelve el UUID del hijo recién creado.
 *   5. Si vino `fotoBlob`, sube la foto del hijo a
 *      `avatares/{userId}/{hijoId}.jpg` y hace un segundo upsert del hijo con
 *      `avatar_url` poblada. El path necesita el UUID, y por eso esta foto no
 *      se puede subir antes del paso 4 como la del adulto.
 *
 * Las dos fotos son OPCIONALES y ninguna bloquea nada: si una subida falla, la
 * cuenta igual queda creada sin esa foto y el onboarding no se rompe.
 *
 * NOTA — modo ensayo (?onboarding=1): esta función no llega a ejecutarse. El
 * Layout corta antes de llamarla, así que en ensayo no se sube ninguna foto.
 *
 * Tira (Error) si:
 *   - No hay supabase configurado (env vars).
 *   - No hay usuario autenticado.
 *   - El UPSERT a `perfiles` falla.
 *   - El RPC `upsert_family_child` falla o no devuelve un id.
 *
 * @param {Object} perfil   Forma definida en src/pages/onboarding/Onboarding.jsx EMPTY_PERFIL.
 * @returns {Promise<{ userId: string, hijoId: string | null, avatarUrl: string | null, avatarPadreUrl: string | null, redirectedToInvitation?: boolean }>}
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
        avatarPadreUrl: null,
        redirectedToInvitation: true,
      }
    }
  } catch (rpcErr) {
    console.warn(
      '[onboardingPersistor] get_my_pending_invitation falló (¿migración 004 pendiente?). Continúo flujo normal:',
      rpcErr
    )
  }

  // 🪤 Genero: la app entera guarda 'm' | 'f' | 'nb' (HijoPage, PerfilPage) y
  // analizarEpisodio compara contra esos codigos para elegir pronombres. El
  // onboarding, en cambio, mandaba las etiquetas crudas ('Niño'/'Niña'/'Otro'),
  // que no matcheaban con nada: toda cuenta creada aca recibia orientacion en
  // generico ("niño/a", "él/ella") aunque el padre hubiera respondido.
  //
  // El formulario ya manda los codigos. Esta funcion es la red por si vuelve a
  // llegar una etiqueta (o un valor viejo desde otro camino).
  const MAPA_GENERO = {
    m: 'm', f: 'f', nb: 'nb',
    'Niño': 'm', 'Niña': 'f', 'Otro': 'nb',
  }
  function normalizarGenero(valor) {
    if (!valor) return null
    return MAPA_GENERO[String(valor).trim()] ?? null
  }

  // Normalizaciones defensivas.
  const nombrePadre = (perfil.nombrePadre || '').trim()
  const nombreHijo  = (perfil.nombreHijo  || '').trim()
  const fechaNac    = componerFechaNacimiento(perfil.nacimiento)
  const genero      = normalizarGenero(perfil.sexo)

  // 2. UPSERT a `perfiles`. PK = user_id, así que onConflict apunta ahí.
  //
  // Ya NO se escriben `intenciones` ni `contexto_inicial`. Las dos columnas
  // eran de escritura muerta: se llenaban en cada onboarding y ninguna
  // pantalla, prompt ni query las leía jamás — `loadUserData` ni siquiera las
  // trae en su select de `perfiles`. Se dejó de pedir el dato (el paso de
  // intenciones se eliminó) y se dejó de escribirlo.
  // Foto del adulto (opcional). Se sube primero para que su path viaje en el
  // MISMO upsert de `perfiles` que el nombre: una sola escritura en vez de
  // dos, y sin repetir la logica de `savePadreAvatar` (que vive en
  // HuellaContext y no se puede importar desde un service). El `reloadData`
  // que el Layout dispara al cerrar es el que la deja firmada en pantalla.
  let avatarPadreUrl = null
  if (esImagen(perfil.fotoPadreBlob)) {
    avatarPadreUrl = await subirAvatar(`${user.id}/cuidador.jpg`, perfil.fotoPadreBlob)
  }

  const perfilPatch = {
    user_id: user.id,
    nombre: nombrePadre || null,
    // Solo se incluye si de verdad hay foto nueva: mandar null borraria una
    // que ya existiera (caso raro, pero posible si el onboarding se reabre).
    ...(avatarPadreUrl ? { avatar_url: avatarPadreUrl } : {}),
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
  if (esImagen(perfil.fotoBlob)) {
    const subido = await subirAvatar(`${user.id}/${hijoId}.jpg`, perfil.fotoBlob)
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

  // 5. Bloque 3 del onboarding: el texto del acto B pasa a ser el primer
  //    episodio real del hijo. Va DESPUES del hijo (necesita su id) y se
  //    espera solo el INSERT: la orientacion corre en segundo plano y no
  //    retrasa la llegada al Home. Cualquier fallo se traga adentro.
  await crearPrimerEpisodio({
    userId: user.id,
    hijoId,
    texto: perfil.textoMomento,
    hijo: { nombre: nombreHijo || null, edad: edadDesdeFecha(fechaNac), genero },
  })

  return { userId: user.id, hijoId, avatarUrl, avatarPadreUrl }
}

// ── Primer episodio (bloque 3) ────────────────────────────────────────────────

// Intensidad cuando no hay quien la elija. El registro conversacional le pide
// al padre que la marque despues de la extraccion; en el onboarding no hay
// pantalla para eso, asi que el primer episodio entra al medio de la escala.
const INTENSIDAD_POR_DEFECTO = 3

// Anios cumplidos desde 'YYYY-MM-DD'. Misma cuenta que hace Onboarding.jsx
// para el acto B; se repite aca porque un service no importa de pages.
function edadDesdeFecha(iso) {
  if (!iso) return null
  const fecha = new Date(`${iso}T00:00:00`)
  if (isNaN(fecha.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - fecha.getFullYear()
  const m = hoy.getMonth() - fecha.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--
  return edad >= 0 && edad < 130 ? edad : null
}

/**
 * Crea el primer episodio del hijo con el texto del acto B y dispara la
 * orientacion completa en segundo plano.
 *
 * Reglas (bloque 3):
 *   - Si `texto` viene vacio (el padre toco "Saltar este paso") no se crea nada.
 *   - NUNCA tira. El hijo y el perfil ya quedaron creados cuando esto corre, y
 *     un fallo aca no puede hacer que el onboarding termine mal: se loguea y
 *     se sigue. El padre no ve ningun error por esto.
 *   - El modo ensayo no llega hasta aca: el Layout corta antes del persistor.
 *
 * Por que no se usa `addEpisodio` del HuellaContext: inserta con
 * `state.hijoActivoId`, y el hijo recien creado todavia no esta en el contexto
 * (llega con el `reloadData` que el Layout dispara al cerrar). Aca el INSERT
 * es directo, con el `hijoId` que devolvio la RPC, igual que el resto de las
 * escrituras de este archivo.
 *
 * Flujo:
 *   1. INSERT al tiro en `episodios` con hijo_id, fecha = ahora, el relato en
 *      descripcion_libre, tipo 'otro' e intensidad 3. Es lo UNICO que se
 *      espera: cero segundos extra para el padre.
 *   2. UPDATE aparte con origen = 'onboarding'. Si la columna todavia no
 *      existe (migracion 015 pendiente) el UPDATE falla solo y se loguea: el
 *      episodio ya esta creado y no pierde nada mas que la marca.
 *   3. En segundo plano, `extraerEpisodio` saca tipo/emocion/contexto del
 *      relato, igual que el registro conversacional, y los escribe con un
 *      UPDATE. Si falla (429, red, parse) el episodio se queda en 'otro'.
 *   4. Encadenada a la anterior, `analizarEpisodio` con el episodio ya
 *      afinado (o el crudo si la extraccion fallo). Al terminar, escribe
 *      orientacion_ia y orientacion_zona en dos UPDATEs separados (mismo
 *      patron que updateEpisodio en HuellaContext y la migracion 014).
 */
async function crearPrimerEpisodio({ userId, hijoId, texto, hijo }) {
  const relato = (texto || '').trim()
  if (!relato || !hijoId || !supabase) return

  try {
    const episodio = {
      tipo:             'otro',
      intensidad:       INTENSIDAD_POR_DEFECTO,
      contexto:         '',
      gatillantes:      [],
      estadoPadre:      '',
      fecha:            new Date().toISOString(),
      emocion:          null,
      descripcionLibre: relato,
    }

    // 1. El INSERT. Es lo unico que se espera de este bloque.
    const { data: inserted, error: insErr } = await supabase
      .from('episodios')
      .insert({
        user_id:           userId,
        hijo_id:           hijoId,
        tipo:              episodio.tipo,
        intensidad:        episodio.intensidad,
        contexto:          episodio.contexto,
        gatillantes:       episodio.gatillantes,
        estado_padre:      episodio.estadoPadre,
        fecha:             episodio.fecha,
        emocion:           episodio.emocion,
        descripcion_libre: episodio.descripcionLibre,
      })
      .select('id')
      .single()
    if (insErr || !inserted?.id) {
      console.error('[onboardingPersistor] No se pudo crear el primer episodio:', insErr)
      return
    }
    const episodioId = inserted.id

    // 2. Marca de origen, en su propio UPDATE para tolerar que la columna
    //    `origen` no exista todavia (el codigo se despliega antes del SQL).
    supabase
      .from('episodios')
      .update({ origen: 'onboarding' })
      .eq('id', episodioId)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          console.warn('[onboardingPersistor] origen no se guardo (falta la migracion 015?):', error.message)
        }
      })

    // 3. Extraccion en segundo plano. Afina tipo/emocion/contexto sobre el
    //    episodio ya creado. Devuelve el episodio (afinado o crudo) para que
    //    la orientacion, que viene encadenada, trabaje con el mejor dato.
    const afinar = async () => {
      try {
        const extraido = await extraerEpisodio({ transcripcion: relato, hijo })
        const afinado = {
          ...episodio,
          tipo:     extraido?.tipo || 'otro',
          contexto: extraido?.contexto || '',
          emocion:  extraido?.emocion?.especifica || null,
        }
        const { error } = await supabase
          .from('episodios')
          .update({ tipo: afinado.tipo, contexto: afinado.contexto, emocion: afinado.emocion })
          .eq('id', episodioId)
          .eq('user_id', userId)
        if (error) {
          console.warn('[onboardingPersistor] No se pudo afinar el primer episodio:', error.message)
        }
        return afinado
      } catch (err) {
        console.warn('[onboardingPersistor] extraerEpisodio fallo, el episodio queda en "otro":', err)
        return episodio
      }
    }

    // 4. Orientacion completa, encadenada a la extraccion. Sin await: el Home
    //    no espera ni por la una ni por la otra.
    afinar()
      .then((ep) => analizarEpisodio({ hijo, episodio: ep, historialReciente: [], bloqueRutina: null }))
      .then(async ({ texto: orientacion, zona }) => {
        if (!orientacion || !orientacion.trim()) return
        const { error: oriErr } = await supabase
          .from('episodios')
          .update({ orientacion_ia: orientacion })
          .eq('id', episodioId)
          .eq('user_id', userId)
        if (oriErr) {
          console.error('[onboardingPersistor] No se pudo guardar la orientacion del primer episodio:', oriErr)
          return
        }
        const { error: zonaErr } = await supabase
          .from('episodios')
          .update({ orientacion_zona: zona ?? null })
          .eq('id', episodioId)
          .eq('user_id', userId)
        if (zonaErr) {
          console.warn('[onboardingPersistor] orientacion_zona no se guardo (falta la migracion 014?):', zonaErr.message)
        }
      })
      .catch((err) => {
        // Igual que un episodio manual donde la IA fallo: queda guardado sin
        // orientacion y el padre lo ve en el Home como cualquier otro.
        console.error('[onboardingPersistor] analizarEpisodio del primer episodio fallo:', err)
      })
  } catch (err) {
    console.error('[onboardingPersistor] crearPrimerEpisodio fallo:', err)
  }
}

