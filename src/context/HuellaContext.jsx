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

const initialState = {
  hijo: null,
  episodios: [],
  estrategias: [],
  hitos: [],
  padreNombre: '',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_HIJO':
      return { ...state, hijo: action.payload }
    case 'SET_EPISODIOS':
      return { ...state, episodios: action.payload }
    case 'SET_HITOS':
      return { ...state, hitos: action.payload }
    case 'SET_ESTRATEGIAS':
      return { ...state, estrategias: action.payload }
    case 'ADD_EPISODIO':
      return { ...state, episodios: [action.payload, ...state.episodios] }
    case 'ADD_HITO':
      return { ...state, hitos: [action.payload, ...state.hitos] }
    case 'ADD_ESTRATEGIA':
      return { ...state, estrategias: [action.payload, ...state.estrategias] }
    case 'REMOVE_EPISODIO':
      return { ...state, episodios: state.episodios.filter((e) => e.id !== action.payload) }
    case 'REMOVE_HITO':
      return { ...state, hitos: state.hitos.filter((h) => h.id !== action.payload) }
    case 'REMOVE_ESTRATEGIA':
      return { ...state, estrategias: state.estrategias.filter((e) => e.id !== action.payload) }
    case 'UPDATE_EPISODIO':
      return {
        ...state,
        episodios: state.episodios.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      }
    case 'UPDATE_ESTRATEGIA':
      return {
        ...state,
        estrategias: state.estrategias.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      }
    case 'SET_PADRE_NOMBRE':
      return { ...state, padreNombre: action.payload }
    case 'LOAD_STATE':
      return { ...initialState, ...action.payload }
    default:
      return state
  }
}

function dbEpisodioToApp(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    intensidad: row.intensidad,
    contexto: row.contexto,
    gatillantes: row.gatillantes ?? [],
    estadoPadre: row.estado_padre,
    fecha: row.fecha,
    orientacionIA:    row.orientacion_ia    ?? null,
    emocion:          row.emocion           ?? null,
    descripcionLibre: row.descripcion_libre ?? null,
    reflexion:        row.reflexion         ?? null,
    fotoUrl:          row.foto_url          ?? null,
  }
}

function dbEstrategiaToApp(row) {
  return {
    id: row.id,
    habilidad: row.habilidad,
    descripcion: row.descripcion,
    plan: row.plan,
    fechaInicio: row.fecha_inicio,
    semanaActual: row.semana_actual,
    tareas: row.tareas ?? {},
    checkins: row.checkins ?? {},
  }
}

