// useFakeProgress.js
// Avance percibido para esperas de IA. NO refleja progreso real: sube de 0 a
// ~90% con curva ease-out a lo largo de `duracionMs` y se clava ahí. Al terminar
// la carga con éxito completa a 100% y mantiene `completing` ~350ms para que la
// barra alcance a animar el cierre antes de hacer swap al contenido.
//
// Extraído de AnalisisIA.jsx (Home / análisis de patrones) para reusarse también
// en RespuestaIA (orientación del episodio). Misma lógica, distinta duración.
//
// Path: src/hooks/useFakeProgress.js

import { useState, useEffect, useRef } from 'react'

const TOPE = 90        // % máximo que alcanza mientras espera (nunca llega a 100 sola)
const CIERRE_MS = 350  // cuánto se mantiene la vista de espera tras completar a 100

/**
 * @param {object}  opts
 * @param {boolean} opts.loading     · true mientras la IA genera
 * @param {boolean} opts.success     · true si la carga terminó con éxito (gatilla el 100%)
 * @param {number}  opts.duracionMs  · tiempo estimado de la espera (default 60s)
 * @returns {{ progress: number, completing: boolean, phase: 'complete'|'determinate' }}
 */
export default function useFakeProgress({ loading, success, duracionMs = 60000 }) {
  const [progress, setProgress] = useState(0)
  const [completing, setCompleting] = useState(false)
  const fueLoading = useRef(false)

  // Subida 0 → ~90% mientras carga (animación temporizada con ease-out).
  useEffect(() => {
    if (!loading) return undefined
    setCompleting(false)
    setProgress(0)
    const inicio = Date.now()
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - inicio) / duracionMs)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out: rápido al inicio, lento al final
      setProgress(Math.round(eased * TOPE))
      if (t >= 1) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [loading, duracionMs])

  // Al pasar de loading → no-loading: si fue ÉXITO, completa a 100% y mantiene la
  // vista de espera CIERRE_MS antes del swap. Si fue error, no toca la barra.
  useEffect(() => {
    const venia = fueLoading.current
    fueLoading.current = loading
    if (venia && !loading && success) {
      setProgress(100)
      setCompleting(true)
      const id = setTimeout(() => setCompleting(false), CIERRE_MS)
      return () => clearTimeout(id)
    }
    return undefined
  }, [loading, success])

  const phase = completing ? 'complete' : 'determinate'
  return { progress, completing, phase }
}
