import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './EliminarHijo.module.css'

// "Eliminar perfil" de un hijo y el aviso de nombre repetido al crear uno.
// En prueba: solo lo ven estas dos cuentas, por id (igual que DUENO_PERSONAJE).
const CUENTAS_EN_PRUEBA = [
  '04ddd97a-e674-4e59-8f37-78cb38d46090', // Daniel
  '08af56df-42e7-43f8-ab35-2e64618855e4', // cuenta de prueba (+reset0923)
]

export function puedeEliminarHijo(userId) {
  return CUENTAS_EN_PRUEBA.includes(userId)
}

// Sin importar mayusculas, tildes, emojis ni signos ("Pascual ❤️" = "pascual").
export function normalizarNombre(nombre) {
  return (nombre || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase()
}

// Busca un hijo de la familia con el mismo nombre. Lee de la base en el
// momento, asi no depende de que la lista en memoria ya este cargada.
export async function buscarHijoRepetido(nombre, hijosEnMemoria = []) {
  let hijos = hijosEnMemoria
  const { data, error } = await supabase.from('hijos').select('nombre')
  if (!error && data) hijos = data
  const buscado = normalizarNombre(nombre)
  return buscado ? hijos.find((h) => normalizarNombre(h.nombre) === buscado) ?? null : null
}

const PIEZAS = [
  { tabla: 'episodios',   uno: 'momento',  varios: 'momentos' },
  { tabla: 'hitos',       uno: 'avance',   varios: 'avances' },
  { tabla: 'preguntas',   uno: 'pregunta', varios: 'preguntas' },
  { tabla: 'estrategias', uno: 'plan',     varios: 'planes' },
]

// Conteos reales, de toda la familia (la RLS deja leer lo de la pareja).
async function contarRegistros(hijoId) {
  const res = await Promise.all(PIEZAS.map((p) =>
    supabase.from(p.tabla).select('id', { count: 'exact', head: true }).eq('hijo_id', hijoId)
  ))
  if (res.some((r) => r.error)) throw new Error('conteo')
  return PIEZAS
    .map((p, i) => ({ ...p, n: res[i].count ?? 0 }))
    .filter((p) => p.n > 0)
    .map((p) => `${p.n} ${p.n === 1 ? p.uno : p.varios}`)
}

// Borra las fotos que devolvio eliminar_hijo. Si una no se puede borrar
// (por ejemplo, la subio la pareja y vive en su carpeta), queda anotada en la
// consola y el flujo sigue.
async function borrarFotos(fotos) {
  for (const bucket of ['momentos', 'avatares']) {
    const rutas = fotos?.[bucket] || []
    if (rutas.length === 0) continue
    try {
      const { data, error } = await supabase.storage.from(bucket).remove(rutas)
      if (error) throw error
      const borradas = new Set((data || []).map((o) => o.name))
      const quedaron = rutas.filter((r) => !borradas.has(r))
      if (quedaron.length) console.warn(`[eliminarHijo] no se borraron de ${bucket}:`, quedaron)
    } catch (err) {
      console.warn(`[eliminarHijo] fallo borrando fotos de ${bucket}:`, rutas, err)
    }
  }
}

export function EliminarHijoModal({ hijo, conPareja, onCerrar, onEliminado }) {
  const [resumen, setResumen] = useState(null)   // null = contando
  const [escrito, setEscrito] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    contarRegistros(hijo.id)
      .then((r) => { if (vivo) setResumen(r) })
      .catch(() => { if (vivo) setResumen([]) })
    return () => { vivo = false }
  }, [hijo.id])

  const coincide = normalizarNombre(escrito) !== '' && normalizarNombre(escrito) === normalizarNombre(hijo.nombre)

  async function eliminar() {
    if (!coincide || eliminando) return
    setEliminando(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('eliminar_hijo', { p_hijo_id: hijo.id })
    if (rpcError) {
      console.error('[eliminarHijo] eliminar_hijo:', rpcError)
      setError('No se pudo eliminar. No se borró nada, intenta de nuevo.')
      setEliminando(false)
      return
    }
    await borrarFotos(data?.fotos)
    onEliminado()
  }

  return (
    <div className={styles.overlay} onClick={() => !eliminando && onCerrar()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className={styles.titulo}>¿Eliminar a {hijo.nombre}?</h2>
        <p className={styles.texto}>
          {resumen === null
            ? 'Revisando lo que tiene guardado…'
            : resumen.length
              ? `Se borra para siempre, con todo lo guardado: ${resumen.join(', ')}.`
              : 'Se borra para siempre. No tiene nada registrado todavía.'}
          {conPareja && ' Tu pareja tampoco lo va a ver más.'}
        </p>

        <label className={styles.label} htmlFor="eliminar-hijo-nombre">
          Escribe <strong>{hijo.nombre}</strong> para confirmar
        </label>
        <input
          id="eliminar-hijo-nombre"
          className={styles.input}
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={eliminando}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.botones}>
          <button type="button" className={styles.volver} onClick={onCerrar} disabled={eliminando}>
            Volver
          </button>
          <button type="button" className={styles.peligro} onClick={eliminar} disabled={!coincide || eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar para siempre'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AvisoNombreRepetido({ nombre, onCrear, onVolver }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2 className={styles.titulo}>Ya tienes a {nombre}. ¿Es otro hijo?</h2>
        <div className={styles.botones}>
          <button type="button" className={styles.primario} onClick={onVolver}>No, volver</button>
          <button type="button" className={styles.volver} onClick={onCrear}>Sí, crear</button>
        </div>
      </div>
    </div>
  )
}

// Aviso breve en el Home despues de eliminar. Se va solo a los 3 s.
export function AvisoEliminado({ nombre, onFin }) {
  const fin = useRef(onFin)
  fin.current = onFin
  useEffect(() => {
    const t = setTimeout(() => fin.current(), 3000)
    return () => clearTimeout(t)
  }, [])
  return <div className={styles.avisoBreve} role="status">Se eliminó el perfil de {nombre}</div>
}
