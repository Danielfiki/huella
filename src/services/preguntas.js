import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ──────────────────────────────────────────────────────────────────────
// Preguntar a Huella — datos.
//
// Vive aparte de HuellaContext a propósito: Registrar ≠ Preguntar. Las
// preguntas no entran al estado de episodios, hitos ni patrones, y el motor de
// rasgos no las ve. Se leen por hijo cuando una pantalla las necesita.
//
// La tabla tiene la misma policy que los episodios (familia lee, cada uno
// escribe lo suyo), así que en modo pareja se ven las de los dos.
// ──────────────────────────────────────────────────────────────────────

// Abierta a todos desde el 29 sep 2026 (Daniel la aprobó en su teléfono):
// basta con tener sesión.
export function puedePreguntar(userId) {
  return !!userId
}

// Tope de preguntas por conversación.
export const MAX_PREGUNTAS = 5

export async function listarPreguntas(hijoId) {
  if (!supabase || !hijoId) return []
  const { data, error } = await supabase
    .from('preguntas')
    .select('*')
    .eq('hijo_id', hijoId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function obtenerPregunta(id) {
  if (!supabase || !id) return null
  const { data, error } = await supabase.from('preguntas').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

// Se crea con la primera respuesta que SÍ va al historial (lo que queda fuera
// del marco nunca llega acá).
export async function crearPregunta({ userId, hijoId, mensaje, resumen, pasoSiguiente }) {
  const { data, error } = await supabase
    .from('preguntas')
    .insert({
      user_id: userId,
      hijo_id: hijoId,
      estado: 'abierta',
      mensajes: [mensaje],
      resumen: resumen || null,
      paso_siguiente: pasoSiguiente || null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Reescribe la conversación completa: los mensajes, el último resumen y, al
// cerrar, el estado. Pide `.select()` para enterarse si no afectó ninguna fila.
export async function actualizarPregunta(id, { mensajes, resumen, pasoSiguiente, estado }) {
  const cambios = { updated_at: new Date().toISOString() }
  if (mensajes) cambios.mensajes = mensajes
  if (resumen !== undefined) cambios.resumen = resumen || null
  if (pasoSiguiente !== undefined) cambios.paso_siguiente = pasoSiguiente || null
  if (estado) cambios.estado = estado
  const { data, error } = await supabase
    .from('preguntas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function borrarPregunta(id) {
  const { error, count } = await supabase.from('preguntas').delete({ count: 'exact' }).eq('id', id)
  if (error) throw new Error(error.message)
  if (count === 0) throw new Error('No se borró ninguna fila.')
}

// Las preguntas del hijo, para Momentos. Si la cuenta no tiene la función, no
// consulta nada.
export function usePreguntas(hijoId, habilitado) {
  const [preguntas, setPreguntas] = useState([])
  const recargar = useCallback(async () => {
    if (!habilitado || !hijoId) { setPreguntas([]); return }
    try {
      setPreguntas(await listarPreguntas(hijoId))
    } catch (err) {
      console.warn('[preguntas] no se pudieron leer:', err.message)
      setPreguntas([])
    }
  }, [hijoId, habilitado])
  useEffect(() => { recargar() }, [recargar])
  return { preguntas, recargar }
}
