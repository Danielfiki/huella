import React, { createContext, useContext, useReducer, useEffect } from 'react'

const HuellaContext = createContext(null)

const initialState = {
  hijo: null,
  episodios: [],
  estrategias: [],
  hitos: [],
  user: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_HIJO':
      return { ...state, hijo: action.payload }
    case 'ADD_EPISODIO':
      return { ...state, episodios: [action.payload, ...state.episodios] }
    case 'ADD_HITO':
      return { ...state, hitos: [action.payload, ...state.hitos] }
    case 'ADD_ESTRATEGIA':
      return { ...state, estrategias: [action.payload, ...state.estrategias] }
    case 'UPDATE_ESTRATEGIA':
      return {
        ...state,
        estrategias: state.estrategias.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      }
    case 'LOAD_STATE':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export function HuellaProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem('huella_state')
      return saved ? { ...init, ...JSON.parse(saved) } : init
    } catch {
      return init
    }
  })

  useEffect(() => {
    localStorage.setItem('huella_state', JSON.stringify(state))
  }, [state])

  return (
    <HuellaContext.Provider value={{ state, dispatch }}>
      {children}
    </HuellaContext.Provider>
  )
}

export function useHuella() {
  const ctx = useContext(HuellaContext)
  if (!ctx) throw new Error('useHuella debe usarse dentro de HuellaProvider')
  return ctx
}
