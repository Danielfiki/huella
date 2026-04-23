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
    orientacionIA: row.orientacion_ia ?? null,
    emocion: row.emocion ?? null,
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
    // Esperar a que FamilyContext termine; family puede ser null (sin pareja) o un objeto
    if (familyLoading) return
    // Pasar family explícitamente para evitar el bug de closure cuando React
    // ejecuta este efecto antes de que FamilyProvider haya terminado su propio efecto
    loadUserData(user.id, family)
  }, [user?.id, familyLoading, family?.familyId, family?.partner?.id])

  // currentFamily se pasa explícitamente — no usar la variable `family` del closure
  async function loadUserData(userId, currentFamily) {
    setDataLoading(true)
    try {
      // IDs a consultar: propio + pareja (si existe)
      const partnerIds = currentFamily?.partner?.id
        ? [userId, currentFamily.partner.id]
        : [userId]

      // Para hijos: primero intenta por family_id (hijo canónico compartido);
      // si no hay resultado (p.ej. family_id aún no propagado), cae a user_id
      let hijosRes
      if (currentFamily?.familyId) {
        hijosRes = await supabase
          .from('hijos').select('*')
          .eq('family_id', currentFamily.familyId)
          .maybeSingle()
        if (!hijosRes.data) {
          // Fallback: puede que la columna family_id aún no esté seteada en la fila existente
          hijosRes = await supabase
            .from('hijos').select('*')
            .eq('user_id', userId)
            .maybeSingle()
        }
      } else {
        hijosRes = await supabase
          .from('hijos').select('*')
          .eq('user_id', userId)
          .maybeSingle()
      }

      // Para episodios/hitos/estrategias: filtro explícito por ambos user_ids.
      // La RLS sigue aplicando como capa de seguridad, pero no dependemos de ella
      // como único mecanismo de filtrado.
      const [episodiosRes, hitosRes, estrategiasRes, perfilRes] = await Promise.all([
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

      dispatch({
        type: 'LOAD_STATE',
        payload: {
          hijo: hijosRes.data ? (() => {
            const row = hijosRes.data
            return {
              nombre:          row.nombre,
              edad:            calcularEdad(row.fecha_nacimiento) ?? row.edad ?? null,
              avatarUrl:       row.avatar_url ?? null,
              fechaNacimiento: row.fecha_nacimiento ?? null,
              genero:          row.genero ?? null,
            }
          })() : null,
          episodios: (episodiosRes.data ?? []).map(dbEpisodioToApp),
          hitos: hitosRes.data ?? [],
          estrategias: (estrategiasRes.data ?? []).map(dbEstrategiaToApp),
          padreNombre: perfilRes.data?.nombre ?? '',
        },
      })
    } catch (e) {
      console.error('Error cargando datos del usuario:', e)
    } finally {
      setDataLoading(false)
    }
  }

  // Helper: IDs para refetch tras mutaciones (propio + pareja si existe)
  function getPartnerIds() {
    return family?.partner?.id ? [user.id, family.partner.id] : [user.id]
  }

  async function setHijo(hijo) {
    if (!user) return
    const anterior = state.hijo
    dispatch({ type: 'SET_HIJO', payload: hijo })
    const { error } = await supabase.rpc('upsert_family_child', {
      p_nombre:            hijo.nombre,
      p_edad:              null,
      p_avatar_url:        hijo.avatarUrl ?? null,
      p_fecha_nacimiento:  hijo.fechaNacimiento ?? null,
      p_genero:            hijo.genero ?? null,
    })
    if (error) {
      dispatch({ type: 'SET_HIJO', payload: anterior })
      throw new Error(error.message)
    }
    // Refetch desde DB para sincronizar edad calculada y evitar campos perdidos
    let refetch
    if (family?.familyId) {
      refetch = await supabase.from('hijos').select('*').eq('family_id', family.familyId).maybeSingle()
      if (!refetch.data) {
        refetch = await supabase.from('hijos').select('*').eq('user_id', user.id).maybeSingle()
      }
    } else {
      refetch = await supabase.from('hijos').select('*').eq('user_id', user.id).maybeSingle()
    }
    if (refetch.data) {
      const row = refetch.data
      dispatch({ type: 'SET_HIJO', payload: {
        nombre:          row.nombre,
        edad:            calcularEdad(row.fecha_nacimiento) ?? row.edad ?? null,
        avatarUrl:       row.avatar_url ?? null,
        fechaNacimiento: row.fecha_nacimiento ?? null,
        genero:          row.genero ?? null,
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
        fecha:        episodio.fecha,
        emocion:      episodio.emocion ?? null,
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
      updateHitoFoto,
      addEstrategia,
      updateEstrategia,
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