export function HuellaProvider({ children }) {
  const { user } = useAuth()
  const { family, familyLoading } = useFamily()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [dataLoading, setDataLoading] = useState(false)

  // Incluimos family?.partner?.id en las deps para recargar cuando se conecta la pareja
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD_STATE', payload: initialState })
      return
    }
    if (familyLoading) {
      console.log('[HuellaContext] useEffect: esperando familyLoading...')
      return
    }
    console.log('[HuellaContext] useEffect: disparando loadUserData', { familyId: family?.familyId, partnerId: family?.partner?.id })
    loadUserData(user.id, family)
  }, [user?.id, familyLoading, family?.familyId, family?.partner?.id])

  // currentFamily se pasa explícitamente — no usar la variable `family` del closure
  async function loadUserData(userId, currentFamily) {
    console.log('[HuellaContext] loadUserData START', { userId, familyId: currentFamily?.familyId })
    setDataLoading(true)
    try {
      const partnerIds = currentFamily?.partner?.id
        ? [userId, currentFamily.partner.id]
        : [userId]

      // RLS returns own hijo (own_data) + family hijo (family_read) automatically.
      // No explicit family_id filter needed — avoids dependency on currentFamily timing.
      const hijosQuery = supabase.from('hijos').select('*')

      const [hijosRes, episodiosRes, hitosRes, estrategiasRes, perfilRes] = await Promise.all([
        hijosQuery,
        supabase.from('episodios')
          .select('*')
          .in('user_id', partnerIds)
          .order('fecha', { ascending: false }),
        supabase.from('hitos')
          .select('*')
          .in('user_id', partnerIds)
          .order('fecha', { ascending: false }),
        supabase.from('estrategias')
          .select('*')
          .in('user_id', partnerIds)
          .order('fecha_inicio', { ascending: false }),
        supabase.from('perfiles')
          .select('nombre')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      console.log('[HuellaContext] hijosRes', { data: hijosRes.data, error: hijosRes.error })

      // Prefer own hijo; fall back to any family hijo returned by RLS
      const hijoRow = (hijosRes.data ?? []).find(r => r.user_id === userId)
        ?? (hijosRes.data ?? [])[0]
        ?? null

      console.log('[HuellaContext] hijoRow seleccionado', hijoRow)

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          hijo: hijoRow ? {
            nombre:          hijoRow.nombre,
            edad:            calcularEdad(hijoRow.fecha_nacimiento) ?? hijoRow.edad ?? null,
            avatarUrl:       hijoRow.avatar_url ?? null,
            fechaNacimiento: hijoRow.fecha_nacimiento ?? null,
            genero:          hijoRow.genero ?? null,
          } : null,
          episodios: (episodiosRes.data ?? []).map(dbEpisodioToApp),
          hitos: hitosRes.data ?? [],
          estrategias: (estrategiasRes.data ?? []).map(dbEstrategiaToApp),
          padreNombre: perfilRes.data?.nombre ?? '',
        },
      })
    } catch (e) {
      console.error('[HuellaContext] Error cargando datos:', e)
    } finally {
      setDataLoading(false)
    }
  }

  function reloadData(overrideFamily) {
    console.log('[HuellaContext] reloadData llamado', { overrideFamily, currentFamily: family })
    if (user) loadUserData(user.id, overrideFamily !== undefined ? overrideFamily : family)
  }

  // Helper: IDs para refetch tras mutaciones (propio + pareja si existe)
  function getPartnerIds() {
    return family?.partner?.id ? [user.id, family.partner.id] : [user.id]
  }

  async function setHijo(hijo) {
    if (!user) return
    const anterior = state.hijo
    dispatch({ type: 'SET_HIJO', payload: hijo })
    const rpcParams = {
      p_nombre:            hijo.nombre,
      p_edad:              null,
      p_avatar_url:        hijo.avatarUrl ?? null,
      p_fecha_nacimiento:  hijo.fechaNacimiento ?? null,
      p_genero:            hijo.genero ?? null,
    }
    console.log('[setHijo] llamando upsert_family_child con:', rpcParams)
    const { error } = await supabase.rpc('upsert_family_child', rpcParams)
    if (error) {
      console.error('[setHijo] error en upsert_family_child:', error)
      dispatch({ type: 'SET_HIJO', payload: anterior })
      throw new Error(error.message)
    }
    // Refetch desde DB — RLS devuelve hijo propio + hijo de familia automáticamente
    const refetch = await supabase.from('hijos').select('*')
    const hijoRow = (refetch.data ?? []).find(r => r.user_id === user.id)
      ?? (refetch.data ?? [])[0]
      ?? null
    if (hijoRow) {
      dispatch({ type: 'SET_HIJO', payload: {
        nombre:          hijoRow.nombre,
        edad:            calcularEdad(hijoRow.fecha_nacimiento) ?? hijoRow.edad ?? null,
        avatarUrl:       hijoRow.avatar_url ?? null,
        fechaNacimiento: hijoRow.fecha_nacimiento ?? null,
        genero:          hijoRow.genero ?? null,
      }})
    }
  }

  async function addEpisodio(episodio) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_EPISODIO', payload: episodio })
    const { data: inserted, error } = await supabase
      .from('episodios')
      .insert({
        user_id:      user.id,
        tipo:         episodio.tipo,
        intensidad:   episodio.intensidad,
        contexto:     episodio.contexto,
        gatillantes:  episodio.gatillantes,
        estado_padre: episodio.estadoPadre,
        fecha:            episodio.fecha,
        emocion:          episodio.emocion          ?? null,
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

  async function addHito(hito) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_HITO', payload: hito })
    const { data: inserted, error } = await supabase.from('hitos').insert({
      user_id:     user.id,
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
      .order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_HITOS', payload: data })
    return inserted
  }

  async function updateHitoFoto(hitoId, fotoUrl) {
    if (!user) return
    await supabase.from('hitos').update({ foto_url: fotoUrl }).eq('id', hitoId).eq('user_id', user.id)
    const { data } = await supabase
      .from('hitos').select('*')
      .in('user_id', getPartnerIds())
      .order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_HITOS', payload: data })
  }

  async function addEstrategia(estrategia) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_ESTRATEGIA', payload: estrategia })
    const { data: inserted, error } = await supabase.from('estrategias').insert({
      user_id:       user.id,
      habilidad:     estrategia.habilidad,
      descripcion:   estrategia.descripcion,
      plan:          estrategia.plan,
      fecha_inicio:  estrategia.fechaInicio,
      semana_actual: estrategia.semanaActual,
      tareas:        estrategia.tareas ?? {},
    }).select().single()
    if (error) {
      dispatch({ type: 'REMOVE_ESTRATEGIA', payload: estrategia.id })
      throw new Error(error.message)
    }
    const realId = inserted?.id ?? estrategia.id
    const { data } = await supabase
      .from('estrategias').select('*')
      .in('user_id', getPartnerIds())
      .order('fecha_inicio', { ascending: false })
    if (data) dispatch({ type: 'SET_ESTRATEGIAS', payload: data.map(dbEstrategiaToApp) })
    return realId
  }

  async function savePadreNombre(nombre) {
    if (!user) return
    dispatch({ type: 'SET_PADRE_NOMBRE', payload: nombre })
    const { error } = await supabase
      .from('perfiles')
      .upsert({ user_id: user.id, nombre }, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }

  async function updateEstrategia(partial) {
    if (!user) return
    dispatch({ type: 'UPDATE_ESTRATEGIA', payload: partial })
    const dbFields = {}
    if (partial.semanaActual !== undefined) dbFields.semana_actual = partial.semanaActual
    if (partial.plan         !== undefined) dbFields.plan          = partial.plan
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
        .order('fecha_inicio', { ascending: false })
      if (data) dispatch({ type: 'SET_ESTRATEGIAS', payload: data.map(dbEstrategiaToApp) })
      throw new Error(error.message)
    }
  }

  return (
    <HuellaContext.Provider value={{
      state,
      dispatch,
      dataLoading,
      reloadData,
      setHijo,
      addEpisodio,
      updateEpisodio,
      deleteEpisodio,
      addHito,
      updateHitoFoto,
      addEstrategia,
      updateEstrategia,
      deleteEstrategia,
      savePadreNombre,
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
