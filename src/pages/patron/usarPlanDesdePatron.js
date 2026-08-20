import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'

// Armar un plan a partir de un patrón, desde los DOS lugares que lo ofrecen:
// la salida del análisis recién hecho (PatronPage) y la lectura de un patrón
// guardado (PatronLecturaPage).
//
// Vive acá y no duplicado en cada pantalla porque son cuatro pasos que tienen
// que pasar SIEMPRE en el mismo orden — gate Pro, crear el plan, engancharlo al
// patrón, navegar —, y el enganche es el que más fácil se olvida: si se cae,
// el plan existe pero el patrón no sabe de él y la lectura vuelve a ofrecer
// "crear un plan" para algo que ya tiene uno.
//
// Los labels son los MISMOS que ve el padre en el formulario. Se le pasa a la
// IA el texto tal como él lo eligió, no el value técnico: 'regresion' no le
// dice nada al modelo, "Ya lo había dejado y volvió" sí.
const LABEL_DESDE = {
  siempre:   'Siempre ha sido así, nunca lo dejó',
  reciente:  'Empezó hace poco',
  regresion: 'Ya lo había dejado y volvió',
}
const LABEL_FREC = {
  diario:    'Todos los días',
  semanal:   'Varias veces por semana',
  ocasional: 'De vez en cuando',
}
const LABEL_INTERF = {
  alta: 'Nos complica la rutina',
  baja: 'Molesta pero convivimos',
}

// Contexto del plan a partir de las 5 respuestas del patrón. Acepta tanto la
// fila de la base como el objeto del formulario: los dos traen los mismos
// campos con los mismos nombres.
export function construirTextoPlan(p) {
  if (!p) return ''
  const partes = [
    (p.descripcion || '').trim(),
    `Desde cuándo: ${LABEL_DESDE[p.desde_cuando] || ''}.`,
    `Frecuencia: ${LABEL_FREC[p.frecuencia] || ''}.`,
    `Cuánto complica: ${LABEL_INTERF[p.interferencia] || ''}.`,
  ]
  const intentado = (p.ya_intentado || '').trim()
  if (intentado) partes.push(`Ya intentaron: ${intentado}.`)
  return partes.join(' ')
}

export function usarPlanDesdePatron() {
  const navigate = useNavigate()
  const { isPro, crearPlanDesdeTexto, vincularEstrategiaAPatron } = useHuella()

  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)

  // `patron` puede ser la fila guardada o el objeto recién armado del form.
  // `onAntes` deja que la pantalla que llama muestre su propio loader.
  async function armarPlan(patron, { onAntes } = {}) {
    if (!isPro()) { setShowUpgrade(true); return }
    setError('')
    setCreando(true)
    onAntes?.()
    try {
      const row = await crearPlanDesdeTexto({ texto_libre: construirTextoPlan(patron) })
      // El enganche no bloquea: el plan ya existe y el padre no puede perderlo
      // por un fallo de este UPDATE. Si falla, queda logueado en el contexto.
      if (patron?.id) await vincularEstrategiaAPatron(patron.id, row.id)
      navigate(`/estrategias/${row.id}`, { replace: true })
    } catch (err) {
      console.error('armar plan desde patron falló', err)
      setError('No pudimos generar el plan. Intenta de nuevo.')
      setCreando(false)
      return false
    }
    return true
  }

  return { armarPlan, creando, error, showUpgrade, cerrarUpgrade: () => setShowUpgrade(false) }
}
