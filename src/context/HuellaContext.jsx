import React, { createContext, useContext, useReducer, useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useFamily } from './FamilyContext'
import { generarAccionInmediata, detectarRasgos } from '../services/anthropic'
import colaRegeneracion from '../utils/colaRegeneracionAccionRapida'

const HuellaContext = createContext(null)

export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad >= 0 ? edad : null
}

// state.hijo siempre apunta al elemento activo de state.hijos[].
// Es un campo derivado mantenido por el reducer — la UI existente
// que lee state.hijo sigue funcionando sin cambios.
const initialState = {
  hijos:                [],
  hijoActivoId:         null,
  hijo:                 null,   // derivado: hijos.find(h => h.id === hijoActivoId) ?? null
  episodios:            [],
  estrategias:          [],
  hitos:                [],
  rutinas:              [],
  rasgos:               [],
  padreNombre:          '',
  plan:                 null,
  sugerenciaEstrategia: null,
}

function syncHijo(state) {
  const hijo = state.hijos.find(h => h.id === state.hijoActivoId) ?? null
  return { ...state, hijo }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_HIJOS':
      return syncHijo({ ...state, hijos: action.payload })

    case 'ADD_HIJO':
      return syncHijo({ ...state, hijos: [...state.hijos, action.payload] })

    case 'UPDATE_HIJO':
      return syncHijo({
        ...state,
        hijos: state.hijos.map(h =>
          h.id === action.payload.id ? { ...h, ...action.payload } : h
        ),
      })

    case 'SET_HIJO_ACTIVO':
      return syncHijo({ ...state, hijoActivoId: action.payload })

    case 'SET_EPISODIOS':
      return { ...state, episodios: action.payload }

    case 'SET_HITOS':
      return { ...state, hitos: action.payload }

    case 'SET_ESTRATEGIAS':
      return { ...state, estrategias: action.payload }

    case 'SET_RUTINAS':
      return { ...state, rutinas: action.payload }

    case 'ADD_RUTINA':
      return {
        ...state,
        rutinas: [...state.rutinas, action.payload].sort((a, b) => a.hora.localeCompare(b.hora)),
      }

    case 'UPDATE_RUTINA':
      return {
        ...state,
        rutinas: state.rutinas
          .map((r) => (r.id === action.payload.id ? { ...r, ...action.payload } : r))
          .sort((a, b) => a.hora.localeCompare(b.hora)),
      }

    case 'REMOVE_RUTINA':
      return { ...state, rutinas: state.rutinas.filter((r) => r.id !== action.payload) }

    case 'SET_RASGOS':
      return { ...state, rasgos: action.payload }

    case 'ADD_RASGO':
      return { ...state, rasgos: [...state.rasgos, action.payload] }

    case 'UPDATE_RASGO':
      return {
        ...state,
        rasgos: state.rasgos.map((r) => (r.id === action.payload.id ? action.payload : r)),
      }

    case 'ADD_EPISODIO':
      return { ...state, episodios: [action.payload, ...state.episodios] }

    case 'ADD_HITO':
      return { ...state, hitos: [action.payload, ...state.hitos] }

    case 'ADD_ESTRATEGIA':
      return { ...state, estrategias: [action.payload, ...state.estrategias] }

    case 'REMOVE_EPISODIO':
      return { ...state, episodios: state.episodios.filter(e => e.id !== action.payload) }

    case 'REMOVE_HITO':
      return { ...state, hitos: state.hitos.filter(h => h.id !== action.payload) }

    case 'REMOVE_ESTRATEGIA':
      return { ...state, estrategias: state.estrategias.filter(e => e.id !== action.payload) }

    case 'ESTRATEGIA_CREADA':
      return { ...state, estrategias: [...state.estrategias, action.plan] }

    case 'ESTRATEGIA_AVANZADA':
      return {
        ...state,
        estrategias: state.estrategias.map((p) =>
          p.id !== action.plan_id ? p : {
            ...p,
            semana_actual:  action.semana_actual  ?? p.semana_actual,
            semanaActual:   action.semana_actual  ?? p.semanaActual,
            completado_at:  action.completado_at  ?? p.completado_at,
            checkins:       action.checkins       ?? p.checkins,
          }
        ),
      }

    case 'UPDATE_EPISODIO':
      return {
        ...state,
        episodios: state.episodios.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      }

    case 'UPDATE_ESTRATEGIA':
      return {
        ...state,
        estrategias: state.estrategias.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      }

    case 'SET_SUGERENCIA_ESTRATEGIA':
      return { ...state, sugerenciaEstrategia: action.payload }

    case 'SET_PADRE_NOMBRE':
      return { ...state, padreNombre: action.payload }

    case 'LOAD_STATE':
      return syncHijo({ ...initialState, ...action.payload })

    default:
      return state
  }
}

// ── Fotos privadas: firma de URLs ─────────────────────────────────────────────
// Los buckets 'avatares' y 'momentos' pasan a privados: en la BD se guarda el
// PATH del objeto (`userId/id.jpg`), no una URL. Para mostrar la foto hay que
// firmar una URL temporal en lectura. TTL de 2 h: solo debe sobrevivir la sesion
// de visualizacion; cada carga de datos vuelve a firmar.
const SIGN_TTL = 7200

// Un valor es un PATH (no una URL) si no arranca con http.
function esPath(v) {
  return typeof v === 'string' && v.length > 0 && !v.startsWith('http')
}

// Normaliza cualquier valor a PATH, para lo que se ESCRIBE en la BD:
//   - path                                             → tal cual
//   - URL firmada (.../object/sign/<bucket>/<path>?...)  → <path>
//   - URL publica (.../object/public/<bucket>/<path>?...) → <path>
//   - null / vacio                                     → null
// Evita que, al reenviar el avatarUrl del estado (ya firmado) en un guardado de
// nombre, se pise el path guardado con una URL que expira.
function resolverPath(valor, bucket) {
  if (!valor) return null
  if (esPath(valor)) return valor
  const m = String(valor).match(new RegExp(`/(?:sign|public)/${bucket}/([^?]+)`))
  return m ? decodeURIComponent(m[1]) : valor
}

// Firma un PATH para MOSTRAR. Si no es un path (URL legacy o null) lo deja igual.
async function firmarPath(path, bucket) {
  if (!esPath(path) || !supabase) return path
  try {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL)
    return data?.signedUrl ?? path
  } catch {
    return path
  }
}

