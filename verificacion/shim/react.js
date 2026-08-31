// React falso, mínimo pero fiel en lo que importa: hooks con orden estable y
// useEffect que RESPETA los deps (solo re-corre si cambiaron, y ejecuta la
// limpieza anterior antes). Sin eso, un re-render volvería a armar todos los
// timers y las pruebas del splash medirían cualquier cosa.
//
// No renderiza: el JSX falso devuelve descriptores. El orden de los useState
// en AuthProvider es determinista: [0] = user, [1] = loading.

let estado = []
let cursor = 0

let efectos = []          // por indice: { deps, limpieza }
let cursorEfecto = 0
let pendientes = []

let registro = []
let reloj = () => 0

export function __configurarReloj(f) { reloj = f }

export function __reset() {
  estado = []; cursor = 0
  efectos = []; cursorEfecto = 0; pendientes = []
  registro = []
}

export function __empezarRender() { cursor = 0; cursorEfecto = 0 }
export function __estado() { return estado }
export function __registro() { return registro }

// Corre los efectos que quedaron pendientes en el ultimo render.
export function __correrEfectos() {
  const cola = pendientes
  pendientes = []
  for (const { i, fn } of cola) {
    const previo = efectos[i]
    if (previo?.limpieza) previo.limpieza()
    const limpieza = fn()
    efectos[i] = {
      deps: previo?.deps,
      limpieza: typeof limpieza === 'function' ? limpieza : null,
    }
  }
}

// Desmonta: corre todas las limpiezas registradas.
export function __desmontar() {
  efectos.forEach((e) => { if (e?.limpieza) e.limpieza() })
}

export function useState(inicial) {
  const i = cursor++
  if (estado.length <= i) estado[i] = typeof inicial === 'function' ? inicial() : inicial
  const set = (v) => {
    const siguiente = typeof v === 'function' ? v(estado[i]) : v
    estado[i] = siguiente
    registro.push({ hook: i, valor: siguiente, ms: reloj() })
  }
  return [estado[i], set]
}

export function useEffect(fn, deps) {
  const i = cursorEfecto++
  const previo = efectos[i]
  const cambio =
    !previo ||
    !deps || !previo.deps ||
    deps.length !== previo.deps.length ||
    deps.some((d, k) => !Object.is(d, previo.deps[k]))
  efectos[i] = { deps, limpieza: previo?.limpieza ?? null }
  if (cambio) pendientes.push({ i, fn })
}

export function useRef(v) { return { current: v } }
export function useMemo(f) { return f() }
export function useCallback(f) { return f }
export function useContext() { return null }
export function createContext() { return { Provider: (props) => props } }

export default {
  useState, useEffect, useRef, useMemo, useCallback, useContext, createContext,
}
