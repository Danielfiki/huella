import { useEffect, useState } from 'react'

// TEMPORAL: registro de diagnostico de la bienvenida del escarabajo (solo la
// cuenta de Daniel). Cada linea lleva la hora en ms desde que cargo la pagina.
// Se borra cuando se encuentre la causa del bug del iPhone.

const lineas = []
const suscritos = new Set()

export function diag(texto) {
  lineas.push(`${Math.round(performance.now())} ms  ${texto}`)
  suscritos.forEach((f) => f(lineas.length))
}

export function useDiag() {
  const [, setN] = useState(lineas.length)
  useEffect(() => {
    suscritos.add(setN)
    return () => { suscritos.delete(setN) }
  }, [])
  return lineas
}
