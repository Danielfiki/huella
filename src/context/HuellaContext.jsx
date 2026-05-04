import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useFamily } from './FamilyContext'

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
  hijos:        [],
  hijoActivoId: null,
  hijo:         null,   // derivado: hijos.find(h => h.id === hijoActivoId) ?? null
  episodios:    [],
  estrategias:  [],
  hitos:        [],
  rutinas:      [],
  padreNombre:  '',
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

    case 'SET_PADRE_NOMBRE':
      return { ...state, padreNombre: action.payload }

    case 'LOAD_STATE':
      return syncHijo({ ...initialState, ...action.payload })

    default:
      return state
  }
}

// ── Mappers DB → app ──────────────────────────────────────────────────────────

function dbRutinaToApp(row) {
  return {
    id:              row.id,
    hijoId:          row.hijo_id,
    hora:            row.hora,
    nombre:          row.nombre,
    nota:            row.nota            ?? null,
    esMomentoRiesgo: row.es_momento_riesgo ?? false,
    createdAt:       row.created_at,
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
  }
}

function dbEpisodioToApp(row) {
  return {
    id:               row.id,
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
  }
}

function dbEstrategiaToApp(row) {
  return {
    id:               row.id,
    habilidad:        row.habilidad,
    descripcion:      row.descripcion,
    plan:             row.plan,
    fechaInicio:      row.fecha_inicio,
    semanaActual:     row.semana_actual,
    tareas:           row.tareas            ?? {},
    checkins:         row.checkins          ?? {},
    episodioOrigenId: row.episodio_origen_id ?? null,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function HuellaProvider({ children }) {
  const { user } = useAuth()
  const { family, familyLoading } = useFamily()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [dataLoading, setDataLoading] = useState(false)

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
    const [episodiosRes, hitosRes, estrategiasRes, rutinasRes] = await Promise.all([
      supabase.from('episodios')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('fecha', { ascending: false }),
      supabase.from('hitos')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('fecha', { ascending: false }),
      supabase.from('estrategias')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('fecha_inicio', { ascending: false }),
      supabase.from('rutinas')
        .select('*').in('user_id', partnerIds)
        .eq('hijo_id', hijoId)
        .order('hora', { ascending: true }),
    ])
    dispatch({ type: 'SET_EPISODIOS',   payload: (episodiosRes.data   ?? []).map(dbEpisodioToApp) })
    dispatch({ type: 'SET_HITOS',       payload:  hitosRes.data        ?? [] })
    dispatch({ type: 'SET_ESTRATEGIAS', payload: (estrategiasRes.data  ?? []).map(dbEstrategiaToApp) })
    dispatch({ type: 'SET_RUTINAS',     payload: (rutinasRes.data      ?? []).map(dbRutinaToApp) })
  }

  async function loadUserData(userId, currentFamily) {
    setDataLoading(true)
    try {
      const partnerIds = getPartnerIds(currentFamily)

      // Fase 1: hijos y perfil (necesitamos hijoActivoId antes de cargar el resto)
      const [hijosRes, perfilRes] = await Promise.all([
        supabase.from('hijos').select('*').order('created_at', { ascending: true }),
        supabase.from('perfiles').select('nombre').eq('user_id', userId).maybeSingle(),
      ])

      const hijos = (hijosRes.data ?? []).map(dbHijoToApp)
      const ids = new Set(hijos.map(h => h.id))
      const hijoActivoId = ids.has(state.hijoActivoId)
        ? state.hijoActivoId
        : (hijos[0]?.id ?? null)

      // Fase 2: datos filtrados por hijo activo
      let episodios = [], hitos = [], estrategias = [], rutinas = []
      if (hijoActivoId) {
        const [episodiosRes, hitosRes, estrategiasRes, rutinasRes] = await Promise.all([
          supabase.from('episodios')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('fecha', { ascending: false }),
          supabase.from('hitos')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('fecha', { ascending: false }),
          supabase.from('estrategias')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('fecha_inicio', { ascending: false }),
          supabase.from('rutinas')
            .select('*').in('user_id', partnerIds)
            .eq('hijo_id', hijoActivoId)
            .order('hora', { ascending: true }),
        ])
        episodios   = (episodiosRes.data   ?? []).map(dbEpisodioToApp)
        hitos       =  hitosRes.data        ?? []
        estrategias = (estrategiasRes.data  ?? []).map(dbEstrategiaToApp)
        rutinas     = (rutinasRes.data      ?? []).map(dbRutinaToApp)
      }

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          hijos,
          hijoActivoId,
          episodios,
          hitos,
          estrategias,
          rutinas,
          padreNombre: perfilRes.data?.nombre ?? '',
        },
      })
    } catch (e) {
      console.error('Error cargando datos:', e)
    } finally {
      setDataLoading(false)
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

    const rpcParams = {
      p_nombre:            datos.nombre,
      p_edad:              null,
      p_avatar_url:        datos.avatarUrl       ?? null,
      p_fecha_nacimiento:  datos.fechaNacimiento ?? null,
      p_genero:            datos.genero          ?? null,
      p_hijo_id:           hijoId                ?? null,
    }

    if (hijoId) {
      // Optimistic update para edición
      const anterior = state.hijos.find(h => h.id === hijoId)
      dispatch({ type: 'UPDATE_HIJO', payload: { id: hijoId, ...datos } })

      const { data: returnedId, error } = await supabase.rpc('upsert_family_child', rpcParams)
      if (error) {
        console.error('[setHijo] error en upsert_family_child:', error)
        if (anterior) dispatch({ type: 'UPDATE_HIJO', payload: anterior })
        throw new Error(error.message)
      }
      const { data: hijoRow } = await supabase
        .from('hijos').select('*').eq('id', returnedId).maybeSingle()
      if (hijoRow) dispatch({ type: 'UPDATE_HIJO', payload: dbHijoToApp(hijoRow) })
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
      const nuevoHijo = dbHijoToApp(hijoRow)
      dispatch({ type: 'ADD_HIJO',        payload: nuevoHijo })
      dispatch({ type: 'SET_HIJO_ACTIVO', payload: nuevoHijo.id })
    }
    return returnedId
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
    if (data) dispatch({ type: 'SET_EPISODIOS', payload: data.map(dbEpisodioToApp) })
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
    await supabase.from('episodios').update(dbFields).eq('id', partial.id).eq('user_id', user.id)
  }

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
    if (data) dispatch({ type: 'SET_HITOS', payload: data })
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
      if (data) dispatch({ type: 'SET_HITOS', payload: data })
      throw new Error(error.message)
    }
  }

  async function updateHitoFoto(hitoId, fotoUrl) {
    if (!user) return
    await supabase.from('hitos').update({ foto_url: fotoUrl }).eq('id', hitoId).eq('user_id', user.id)
    const { data } = await supabase
      .from('hitos').select('*')
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_HITOS', payload: data })
  }

  // ── Estrategias ───────────────────────────────────────────────────────────

  async function addEstrategia(estrategia) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_ESTRATEGIA', payload: estrategia })
    const planNormalizado = (() => {
      if (typeof estrategia.plan !== 'string') return estrategia.plan
      try { return JSON.parse(estrategia.plan) } catch { return estrategia.plan }
    })()
    const { data: inserted, error } = await supabase.from('estrategias').insert({
      user_id:            user.id,
      hijo_id:            state.hijoActivoId ?? null,
      habilidad:          estrategia.habilidad,
      descripcion:        estrategia.descripcion,
      plan:               planNormalizado,
      fecha_inicio:       estrategia.fechaInicio,
      semana_actual:      estrategia.semanaActual,
      tareas:             estrategia.tareas ?? {},
      episodio_origen_id: estrategia.episodioOrigenId ?? null,
    }).select().single()
    if (error) {
      dispatch({ type: 'REMOVE_ESTRATEGIA', payload: estrategia.id })
      throw new Error(error.message)
    }
    const realId = inserted?.id ?? estrategia.id
    const { data } = await supabase
      .from('estrategias').select('*')
      .in('user_id', getPartnerIds())
      .eq('hijo_id', state.hijoActivoId)
      .order('fecha_inicio', { ascending: false })
    if (data) dispatch({ type: 'SET_ESTRATEGIAS', payload: data.map(dbEstrategiaToApp) })
    return realId
  }

  async function updateEstrategia(partial) {
    if (!user) return
    dispatch({ type: 'UPDATE_ESTRATEGIA', payload: partial })
    const dbFields = {}
    if (partial.semanaActual !== undefined) dbFields.semana_actual = partial.semanaActual
    if (partial.plan !== undefined) {
      const p = partial.plan
      dbFields.plan = (() => {
        if (typeof p !== 'string') return p
        try { return JSON.parse(p) } catch { return p }
      })()
    }
    if (partial.habilidad    !== undefined) dbFields.habilidad     = partial.habilidad
    if (partial.tareas       !== undefined) dbFields.tareas        = partial.tareas
    if (partial.checkins     !== undefined) dbFields.checkins      = partial.checkins
    await supabase.from('estrategias').update(dbFields).eq('id', partial.id).eq('user_id', user.id)
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

  async function savePadreNombre(nombre) {
    if (!user) return
    dispatch({ type: 'SET_PADRE_NOMBRE', payload: nombre })
    const { error } = await supabase
      .from('perfiles')
      .upsert({ user_id: user.id, nombre }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }

  return (
    <HuellaContext.Provider value={{
      state,
      dispatch,
      dataLoading,
      reloadData,
      setHijo,
      setHijoActivo,
      addEpisodio,
      updateEpisodio,
      deleteEpisodio,
      addHito,
      deleteHito,
      updateHitoFoto,
      addEstrategia,
      updateEstrategia,
      deleteEstrategia,
      addRutina,
      updateRutina,
      deleteRutina,
      savePadreNombre,
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