// Firma en LOTE el `campo` de una lista de items, para las cargas.
// Tolerante a datos legacy: los valores que aun son URL http se dejan tal cual
// (funcionan mientras el bucket siga publico, durante la transicion de Fase 1).
async function firmarCampo(items, campo, bucket) {
  if (!supabase || !Array.isArray(items) || items.length === 0) return items
  const paths = [...new Set(items.map((it) => it?.[campo]).filter(esPath))]
  if (paths.length === 0) return items
  const mapa = {}
  try {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGN_TTL)
    for (const row of data ?? []) {
      if (row?.path && row?.signedUrl) mapa[row.path] = row.signedUrl
    }
  } catch {
    return items
  }
  return items.map((it) =>
    esPath(it?.[campo]) && mapa[it[campo]]
      ? { ...it, [campo]: mapa[it[campo]] }
      : it
  )
}

// ── Mappers DB → app ──────────────────────────────────────────────────────────

function dbRutinaToApp(row) {
  return {
    id:              row.id,
    userId:          row.user_id,
    hijoId:          row.hijo_id,
    hora:            row.hora,
    nombre:          row.nombre,
    nota:            row.nota            ?? null,
    esMomentoRiesgo: row.es_momento_riesgo ?? false,
    createdAt:       row.created_at,
  }
}

