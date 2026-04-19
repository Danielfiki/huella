import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const HuellaContext = createContext(null)

const initialState = {
  hijo: null,
  episodios: [],
  estrategias: [],
  hitos: [],
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
    orientacionIA: row.orientacion_ia ?? null,
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
  }
}

export function HuellaProvider({ children }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD_STATE', payload: initialState })
      return
    }
    loadUserData(user.id)
  }, [user?.id])

  async function loadUserData(userId) {
    setDataLoading(true)
    try {
      const [hijosRes, episodiosRes, hitosRes, estrategiasRes] = await Promise.all([
        supabase.from('hijos').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('episodios').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
        supabase.from('hitos').select('*').eq('user_id', userId).order('fecha', { ascending: false }),
        supabase.from('estrategias').select('*').eq('user_id', userId).order('fecha_inicio', { ascending: false }),
      ])
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          hijo: hijosRes.data ? { nombre: hijosRes.data.nombre, edad: hijosRes.data.edad, avatarUrl: hijosRes.data.avatar_url ?? null } : null,
          episodios: (episodiosRes.data ?? []).map(dbEpisodioToApp),
          hitos: hitosRes.data ?? [],
          estrategias: (estrategiasRes.data ?? []).map(dbEstrategiaToApp),
        },
      })
    } catch (e) {
      console.error('Error cargando datos del usuario:', e)
    } finally {
      setDataLoading(false)
    }
  }

  async function setHijo(hijo) {
    if (!user) return
    const anterior = state.hijo
    dispatch({ type: 'SET_HIJO', payload: hijo })
    const { error } = await supabase.from('hijos').upsert(
      { user_id: user.id, nombre: hijo.nombre, edad: hijo.edad, avatar_url: hijo.avatarUrl ?? null },
      { onConflict: 'user_id' }
    )
    if (error) {
      dispatch({ type: 'SET_HIJO', payload: anterior })
      throw new Error(error.message)
    }
  }

  async function addEpisodio(episodio) {
    if (!user || !supabase) return null
    dispatch({ type: 'ADD_EPISODIO', payload: episodio })
    const { data: inserted, error } = await supabase
      .from('episodios')
      .insert({
        user_id: user.id,
        tipo: episodio.tipo,
        intensidad: episodio.intensidad,
        contexto: episodio.contexto,
        gatillantes: episodio.gatillantes,
        estado_padre: episodio.estadoPadre,
        fecha: episodio.fecha,
      })
      .select()
      .single()
    if (error) {
      dispatch({ type: 'REMOVE_EPISODIO', payload: episodio.id })
      throw new Error(error.message)
    }
    const real = dbEpisodioToApp(inserted)
    const { data } = await supabase
      .from('episodios').select('*').eq('user_id', user.id).order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_EPISODIOS', payload: data.map(dbEpisodioToApp) })
    return real
  }

  async function deleteEpisodio(id) {
    if (!user || !supabase) return
    dispatch({ type: 'REMOVE_EPISODIO', payload: id })
    const { error } = await supabase.from('episodios').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      const { data } = await supabase
        .from('episodios').select('*').eq('user_id', user.id).order('fecha', { ascending: false })
      if (data) dispatch({ type: 'SET_EPISODIOS', payload: data.map(dbEpisodioToApp) })
      throw new Error(error.message)
    }
  }

  async function updateEpisodio(partial) {
    if (!user || !supabase) return
    dispatch({ type: 'UPDATE_EPISODIO', payload: partial })
    const dbFields = {}
    if (partial.orientacionIA !== undefined) dbFields.orientacion_ia = partial.orientacionIA
    await supabase.from('episodios').update(dbFields).eq('id', partial.id).eq('user_id', user.id)
  }

  async function addHito(hito) {
    if (!user || !supabase) return
    dispatch({ type: 'ADD_HITO', payload: hito })
    const { error } = await supabase.from('hitos').insert({
      user_id: user.id,
      categoria: hito.categoria,
      descripcion: hito.descripcion,
      fecha: hito.fecha,
    })
    if (error) {
      dispatch({ type: 'REMOVE_HITO', payload: hito.id })
      throw new Error(error.message)
    }
    const { data } = await supabase
      .from('hitos').select('*').eq('user_id', user.id).order('fecha', { ascending: false })
    if (data) dispatch({ type: 'SET_HITOS', payload: data })
  }

  async function addEstrategia(estrategia) {
    if (!user || !supabase) return
    dispatch({ type: 'ADD_ESTRATEGIA', payload: estrategia })
    const { error } = await supabase.from('estrategias').insert({
      user_id: user.id,
      habilidad: estrategia.habilidad,
      descripcion: estrategia.descripcion,
      plan: estrategia.plan,
      fecha_inicio: estrategia.fechaInicio,
      semana_actual: estrategia.semanaActual,
    })
    if (error) {
      dispatch({ type: 'REMOVE_ESTRATEGIA', payload: estrategia.id })
      throw new Error(error.message)
    }
    const { data } = await supabase
      .from('estrategias').select('*').eq('user_id', user.id).order('fecha_inicio', { ascending: false })
    if (data) dispatch({ type: 'SET_ESTRATEGIAS', payload: data.map(dbEstrategiaToApp) })
  }

  async function updateEstrategia(partial) {
    if (!user) return
    dispatch({ type: 'UPDATE_ESTRATEGIA', payload: partial })
    const dbFields = {}
    if (partial.semanaActual !== undefined) dbFields.semana_actual = partial.semanaActual
    if (partial.plan !== undefined) dbFields.plan = partial.plan
    if (partial.habilidad !== undefined) dbFields.habilidad = partial.habilidad
    await supabase.from('estrategias').update(dbFields).eq('id', partial.id).eq('user_id', user.id)
  }

  return (
    <HuellaContext.Provider value={{
      state,
      dispatch,
      dataLoading,
      setHijo,
      addEpisodio,
      updateEpisodio,
      deleteEpisodio,
      addHito,
      addEstrategia,
      updateEstrategia,
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
