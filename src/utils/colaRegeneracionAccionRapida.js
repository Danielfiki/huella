// ──────────────────────────────────────────────────────────────────────
// colaRegeneracionAccionRapida — cola FIFO en memoria, scope sesión.
//
// Cuando la EpisodioCard del Historial se monta y detecta que el bucket
// de tiempo actual del episodio difiere del bucket persistido, encola
// una regeneración. La cola procesa una a la vez (sin concurrencia) con
// un delay entre llamadas para no saturar la API y evitar el "DoS por
// scroll" cuando el padre abre un historial con muchos episodios viejos.
//
// Reglas (acordadas con Daniel en el plan v1.2):
//   • Techo de 10 regeneraciones por sesión. Después, las cards muestran
//     la versión persistida (con bucket viejo) hasta que el padre las
//     abra individualmente — eso fuerza una regeneración explícita con
//     opts.forzado=true que salta el techo.
//   • Prioridad: forzadas > más recientes (mayor fecha) > más viejas.
//   • Delay 800ms entre llamadas para mantener la app responsiva y no
//     saturar el endpoint de IA.
//   • Subscribers por episodioId reciben el resultado cuando termina;
//     la EpisodioCard usa esto para re-renderizar con la versión nueva.
//
// El "regenerador" (función que sabe llamar a la IA y persistir) se
// inyecta desde HuellaContext con setRegenerador. Esto desacopla la cola
// del context y la hace testeable.
// ──────────────────────────────────────────────────────────────────────

const MAX_REGEN_POR_SESION  = 10
const DELAY_ENTRE_LLAMADAS  = 800 // ms

let cola               = []
let procesando         = false
let regeneradosSesion  = 0
const subscribers      = new Map() // episodioId -> Set<callback>
let regenerador        = null

// Inyecta la función que la cola usará para regenerar una Acción Rápida.
// Firma esperada: async (episodio, hijo) => { texto, autor, dimension, bucket, generada_en }
// Debe encargarse internamente de persistir en BD y de actualizar
// hijos.ultimo_autor_ia.
export function setRegenerador(fn) {
  regenerador = fn
}

// Agrega un episodio a la cola. Devuelve true si se encoló, false si se
// descartó (techo de sesión alcanzado o ya estaba en cola).
// opts.forzado: salta el techo de sesión (uso: el padre abre la card
//               individualmente y quiere ver la voz adaptada al tiempo
//               actual aunque ya hayamos regenerado 10 en esta sesión).
export function enqueue(episodio, hijo, opts = {}) {
  if (!episodio?.id) return false

  // Si está alcanzado el techo y no es forzado, descartamos.
  if (regeneradosSesion >= MAX_REGEN_POR_SESION && !opts.forzado) {
    return false
  }

  // Si ya está en cola, no duplicar.
  if (cola.some((item) => item.episodio.id === episodio.id)) return false

  cola.push({
    episodio,
    hijo,
    forzado:   !!opts.forzado,
    fechaSort: new Date(episodio.fecha || episodio.created_at || 0).getTime(),
  })

  // Reordenar: forzados primero, luego por fecha desc (más reciente primero).
  cola.sort((a, b) => {
    if (a.forzado !== b.forzado) return a.forzado ? -1 : 1
    return b.fechaSort - a.fechaSort
  })

  procesar()
  return true
}

// Suscribe un callback al resultado de la regeneración de un episodio.
// Devuelve una función para des-suscribirse.
export function subscribe(episodioId, callback) {
  if (!subscribers.has(episodioId)) subscribers.set(episodioId, new Set())
  subscribers.get(episodioId).add(callback)
  return () => {
    const set = subscribers.get(episodioId)
    if (set) {
      set.delete(callback)
      if (set.size === 0) subscribers.delete(episodioId)
    }
  }
}

// Estado actual (útil para debugging y para mostrar en UI si Daniel quiere).
export function estado() {
  return {
    regeneradosSesion,
    techo:      MAX_REGEN_POR_SESION,
    enCola:     cola.length,
    procesando,
  }
}

// Resetea el contador de sesión. No se llama automáticamente — Daniel puede
// invocarlo manualmente si necesita levantar el techo dentro de la misma
// sesión (no es flow normal).
export function resetearSesion() {
  regeneradosSesion = 0
}

// ── Loop interno ─────────────────────────────────────────────────────

function notificar(episodioId, resultado) {
  const set = subscribers.get(episodioId)
  if (!set) return
  for (const cb of set) {
    try {
      cb(resultado)
    } catch (e) {
      console.error('[colaRegeneracionAccionRapida] subscriber falló:', e)
    }
  }
}

async function procesar() {
  if (procesando) return
  if (cola.length === 0) return
  if (!regenerador) {
    console.warn('[colaRegeneracionAccionRapida] regenerador no seteado, descartando cola')
    cola = []
    return
  }

  procesando = true
  try {
    while (cola.length > 0) {
      const item = cola.shift()

      // Re-chequear el techo en cada iteración (puede que se haya alcanzado
      // mientras esperábamos delay entre llamadas).
      if (!item.forzado && regeneradosSesion >= MAX_REGEN_POR_SESION) {
        notificar(item.episodio.id, { saltado: true, motivo: 'techo_sesion' })
        continue
      }

      try {
        const resultado = await regenerador(item.episodio, item.hijo)
        regeneradosSesion += 1
        notificar(item.episodio.id, { ok: true, accion: resultado })
      } catch (err) {
        console.error('[colaRegeneracionAccionRapida] regeneración falló:', err)
        notificar(item.episodio.id, { ok: false, error: err?.message || String(err) })
      }

      if (cola.length > 0) {
        await new Promise((r) => setTimeout(r, DELAY_ENTRE_LLAMADAS))
      }
    }
  } finally {
    procesando = false
  }
}

export default {
  enqueue,
  subscribe,
  setRegenerador,
  estado,
  resetearSesion,
}