function dbRasgoToApp(row) {
  return {
    id:            row.id,
    userId:        row.user_id,
    hijoId:        row.hijo_id,
    familia:       row.familia,
    titulo:        row.titulo,
    evidencia:     row.evidencia       ?? [],   // jsonb tal cual: [{ episodio_id, fecha }]
    evidenciaCount: row.evidencia_count ?? 0,
    estado:        row.estado,
    confianza:     row.confianza        ?? null,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

function dbHijoToApp(row) {
  return {
    id:              row.id,
    nombre:          row.nombre,
    edad:            calcularEdad(row.fecha_nacimiento) ?? row.edad ?? null,
    avatarUrl:       row.avatar_url ?? null,
    fechaNacimiento: row.fecha_nacimiento ?? null,
    genero:          row.genero ?? null,
    ultimoAutorIa:   row.ultimo_autor_ia ?? null,
  }
}

function dbEpisodioToApp(row) {
  // accionRapida queda agrupada en un sub-objeto para que la UI la consuma
  // como una unidad. Si la columna texto está vacía, devolvemos null para
  // que la EpisodioCard pueda chequear `data?.texto` sin condicionales raros.
  const accionRapida = row.accion_rapida_texto
    ? {
        texto:      row.accion_rapida_texto,
        autor:      row.accion_rapida_autor       ?? null,
        dimension:  row.accion_rapida_dimension   ?? null,
        bucket:     row.accion_rapida_bucket      ?? null,
        generadaEn: row.accion_rapida_generada_en ?? null,
      }
    : null

  return {
    id:               row.id,
    userId:           row.user_id,
    tipo:             row.tipo,
    intensidad:       row.intensidad,
    contexto:         row.contexto,
    gatillantes:      row.gatillantes ?? [],
    estadoPadre:      row.estado_padre,
    fecha:            row.fecha,
    orientacionIA:    row.orientacion_ia    ?? null,
    emocion:          row.emocion           ?? null,
    descripcionLibre: row.descripcion_libre ?? null,
    reflexion:        row.reflexion         ?? null,
    fotoUrl:          row.foto_url          ?? null,
    accionRapida,
  }
}

function parsePlanField(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return raw
}

// Shim de Fase 4 Bloque 1 — rediseño Estrategias con Ciclos.
// Lee del modelo nuevo (estrategia_ciclos) y aplana el "ciclo visible"
// en las claves legacy que la UI sigue esperando. Suma claves aditivas
// para que Bloques 2 y 3 puedan migrar sin tocar este mapper.
//
// Ciclo visible = primero el que está 'activo'; si no hay ninguno
// activo, el más reciente por numero_ciclo. Garantiza continuidad
// visual cuando una estrategia está "entre ciclos".
function dbEstrategiaToApp(row) {
  const ciclosRaw = Array.isArray(row.estrategia_ciclos)
    ? [...row.estrategia_ciclos].sort(
        (a, b) => (b.numero_ciclo ?? 0) - (a.numero_ciclo ?? 0)
      )
    : []

  const ciclos = ciclosRaw.map((c) => ({
    id:               c.id,
    numero_ciclo:     c.numero_ciclo,
    estado:           c.estado,
    plan:             parsePlanField(c.plan),
    semana_actual:    c.semana_actual    ?? 1,
    fecha_inicio:     c.fecha_inicio     ?? null,
    fecha_cierre:     c.fecha_cierre     ?? null,
    duracion_semanas: c.duracion_semanas ?? null,
    cierre_analisis:  c.cierre_analisis  ?? null,
    checkins_legacy:  c.checkins_legacy  ?? null,
    usar_memoria_ia:  c.usar_memoria_ia  ?? true,
    created_at:       c.created_at       ?? null,
    updated_at:       c.updated_at       ?? null,
  }))

  const cicloVisible =
    ciclos.find((c) => c.estado === 'activo') ?? ciclos[0] ?? null

  // Claves que no dependen del ciclo (viven en la fila padre estrategias).
  const base = {
    id:                       row.id,
    userId:                   row.user_id,
    hijo_id:                  row.hijo_id                  ?? null,
    habilidad:                row.habilidad,
    habilidad_nombre:         row.habilidad                ?? null,
    habilidad_grupo:          row.habilidad_grupo          ?? null,
    descripcion:              row.descripcion,
    episodios_detonantes_ids: row.episodios_detonantes_ids ?? [],
    episodio_origen_id:       row.episodio_origen_id       ?? null,
    p4_visto_at:              row.p4_visto_at              ?? null,
    created_at:               row.created_at               ?? null,
    fecha_inicio:             row.fecha_inicio             ?? null,
    fechaInicio:              row.fecha_inicio,
    episodioOrigenId:         row.episodio_origen_id       ?? null,
    // Claves aditivas del modelo de ciclos (consumidas por Bloques 2/3 y Fase 5).
    ciclos,
    ciclo_activo_id:          cicloVisible?.id           ?? null,
    numero_ciclo_actual:      cicloVisible?.numero_ciclo ?? null,
  }

  // Sin ciclos cargados (estrategia recién creada o join vacío):
  // valores neutros que la UI legacy puede consumir sin romperse.
  if (!cicloVisible) {
    return {
      ...base,
      plan:            null,
      checkins:        [],
      tareas:          {},
      semana_actual:   1,
      semanaActual:    1,
      total_semanas:   row.total_semanas ?? 4,
      completado_at:   null,
      abandonado_at:   null,
      cierre_analisis: null,
    }
  }

  // Aplanamos el ciclo visible en las claves que la UI legacy lee.
  // completado_at se deriva: solo está poblado si el ciclo está cerrado.
  return {
    ...base,
    plan:            cicloVisible.plan,
    checkins:        Array.isArray(cicloVisible.checkins_legacy)
                       ? cicloVisible.checkins_legacy
                       : [],
    tareas:          {},
    semana_actual:   cicloVisible.semana_actual ?? 1,
    semanaActual:    cicloVisible.semana_actual ?? 1,
    total_semanas:   cicloVisible.duracion_semanas ?? row.total_semanas ?? 4,
    completado_at:   cicloVisible.estado === 'cerrado' ? cicloVisible.fecha_cierre : null,
    abandonado_at:   null,
    cierre_analisis: cicloVisible.cierre_analisis ?? null,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function HuellaProvider({ children }) {
  const { user } = useAuth()
  const { family, familyLoading } = useFamily()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [dataLoading, setDataLoading] = useState(false)
  // `dataLoaded` distingue "todavía no cargué la cuenta" de "ya cargué y estos
  // son los datos reales". `dataLoading` no sirve para eso porque vale false
  // ANTES de la primera carga y también DESPUÉS. El gate del onboarding (Layout)
  // necesita esta certeza para no mostrarlo en el instante previo a saber si el
  // usuario ya tiene hijo. Una vez true, no vuelve a false.
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD_STATE', payload: initialState })
      return
    }
    if (familyLoading) return
    loadUserData(user.id, family)
  }, [user?.id, familyLoading, family?.familyId, family?.partner?.id])

  function getPartnerIds(currentFamily) {
    const f = currentFamily ?? family
    return f?.partner?.id ? [user.id, f.partner.id] : [user.id]
  }

  // ── Carga de datos por hijo ───────────────────────────────────────────────

  async function loadHijoDatos(hijoId, currentFamily) {
    if (!user || !hijoId) return
    const partnerIds = getPartnerIds(currentFamily)
    const [episodiosRes, hitosRes, estrategiasRes, rutinasRes, rasgosRes] = await Promise.all([
      supabase.from('episodios')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('fecha', { ascending: false }),
      supabase.from('hitos')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('fecha', { ascending: false }),
      supabase.from('estrategias')
        .select(`
          *,
          estrategia_ciclos (
            id, numero_ciclo, estado, plan,
            semana_actual, fecha_inicio, fecha_cierre, duracion_semanas,
            cierre_analisis, checkins_legacy, usar_memoria_ia,
            created_at, updated_at
          )
        `)
        .in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('fecha_inicio', { ascending: false }),
      supabase.from('rutinas')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('hora', { ascending: true }),
      supabase.from('rasgos')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId),
    ])
    dispatch({ type: 'SET_EPISODIOS',   payload: await firmarCampo((episodiosRes.data ?? []).map(dbEpisodioToApp), 'fotoUrl', 'momentos') })
    dispatch({ type: 'SET_HITOS',       payload: await firmarCampo(hitosRes.data ?? [], 'foto_url', 'momentos') })
    dispatch({ type: 'SET_ESTRATEGIAS', payload: (estrategiasRes.data  ?? []).map(dbEstrategiaToApp) })
    dispatch({ type: 'SET_RUTINAS',     payload: (rutinasRes.data      ?? []).map(dbRutinaToApp) })
    dispatch({ type: 'SET_RASGOS',      payload: (rasgosRes.data       ?? []).map(dbRasgoToApp) })
  }

  async function loadUserData(userId, currentFamily) {
    setDataLoading(true)
    try {
      const partnerIds = getPartnerIds(currentFamily)

      // Fase 1: hijos y perfil (necesitamos hijoActivoId antes de cargar el resto)
      const [hijosRes, perfilRes] = await Promise.all([
        supabase.from('hijos').select('*').order('created_at', { ascending: true }),
        supabase.from('perfiles').select('nombre, plan, plan_beta_hasta').eq('user_id', userId).maybeSingle(),
      ])

      const hijos = (hijosRes.data ?? []).map(dbHijoToApp)
      const ids = new Set(hijos.map(h => h.id))
      const hijoActivoId = ids.has(state.hijoActivoId)
        ? state.hijoActivoId
        : (hijos[0]?.id ?? null)

      // Fase 2: datos filtrados por hijo activo
      let episodios = [], hitos = [], estrategias = [], rutinas = [], rasgos = []
      if (hijoActivoId) {
        const [episodiosRes, hitosRes, estrategiasRes, rutinasRes, rasgosRes] = await Promise.all([
          supabase.from('episodios')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('fecha', { ascending: false }),
          supabase.from('hitos')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('fecha', { ascending: false }),
          supabase.from('estrategias')
            .select(`
              *,
              estrategia_ciclos (
                id, numero_ciclo, estado, plan,
                semana_actual, fecha_inicio, fecha_cierre, duracion_semanas,
                cierre_analisis, checkins_legacy, usar_memoria_ia,
                created_at, updated_at
              )
            `)
            .in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('fecha_inicio', { ascending: false }),
          supabase.from('rutinas')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('hora', { ascending: true }),
          supabase.from('rasgos')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId),
        ])
        episodios   = (episodiosRes.data   ?? []).map(dbEpisodioToApp)
        hitos       =  hitosRes.data        ?? []
        estrategias = (estrategiasRes.data  ?? []).map(dbEstrategiaToApp)
        rutinas     = (rutinasRes.data      ?? []).map(dbRutinaToApp)
        rasgos      = (rasgosRes.data       ?? []).map(dbRasgoToApp)
      }

      const hijosF     = await firmarCampo(hijos, 'avatarUrl', 'avatares')
      const episodiosF = await firmarCampo(episodios, 'fotoUrl', 'momentos')
      const hitosF     = await firmarCampo(hitos, 'foto_url', 'momentos')

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          hijos:       hijosF,
          hijoActivoId,
          episodios:   episodiosF,
          hitos:       hitosF,
          estrategias,
          rutinas,
          rasgos,
          padreNombre: perfilRes.data?.nombre ?? '',
          plan:        perfilRes.data?.plan   ?? null,
          plan_beta_hasta: perfilRes.data?.plan_beta_hasta ?? null,
        },
      })
    } catch (e) {
      console.error('Error cargando datos:', e)
    } finally {
      setDataLoading(false)
      // Marca que ya completamos una carga de cuenta (con o sin datos). El gate
      // del onboarding solo decide después de esto.
      setDataLoaded(true)
    }
  }

  function reloadData(overrideFamily) {
    if (user) loadUserData(user.id, overrideFamily !== undefined ? overrideFamily : family)
  }

  // ── Hijos ─────────────────────────────────────────────────────────────────

  async function setHijoActivo(id) {
    dispatch({ type: 'SET_HIJO_ACTIVO', payload: id })
    setDataLoading(true)
    try {
      await loadHijoDatos(id)
    } finally {
      setDataLoading(false)
    }
  }

  // datos: { nombre, avatarUrl?, fechaNacimiento?, genero? }
  // hijoId = null  → INSERT (nuevo hijo); devuelve el UUID generado
  // hijoId = uuid  → UPDATE (edita ese hijo); devuelve el mismo UUID
  async function setHijo(datos, hijoId = null) {
    if (!user) return

    // Foto privada: a la BD va el PATH; a la UI, una URL firmada. `resolverPath`
    // evita que reenviar el avatarUrl del estado (ya firmado) pise el path.
    const avatarPath = resolverPath(datos.avatarUrl, 'avatares')
    const avatarUI   = await firmarPath(avatarPath, 'avatares')
    const datosUI    = { ...datos, avatarUrl: avatarUI }

    const rpcParams = {
      p_nombre:            datos.nombre,
      p_edad:              null,
      p_avatar_url:        avatarPath,
      p_fecha_nacimiento:  datos.fechaNacimiento ?? null,
      p_genero:            datos.genero          ?? null,
      p_hijo_id:           hijoId                ?? null,
    }

    if (hijoId) {
      // Optimistic update para edición
      const anterior = state.hijos.find(h => h.id === hijoId)
      dispatch({ type: 'UPDATE_HIJO', payload: { id: hijoId, ...datosUI } })

      const { data: returnedId, error } = await supabase.rpc('upsert_family_child', rpcParams)
      if (error) {
        console.error('[setHijo] error en upsert_family_child:', error)
        if (anterior) dispatch({ type: 'UPDATE_HIJO', payload: anterior })
        throw new Error(error.message)
      }
      const { data: hijoRow } = await supabase
        .from('hijos').select('*').eq('id', returnedId).maybeSingle()
      if (hijoRow) {
        const [hijoF] = await firmarCampo([dbHijoToApp(hijoRow)], 'avatarUrl', 'avatares')
        dispatch({ type: 'UPDATE_HIJO', payload: hijoF })
      }
      return returnedId
    }

    // Crear nuevo hijo (no hay optimistic — el id lo genera la DB)
    const { data: returnedId, error } = await supabase.rpc('upsert_family_child', rpcParams)
    if (error) {
      console.error('[setHijo] error en upsert_family_child:', error)
      throw new Error(error.message)
    }
    const { data: hijoRow } = await supabase
      .from('hijos').select('*').eq('id', returnedId).maybeSingle()
    if (hijoRow) {
      const [nuevoHijo] = await firmarCampo([dbHijoToApp(hijoRow)], 'avatarUrl', 'avatares')
      dispatch({ type: 'ADD_HIJO',        payload: nuevoHijo })
      dispatch({ type: 'SET_HIJO_ACTIVO', payload: nuevoHijo.id })
    }
    return returnedId
  }

  // Actualiza `hijos.ultimo_autor_ia` después de generar/regenerar una
  // Acción Rápida. Lo usa el flujo de Acción Rápida v1.2 para evitar repetir
  // el mismo autor en episodios consecutivos del mismo hijo.
  async function actualizarUltimoAutorIa(hijoId, autor) {
    if (!user || !supabase || !hijoId || !autor) return
    dispatch({ type: 'UPDATE_HIJO', payload: { id: hijoId, ultimoAutorIa: autor } })
    const { error } = await supabase
      .from('hijos')
      .update({ ultimo_autor_ia: autor })
      .eq('id', hijoId)
    if (error) {
      console.error('[actualizarUltimoAutorIa] fallo:', error)
      // No revertimos el dispatch: queremos que el cliente quede con el autor
      // nuevo aunque la BD haya fallado, para que la próxima generación no
      // repita el mismo autor en la misma sesión.
    }
  }

  // ── Episodios ─────────────────────────────────────────────────────────────

  async function addEpisodio(episodio) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_EPISODIO', payload: episodio })
    const { data: inserted, error } = await supabase
      .from('episodios')
      .insert({
        user_id:           user.id,
        hijo_id:           state.hijoActivoId ?? null,
        tipo:              episodio.tipo,
        intensidad:        episodio.intensidad,
        contexto:          episodio.contexto,
        gatillantes:       episodio.gatillantes,
        estado_padre:      episodio.estadoPadre,
        fecha:             episodio.fecha,
        emocion:           episodio.emocion          ?? null,
        descripcion_libre: episodio.descripcionLibre ?? null,
      })
      .select()
      .single()
    if (error) {
      dispatch({ type: 'REMOVE_EPISODIO', payload: episodio.id })
      throw new Error(error.message)
    }
    const real = dbEpisodioToApp(inserted)
    const { data } = await supabase
      .from('episodios').select('*')
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('fecha', { ascending: false })
    const episodiosApp = data ? await firmarCampo(data.map(dbEpisodioToApp), 'fotoUrl', 'momentos') : null
    if (episodiosApp) dispatch({ type: 'SET_EPISODIOS', payload: episodiosApp })

    // Motor de rasgos — enganche fire-and-forget. Reusa el refetch que ya
    // hicimos (episodiosApp, shape de app) y suma los hitos del hijo activo
    // desde state.hitos (last-known, ya filtrado al hijo activo; sin refetch
    // extra aca). El gatillo cuenta TODO junto: episodios + hitos, cada 5
    // registros totales corre la deteccion. Igual patron que
    // generarAccionInmediata: sin await, errores tragados, NUNCA bloquea ni
    // rompe el guardado. La IA detecta y se persiste en silencio como 'candidato'.
    if (episodiosApp) {
      const hijoActivo = state.hijos.find(h => h.id === state.hijoActivoId) ?? null
      const hitosHijo = (state.hitos || []).filter(h => h.hijo_id === state.hijoActivoId)
      const total = episodiosApp.length + hitosHijo.length
      if (hijoActivo && total > 0 && total % 5 === 0) {
        detectarRasgos({ hijo: hijoActivo, episodios: episodiosApp, hitos: hitosHijo })
          .then(resultado => guardarRasgosDetectados({
            hijoId: state.hijoActivoId,
            rasgosDetectados: resultado.rasgos,
            episodios: episodiosApp,
            hitos: hitosHijo,
          }))
          .catch(err => console.warn('[rasgos] fallo deteccion/guardado:', err))
      }
    }

    return real
  }

  async function deleteEpisodio(id) {
    if (!user || !supabase) return
    dispatch({ type: 'REMOVE_EPISODIO', payload: id })
    const { error } = await supabase
      .from('episodios').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      const { data } = await supabase
        .from('episodios').select('*')
        .in('user_id', getPartnerIds())
        .eq('hijo_id', state.hijoActivoId)
        .order('fecha', { ascending: false })
      if (data) dispatch({ type: 'SET_EPISODIOS', payload: data.map(dbEpisodioToApp) })
      throw new Error(error.message)
    }
  }

  async function updateEpisodio(partial) {
    if (!user || !supabase) return
    dispatch({ type: 'UPDATE_EPISODIO', payload: partial })
    const dbFields = {}
    if (partial.orientacionIA !== undefined) dbFields.orientacion_ia = partial.orientacionIA
    if (partial.reflexion     !== undefined) dbFields.reflexion      = partial.reflexion
    if (partial.fotoUrl       !== undefined) dbFields.foto_url       = partial.fotoUrl
    // Acción Rápida v1.2 — el caller puede pasar un objeto `accionRapida`
    // con forma { texto, autor, dimension, bucket, generadaEn } y se expande
    // a las 5 columnas nuevas. Si pasa `accionRapida: null`, se ponen todas
    // a null (caso uso: invalidación manual).
    if (partial.accionRapida !== undefined) {
      const ar = partial.accionRapida || {}
      dbFields.accion_rapida_texto       = ar.texto      ?? null
      dbFields.accion_rapida_autor       = ar.autor      ?? null
      dbFields.accion_rapida_dimension   = ar.dimension  ?? null
      dbFields.accion_rapida_bucket      = ar.bucket     ?? null
      dbFields.accion_rapida_generada_en = ar.generadaEn ?? null
    }
    if (Object.keys(dbFields).length === 0) return
    await supabase.from('episodios').update(dbFields).eq('id', partial.id).eq('user_id', user.id)
  }

  // ── Rasgos (motor de rasgos · pieza 3: guardado) ───────────────────────────

  // Normaliza un titulo SOLO para comparar en el dedup: trim, minuscula y sin
  // tildes. No altera el titulo que se guarda; es unicamente para detectar si
  // un rasgo detectado ya existe en la tabla.
  function normalizarTitulo(t) {
    return (t || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // colapsa espacios internos multiples a uno solo (dos o tres -> uno)
      .replace(/\s+/g, ' ')
      // quita puntuacion de los bordes (punto, coma, dos puntos, punto y coma,
      // comillas) al inicio o al final; NO toca la puntuacion interna
      .replace(/^["'.,;:]+|["'.,;:]+$/g, '')
  }

  // Persiste en silencio los rasgos que detecto la IA. Corre en background
  // (fire-and-forget desde addEpisodio y addHito), por eso NO hace dispatch
  // optimista: no hay UI esperando. Transforma la evidencia (que llega como
  // { tipo, id }) a jsonb [{ tipo, id, fecha }] cubriendo episodios Y hitos,
  // deduplica contra los rasgos del hijo y, si el rasgo ya existe, fusiona
  // evidencia en vez de duplicar la fila. NUNCA propaga errores: solo loguea
  // (no debe romper el guardado del momento).
  async function guardarRasgosDetectados({ hijoId, rasgosDetectados, episodios, hitos }) {
    try {
      if (!user || !supabase || !hijoId) return
      if (!Array.isArray(rasgosDetectados) || rasgosDetectados.length === 0) return

      // Mapa id -> { tipo, fecha } cubriendo episodios Y hitos, para resolver
      // cada item de evidencia ({ tipo, id }) a { tipo, id, fecha }.
      const infoPorId = new Map()
      for (const e of (episodios || [])) infoPorId.set(e.id, { tipo: 'episodio', fecha: e.fecha })
      for (const h of (hitos || []))     infoPorId.set(h.id, { tipo: 'hito',     fecha: h.fecha })

      // idDe normaliza la clave de identidad soportando AMBOS shapes de
      // evidencia: el nuevo { tipo, id, fecha } y el viejo { episodio_id, fecha }
      // de las filas antiguas. Asi la fusion deduplica sin romper lo ya guardado.
      const idDe = (item) => item?.id ?? item?.episodio_id

      // Snapshot de los rasgos ya guardados del hijo (mismo filtro de familia/RLS
      // que el resto de los refetch). Sirve para el dedup por familia + titulo.
      const { data: existentesRaw } = await supabase
        .from('rasgos').select('*')
        .in('user_id', getPartnerIds())
        .eq('hijo_id', hijoId)
      const existentes = existentesRaw ?? []

      for (const rasgo of rasgosDetectados) {
        if (!rasgo || !rasgo.familia || !rasgo.titulo) continue

        // a) Evidencia: resuelve cada item { tipo, id } a { tipo, id, fecha }
        //    cruzando contra el mapa de momentos; omite ids que no matchean.
        //    evidencia_count = largo del resultado.
        const evidencia = (rasgo.evidencia || [])
          .map((ev) => {
            const id = ev?.id
            const info = id != null ? infoPorId.get(id) : null
            return info ? { tipo: info.tipo, id, fecha: info.fecha } : null
          })
          .filter(Boolean)
        if (evidencia.length === 0) continue

        // b) Dedup: mismo hijo + misma familia + mismo titulo normalizado.
        const tituloNorm = normalizarTitulo(rasgo.titulo)
        const previo = existentes.find(
          (r) => r.familia === rasgo.familia && normalizarTitulo(r.titulo) === tituloNorm
        )

        if (!previo) {
          // c) No existe -> INSERT nuevo. El estado lo decide el flag esEmergente
          //    que entrega el motor (detectarRasgos): 1-2 momentos = 'emergente',
          //    3 o mas = 'candidato'. Antes no se pasaba estado y todo caia al
          //    default 'candidato' de la tabla; ahora se setea explicito.
          const { error } = await supabase.from('rasgos').insert({
            user_id:         user.id,
            hijo_id:         hijoId,
            familia:         rasgo.familia,
            titulo:          rasgo.titulo,
            estado:          rasgo.esEmergente ? 'emergente' : 'candidato',
            evidencia,
            evidencia_count: evidencia.length,
            confianza:       rasgo.confianza ?? null,
          })
          if (error) console.warn('[rasgos] insert fallo:', error.message)
        } else {
          // d) Ya existe -> UPDATE fusionando evidencia (union por id, sin
          //    duplicar ids ya presentes). idDe soporta el shape viejo
          //    ({ episodio_id }) y el nuevo ({ id }) sin reescribir lo antiguo.
          //    Recalcula count y actualiza confianza. updated_at a mano: la
          //    tabla NO tiene trigger.
          const previaEvidencia = Array.isArray(previo.evidencia) ? previo.evidencia : []
          const idsPresentes = new Set(previaEvidencia.map(idDe))
          const fusion = [
            ...previaEvidencia,
            ...evidencia.filter((x) => !idsPresentes.has(idDe(x))),
          ]
          // Graduacion emergente -> candidato: SOLO si el previo era 'emergente'
          //    Y la evidencia fusionada ya llega a 3 momentos. En cualquier otro
          //    caso se mantiene el estado previo, por lo que confirmado y
          //    descartado NUNCA revierten y un candidato no retrocede.
          const estadoNuevo =
            previo.estado === 'emergente' && fusion.length >= 3
              ? 'candidato'
              : previo.estado
          const { error } = await supabase
            .from('rasgos')
            .update({
              estado:          estadoNuevo,
              evidencia:       fusion,
              evidencia_count: fusion.length,
              confianza:       rasgo.confianza ?? previo.confianza ?? null,
              updated_at:      new Date().toISOString(),
            })
            .eq('id', previo.id)
            .eq('user_id', user.id)
          if (error) console.warn('[rasgos] update fallo:', error.message)
        }
      }

      // Un solo refetch al final -> estado local en sync para la pieza 4 (UI).
      const { data } = await supabase
        .from('rasgos').select('*')
        .in('user_id', getPartnerIds())
        .eq('hijo_id', hijoId)
      if (data) dispatch({ type: 'SET_RASGOS', payload: data.map(dbRasgoToApp) })
    } catch (err) {
      console.warn('[rasgos] fallo guardado:', err)
    }
  }

  // Cambia el estado de un rasgo desde la UI (papa confirma o descarta una
  // propuesta). Mismo patron que updateRutina: filtro .eq('id').eq('user_id')
  // y updated_at a mano (la tabla rasgos no tiene trigger). Es optimista: como
  // la card de propuesta depende de estado==='candidato', al cambiarlo en local
  // la card desaparece al instante; si la BD falla, revierte y avisa.
  async function cambiarEstadoRasgo(rasgoId, estado) {
    if (!user || !supabase || !rasgoId) return
    const previo = state.rasgos.find((r) => r.id === rasgoId)
    if (previo) dispatch({ type: 'UPDATE_RASGO', payload: { ...previo, estado } })
    const { data, error } = await supabase
      .from('rasgos')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', rasgoId)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) {
      if (previo) dispatch({ type: 'UPDATE_RASGO', payload: previo })
      console.warn('[rasgos] cambiar estado fallo:', error.message)
      return
    }
    if (data) dispatch({ type: 'UPDATE_RASGO', payload: dbRasgoToApp(data) })
  }

  function confirmarRasgo(rasgoId) { return cambiarEstadoRasgo(rasgoId, 'confirmado') }
  function descartarRasgo(rasgoId) { return cambiarEstadoRasgo(rasgoId, 'descartado') }

  // ── Hitos ─────────────────────────────────────────────────────────────────

  async function addHito(hito) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_HITO', payload: hito })
    const { data: inserted, error } = await supabase.from('hitos').insert({
      user_id:     user.id,
      hijo_id:     state.hijoActivoId ?? null,
      categoria:   hito.categoria,
      descripcion: hito.descripcion,
      fecha:       hito.fecha,
      foto_url:    null,
    }).select().single()
    if (error) {
      dispatch({ type: 'REMOVE_HITO', payload: hito.id })
      throw new Error(error.message)
    }
    const { data } = await supabase
      .from('hitos').select('*')
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_HITOS', payload: await firmarCampo(data, 'foto_url', 'momentos') })

    // Motor de rasgos — mismo enganche fire-and-forget que en addEpisodio. El
    // gatillo cuenta episodios + hitos del hijo activo: cada 5 registros
    // totales corre la deteccion. Los hitos salen del refetch fresco (data);
    // los episodios del hijo activo de state.episodios (last-known, ya filtrado
    // al hijo activo). Sin await, errores tragados, NUNCA bloquea el guardado.
    if (data) {
      const hijoActivo = state.hijos.find(h => h.id === state.hijoActivoId) ?? null
      const hitosHijo = data
      const episodiosHijo = state.episodios || []
      const total = episodiosHijo.length + hitosHijo.length
      if (hijoActivo && total > 0 && total % 5 === 0) {
        detectarRasgos({ hijo: hijoActivo, episodios: episodiosHijo, hitos: hitosHijo })
          .then(resultado => guardarRasgosDetectados({
            hijoId: state.hijoActivoId,
            rasgosDetectados: resultado.rasgos,
            episodios: episodiosHijo,
            hitos: hitosHijo,
          }))
          .catch(err => console.warn('[rasgos] fallo deteccion/guardado:', err))
      }
    }

    return inserted
  }

  async function deleteHito(id) {
    if (!user || !supabase) return
    dispatch({ type: 'REMOVE_HITO', payload: id })
    const { error } = await supabase
      .from('hitos').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      const { data } = await supabase
        .from('hitos').select('*')
        .in('user_id', getPartnerIds())
        .eq('hijo_id', state.hijoActivoId)
        .order('fecha', { ascending: false })
      if (data) dispatch({ type: 'SET_HITOS', payload: await firmarCampo(data, 'foto_url', 'momentos') })
      throw new Error(error.message)
    }
  }

  async function updateHitoFoto(hitoId, fotoUrl) {
    if (!user) return
    // A la BD va el PATH (bucket privado); la lista se firma para mostrar.
    const path = resolverPath(fotoUrl, 'momentos')
    await supabase.from('hitos').update({ foto_url: path }).eq('id', hitoId).eq('user_id', user.id)
    const { data } = await supabase
      .from('hitos').select('*')
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_HITOS', payload: await firmarCampo(data, 'foto_url', 'momentos') })
  }

  // ── Estrategias ───────────────────────────────────────────────────────────

  // Helper compartido — crea una estrategia (modelo de ciclos) de forma
  // ATÓMICA vía la RPC public.crear_estrategia_con_ciclo: identidad en
  // `estrategias` + ciclo 1 activo en `estrategia_ciclos`, en una sola
  // transacción (todo o nada, sin huérfanas posibles). La RPC deriva
  // duracion_semanas del plan y setea user_id con auth.uid(). Retorna la
  // fila de estrategias. No hace dispatch — el caller refresca el estado.
  async function crearEstrategiaConCiclo(input) {
    if (!user || !supabase) throw new Error('Sesión inválida.')

    // Parseo del plan ANTES de la llamada: si viene como string lo
    // convertimos a objeto; si ya es objeto, tal cual. La RPC espera un
    // objeto jsonb, nunca un string.
    const plan = (() => {
      if (input.plan == null) return null
      if (typeof input.plan !== 'string') return input.plan
      try { return JSON.parse(input.plan) } catch { return input.plan }
    })()

    const { data, error } = await supabase.rpc('crear_estrategia_con_ciclo', {
      p_hijo_id:                  input.hijo_id ?? null,
      p_habilidad:                input.habilidad,
      p_habilidad_grupo:          input.habilidad_grupo ?? null,
      p_descripcion:              input.descripcion ?? null,
      p_fecha_inicio:             input.fecha_inicio ?? null,
      p_episodio_origen_id:       input.episodio_origen_id ?? null,
      p_episodios_detonantes_ids: input.episodios_detonantes_ids ?? [],
      p_plan:                     plan,
    })

    if (error) throw new Error(error.message)

    return data
  }

  // Refresca solo el array de estrategias del hijo activo con el join
  // anidado a estrategia_ciclos (mismo shape que loadHijoDatos).
  async function reloadEstrategias() {
    if (!user || !supabase || !state.hijoActivoId) return
    const { data } = await supabase
      .from('estrategias')
      .select(`
        *,
        estrategia_ciclos (
          id, numero_ciclo, estado, plan,
          semana_actual, fecha_inicio, fecha_cierre, duracion_semanas,
          cierre_analisis, checkins_legacy, usar_memoria_ia,
          created_at, updated_at
        )
      `)
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('fecha_inicio', { ascending: false })
    if (data) dispatch({ type: 'SET_ESTRATEGIAS', payload: data.map(dbEstrategiaToApp) })
  }

  async function addEstrategia(estrategia) {
    if (!user || !supabase) return null
    try {
      const row = await crearEstrategiaConCiclo({
        hijo_id:            state.hijoActivoId ?? null,
        habilidad:          estrategia.habilidad,
        descripcion:        estrategia.descripcion,
        plan:               estrategia.plan,
        fecha_inicio:       estrategia.fechaInicio,
        episodio_origen_id: estrategia.episodioOrigenId ?? null,
      })
      await reloadEstrategias()
      return row.id
    } catch (err) {
      console.error('addEstrategia falló', err)
      throw err
    }
  }

  // ZOMBIE: sin callers reales hoy. Refactor de Fase 4 Bloque 2B para
  // que, si algún flujo futuro la usa, escriba en el ciclo activo y no
  // en columnas legacy de estrategias (que se dropean en Fase 2b).
  // Sin rama de identidad (habilidad/descripcion): nadie la pasa.
  async function updateEstrategia(partial) {
    if (!user || !supabase || !partial?.id) return
    const dbFields = {}
    if (partial.semanaActual !== undefined) dbFields.semana_actual = partial.semanaActual
    if (partial.plan !== undefined) {
      const p = partial.plan
      dbFields.plan = (() => {
        if (typeof p !== 'string') return p
        try { return JSON.parse(p) } catch { return p }
      })()
    }
    if (partial.checkins !== undefined) dbFields.checkins_legacy = partial.checkins
    if (Object.keys(dbFields).length === 0) return
    const { error } = await supabase
      .from('estrategia_ciclos')
      .update(dbFields)
      .eq('estrategia_id', partial.id)
      .eq('estado', 'activo')
    if (error) throw new Error(error.message)
    await reloadEstrategias()
  }

  async function deleteEstrategia(id) {
    if (!user || !supabase) return
    dispatch({ type: 'REMOVE_ESTRATEGIA', payload: id })
    const { error } = await supabase
      .from('estrategias').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      const { data } = await supabase
        .from('estrategias').select('*')
        .in('user_id', getPartnerIds())
        .eq('hijo_id', state.hijoActivoId)
        .order('fecha_inicio', { ascending: false })
      if (data) dispatch({ type: 'SET_ESTRATEGIAS', payload: data.map(dbEstrategiaToApp) })
      throw new Error(error.message)
    }
  }

  // Marca el modal P4 (bienvenida al Ciclo 2) como visto. Escribe en la
  // fila padre `estrategias`, no en `estrategia_ciclos`: P4 no avanza el
  // ciclo (ya está creado por P3 Cierre), solo registra que se mostró.
  async function marcarP4Visto(estrategiaId) {
    if (!user || !supabase || !estrategiaId) return
    const { error } = await supabase
      .from('estrategias')
      .update({ p4_visto_at: new Date().toISOString() })
      .eq('id', estrategiaId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await reloadEstrategias()
  }

  // ── Rutinas ───────────────────────────────────────────────────────────────

  async function addRutina(rutina) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_RUTINA', payload: rutina })
    const { data: inserted, error } = await supabase.from('rutinas').insert({
      user_id:           user.id,
      hijo_id:           state.hijoActivoId ?? null,
      hora:              rutina.hora,
      nombre:            rutina.nombre,
      nota:              rutina.nota            ?? null,
      es_momento_riesgo: rutina.esMomentoRiesgo ?? false,
    }).select().single()
    if (error) {
      dispatch({ type: 'REMOVE_RUTINA', payload: rutina.id })
      throw new Error(error.message)
    }
    const { data } = await supabase.from('rutinas').select('*')
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('hora', { ascending: true })
    if (data) dispatch({ type: 'SET_RUTINAS', payload: data.map(dbRutinaToApp) })
    return inserted
  }

  async function updateRutina(partial) {
    if (!user || !supabase) return
    dispatch({ type: 'UPDATE_RUTINA', payload: partial })
    const dbFields = {}
    if (partial.hora            !== undefined) dbFields.hora              = partial.hora
    if (partial.nombre          !== undefined) dbFields.nombre            = partial.nombre
    if (partial.nota            !== undefined) dbFields.nota              = partial.nota
    if (partial.esMomentoRiesgo !== undefined) dbFields.es_momento_riesgo = partial.esMomentoRiesgo
    await supabase.from('rutinas').update(dbFields).eq('id', partial.id).eq('user_id', user.id)
  }

  async function deleteRutina(id) {
    if (!user || !supabase) return
    dispatch({ type: 'REMOVE_RUTINA', payload: id })
    const { error } = await supabase.from('rutinas').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      const { data } = await supabase.from('rutinas').select('*')
        .in('user_id', getPartnerIds())
        .eq('hijo_id', state.hijoActivoId)
        .order('hora', { ascending: true })
      if (data) dispatch({ type: 'SET_RUTINAS', payload: data.map(dbRutinaToApp) })
      throw new Error(error.message)
    }
  }

  // ── Check-ins de episodio ─────────────────────────────────────────────────

  async function addCheckin(episodioId, datos) {
    if (!user || !supabase) return null
    const { data, error } = await supabase
      .from('checkins_episodio')
      .insert({
        episodio_id:    episodioId,
        user_id:        user.id,
        que_intentaste: datos.queIntentaste ?? null,
        respuesta_hijo: datos.respuestaHijo ?? null,
        evolucion:      datos.evolucion     ?? null,
        estado_padre:   datos.estadoPadre   ?? null,
        reflexion_ia:   datos.reflexionIA   ?? null,
      })
      .select().single()
    if (error) throw new Error(error.message)
    return data
  }

  async function getCheckin(episodioId) {
    if (!user || !supabase) return null
    const { data } = await supabase
      .from('checkins_episodio')
      .select('*')
      .eq('episodio_id', episodioId)
      .eq('user_id', user.id)
      .maybeSingle()
    return data ?? null
  }

  async function getCheckinsHechos() {
    if (!user || !supabase) return new Set()
    const { data } = await supabase
      .from('checkins_episodio')
      .select('episodio_id')
      .eq('user_id', user.id)
    return new Set((data ?? []).map(r => r.episodio_id))
  }

  // ── Perfil padre/madre ────────────────────────────────────────────────────

  const isPro   = () =>
    state.plan === 'pro' ||
    state.plan === 'admin' ||
    (!!state.plan_beta_hasta && new Date(state.plan_beta_hasta) > new Date())
  const isAdmin = () => state.plan === 'admin'

  // Lookup userId → { nombre } para mostrar quién registró cada entry.
  // Solo tiene 2 entradas cuando hay familia activa; vacío para usuarios solos.
  const profilesByUserId = useMemo(() => {
    const map = {}
    if (user?.id) map[user.id] = { nombre: state.padreNombre || '' }
    if (family?.partner?.id) map[family.partner.id] = { nombre: family.partner.nombre || '' }
    return map
  }, [user?.id, state.padreNombre, family?.partner?.id, family?.partner?.nombre])

  async function savePadreNombre(nombre) {
    if (!user) return
    dispatch({ type: 'SET_PADRE_NOMBRE', payload: nombre })
    const { error } = await supabase
      .from('perfiles')
      .upsert({ user_id: user.id, nombre }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }

  // Canje de codigo de beta. Logica compartida entre el Home (PanelPage) y la
  // pagina de plan (CuentaPage): asi el mapeo de resultado a mensaje vive en un
  // solo lugar. Llama a la RPC security definer canjear_codigo_beta, que
  // devuelve jsonb { ok, error?, plan_beta_hasta? }. Un codigo malo NO llega
  // como error de transporte: llega como data.ok === false con data.error.
  // En exito hace reloadData() para que isPro() cambie al instante (sin recargar).
  // Devuelve { ok, mensaje } listo para pintar en la UI.
  async function canjearCodigoBeta(codigo) {
    const limpio = (codigo ?? '').trim()
    if (!limpio) {
      return { ok: false, mensaje: 'Ingresa tu código para activar el acceso.' }
    }

    try {
      const { data, error } = await supabase.rpc('canjear_codigo_beta', { p_codigo: limpio })
      if (error) throw new Error(error.message)

      if (data?.ok) {
        await reloadData()   // refresca plan_beta_hasta → isPro() pasa a true sin recargar
        return { ok: true, mensaje: '¡Listo! Ya tienes acceso completo a Huella por la beta 🎉' }
      }

      // data.ok === false: el codigo no sirve, pero la RPC corrio bien.
      if (data?.error === 'ya_usado') {
        return { ok: false, mensaje: 'Este código ya fue usado. Si crees que es un error, escríbenos a contacto@huella.lat' }
      }
      // 'invalido', 'no_auth' o cualquier otro: mensaje generico de codigo invalido.
      return { ok: false, mensaje: 'Ese código no es válido. Revísalo y vuelve a intentar.' }
    } catch (e) {
      console.error('canjearCodigoBeta error:', e)
      return { ok: false, mensaje: 'No pudimos conectar. Intenta de nuevo en un momento.' }
    }
  }

  // Acción Rápida v1.2 — inyectamos el regenerador en la cola para que las
  // EpisodioCards puedan pedir regeneración sin acoplar la cola al context.
  // Usamos refs porque updateEpisodio y actualizarUltimoAutorIa se recrean
  // en cada render del provider, y el useEffect de seteo debe correr una
  // sola vez (sino la cola pierde referencia a la función registrada).
  const updateEpisodioRef       = useRef(updateEpisodio)
  const actualizarUltimoAutorRef = useRef(actualizarUltimoAutorIa)
  useEffect(() => {
    updateEpisodioRef.current       = updateEpisodio
    actualizarUltimoAutorRef.current = actualizarUltimoAutorIa
  })

  useEffect(() => {
    colaRegeneracion.setRegenerador(async (episodio, hijo) => {
      const ultimoAutorUsado = hijo?.ultimoAutorIa ?? null
      const resultado = await generarAccionInmediata({
        hijo,
        episodio,
        ultimoAutorUsado,
        ahora: new Date(),
      })
      // Persistimos en el episodio (5 columnas accion_rapida_*).
      await updateEpisodioRef.current({
        id:           episodio.id,
        accionRapida: resultado,
      })
      // Actualizamos último autor del hijo (anti-repetición).
      if (hijo?.id && resultado?.autor) {
        await actualizarUltimoAutorRef.current(hijo.id, resultado.autor)
      }
      return resultado
    })
  }, [])

  return (
    <HuellaContext.Provider value={{
      state,
      dispatch,
      dataLoading,
      dataLoaded,
      reloadData,
      profilesByUserId,
      setHijo,
      setHijoActivo,
      addEpisodio,
      updateEpisodio,
      deleteEpisodio,
      actualizarUltimoAutorIa,
      addHito,
      deleteHito,
      updateHitoFoto,
      addEstrategia,
      crearEstrategiaConCiclo,
      reloadEstrategias,
      updateEstrategia,
      deleteEstrategia,
      marcarP4Visto,
      addRutina,
      updateRutina,
      deleteRutina,
      rasgos: state.rasgos,
      confirmarRasgo,
      descartarRasgo,
      savePadreNombre,
      canjearCodigoBeta,
      isPro,
      isAdmin,
      addCheckin,
      getCheckin,
      getCheckinsHechos,
    }}>
      {children}
    </HuellaContext.Provider>
  )
}

export function useHuella() {
  const ctx = useContext(HuellaContext)
  if (!ctx) throw new Error('useHuella debe usarse dentro de HuellaProvider')
  return ctx
}
