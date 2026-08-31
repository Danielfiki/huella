// Harness de verificacion del fix del arranque (commit 222b513).
//
// Corre el AuthContext REAL (compilado por vite) contra un Supabase falso y un
// reloj virtual, y lo compara con la version ANTES del fix rescatada de git.
// No necesita navegador ni framework de tests: solo Node.
//
//   node verificacion/correr.mjs
//
// El reloj es virtual: los "8 segundos" no se esperan de verdad, se avanzan.

import assert from 'node:assert/strict'
import {
  AuthProviderAntes, AuthProviderDespues, SplashArranque, react, supa,
} from './dist/entrada.mjs'

// ── Reloj virtual ───────────────────────────────────────────────────────────
let ahora = 0
let temporizadores = []
let idT = 0

// Guardamos el setTimeout real ANTES de pisarlo: lo necesitamos para ceder a la
// cola de macrotareas y que Node dispare 'unhandledRejection'.
const setTimeoutReal = globalThis.setTimeout

// Las promesas sin .catch() de la version ANTES revientan el proceso al salir.
// Eso ES el defecto, asi que en vez de dejar que nos tumbe, lo registramos
// como evidencia.
let rechazosSinAtrapar = []
process.on('unhandledRejection', (e) => { rechazosSinAtrapar.push(e) })
async function cederMacrotarea() {
  await new Promise((r) => setTimeoutReal(r, 0))
}

globalThis.setTimeout = (fn, ms = 0) => {
  const id = ++idT
  temporizadores.push({ id, at: ahora + ms, fn })
  return id
}
globalThis.clearTimeout = (id) => {
  temporizadores = temporizadores.filter((t) => t.id !== id)
}

async function microtareas() {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

async function avanzar(ms) {
  const destino = ahora + ms
  for (;;) {
    const pendiente = temporizadores
      .filter((t) => t.at <= destino)
      .sort((a, b) => a.at - b.at)[0]
    if (!pendiente) break
    temporizadores = temporizadores.filter((t) => t.id !== pendiente.id)
    ahora = pendiente.at
    pendiente.fn()
    await microtareas()
  }
  ahora = destino
  await microtareas()
}

react.__configurarReloj(() => ahora)

// ── Driver: monta el provider y corre sus efectos ───────────────────────────
async function montar(AuthProvider, control) {
  ahora = 0
  temporizadores = []
  react.__reset()
  supa.__controlar(control)
  react.__empezarRender()
  AuthProvider({ children: null })
  react.__correrEfectos()
  await microtareas()
}

const leer = () => ({ user: react.__estado()[0], loading: react.__estado()[1] })

// ── Captura de console.warn ─────────────────────────────────────────────────
let avisos = []
const warnReal = console.warn
console.warn = (...a) => { avisos.push(a.join(' ')) }

// ── Corredor de casos ───────────────────────────────────────────────────────
let ok = 0
let fallados = 0
const fallos = []

async function caso(nombre, fn) {
  // Drenar primero: 'unhandledRejection' se dispara en macrotarea, asi que el
  // rechazo del caso anterior llega recien aca y contaminaria el conteo.
  await cederMacrotarea()
  avisos = []
  rechazosSinAtrapar = []
  try {
    await fn()
    ok++
    warnReal(`  \x1b[32mOK\x1b[0m  ${nombre}`)
  } catch (e) {
    fallados++
    fallos.push({ nombre, e })
    warnReal(`  \x1b[31mFALLA\x1b[0m  ${nombre}\n       ${e.message.split('\n')[0]}`)
  }
}

warnReal('')
warnReal('==============================================================')
warnReal(' VERIFICACION DEL ARRANQUE - AuthContext real, reloj virtual')
warnReal('==============================================================')

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n[A] FLUJO NORMAL - no debe cambiar con el fix\n')

await caso('ANTES  | sesion valida -> entra', async () => {
  await montar(AuthProviderAntes, { getSession: async () => supa.sesionDe('u1') })
  assert.equal(leer().loading, false)
  assert.equal(leer().user?.id, 'u1')
})

await caso('DESPUES| sesion valida -> entra (identico)', async () => {
  await montar(AuthProviderDespues, { getSession: async () => supa.sesionDe('u1') })
  assert.equal(leer().loading, false)
  assert.equal(leer().user?.id, 'u1')
})

await caso('DESPUES| sesion valida -> libera SIN esperar los 8s', async () => {
  await montar(AuthProviderDespues, { getSession: async () => supa.sesionDe('u1') })
  const cuando = react.__registro().find((r) => r.hook === 1 && r.valor === false)
  assert.ok(cuando, 'nunca se seteo loading=false')
  assert.ok(cuando.ms < 100, `libero a los ${cuando.ms}ms, deberia ser inmediato`)
})

await caso('ANTES  | sin sesion -> a /login (user null, loading false)', async () => {
  await montar(AuthProviderAntes, { getSession: async () => supa.sinSesion })
  assert.equal(leer().loading, false)
  assert.equal(leer().user, null)
})

await caso('DESPUES| sin sesion -> a /login (identico)', async () => {
  await montar(AuthProviderDespues, { getSession: async () => supa.sinSesion })
  assert.equal(leer().loading, false)
  assert.equal(leer().user, null)
})

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n[B] EL BUG - getSession() colgada (token vencido, red que no responde)\n')

await caso('ANTES  | colgada -> loading SIGUE en true a los 60s (el bug)', async () => {
  await montar(AuthProviderAntes, { getSession: () => supa.colgada() })
  await avanzar(60000)
  assert.equal(leer().loading, true, 'se esperaba el limbo del bug')
  assert.equal(leer().user, null)
})

await caso('DESPUES| colgada -> a los 7.9s TODAVIA espera (no corta antes)', async () => {
  await montar(AuthProviderDespues, { getSession: () => supa.colgada() })
  await avanzar(7900)
  assert.equal(leer().loading, true)
})

await caso('DESPUES| colgada -> a los 8s se libera (user null, loading false)', async () => {
  await montar(AuthProviderDespues, { getSession: () => supa.colgada() })
  await avanzar(8000)
  assert.equal(leer().loading, false, 'el rescate no libero')
  assert.equal(leer().user, null)
  const cuando = react.__registro().find((r) => r.hook === 1 && r.valor === false)
  assert.equal(cuando.ms, 8000)
})

await caso('DESPUES| colgada -> deja aviso en consola', async () => {
  await montar(AuthProviderDespues, { getSession: () => supa.colgada() })
  await avanzar(8000)
  assert.ok(avisos.some((a) => a.includes('no respondio')), `avisos: ${JSON.stringify(avisos)}`)
})

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n[C] getSession() que RECHAZA (falla de red, lock timeout)\n')

await caso('ANTES  | rechaza -> loading SIGUE en true (el limbo)', async () => {
  await montar(AuthProviderAntes, { getSession: async () => { throw new Error('network') } })
  await avanzar(60000)
  assert.equal(leer().loading, true, 'se esperaba el limbo del bug')
})

await caso('ANTES  | rechaza -> ademas deja un unhandled rejection', async () => {
  await montar(AuthProviderAntes, { getSession: async () => { throw new Error('network') } })
  await cederMacrotarea()
  assert.equal(rechazosSinAtrapar.length, 1, 'se esperaba 1 rechazo sin atrapar')
  assert.equal(rechazosSinAtrapar[0].message, 'network')
})

await caso('DESPUES| rechaza -> el catch libera de inmediato', async () => {
  await montar(AuthProviderDespues, { getSession: async () => { throw new Error('network') } })
  await microtareas()
  assert.equal(leer().loading, false, 'el catch no libero')
  assert.equal(leer().user, null)
  const cuando = react.__registro().find((r) => r.hook === 1 && r.valor === false)
  assert.ok(cuando.ms < 8000, 'no deberia haber esperado al rescate')
})

await caso('DESPUES| rechaza -> CERO rechazos sin atrapar', async () => {
  await montar(AuthProviderDespues, { getSession: async () => { throw new Error('network') } })
  await cederMacrotarea()
  assert.equal(rechazosSinAtrapar.length, 0,
    `quedaron ${rechazosSinAtrapar.length} rechazos sin atrapar`)
})

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n[D] RECUPERACION CON GRACIA - la sesion llega tarde\n')

await caso('DESPUES| tras el rescate, onAuthStateChange recupera la sesion', async () => {
  const control = { getSession: () => supa.colgada() }
  await montar(AuthProviderDespues, control)
  await avanzar(8000)
  assert.equal(leer().user, null, 'precondicion: el rescate dejo sin sesion')

  control.callback('SIGNED_IN', { user: { id: 'u-tarde' } })
  await microtareas()
  assert.equal(leer().user?.id, 'u-tarde', 'no recupero la sesion tardia')
  assert.equal(leer().loading, false)
})

await caso('DESPUES| tras el rescate, un getSession lento tambien recupera', async () => {
  let resolver
  const control = { getSession: () => new Promise((r) => { resolver = r }) }
  await montar(AuthProviderDespues, control)
  await avanzar(8000)
  assert.equal(leer().user, null)

  resolver(supa.sesionDe('u-lenta'))
  await microtareas()
  assert.equal(leer().user?.id, 'u-lenta', 'descarto la sesion por llegar tarde')
})

await caso('DESPUES| onAuthStateChange solo puede liberar, nunca re-bloquear', async () => {
  const control = { getSession: async () => supa.sesionDe('u1') }
  await montar(AuthProviderDespues, control)
  control.callback('TOKEN_REFRESHED', { user: { id: 'u1' } })
  await microtareas()
  assert.equal(leer().loading, false)
  const vueltas = react.__registro().filter((r) => r.hook === 1 && r.valor === true)
  assert.equal(vueltas.length, 0, 'loading volvio a true')
})

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n[E] HIGIENE - desmontaje y timers\n')

await caso('DESPUES| desmontar cancela el rescate y desuscribe', async () => {
  const control = { getSession: () => supa.colgada() }
  await montar(AuthProviderDespues, control)
  react.__desmontar()
  assert.equal(control.desuscrito, true, 'no desuscribio')
  const antes = react.__registro().length
  await avanzar(60000)
  assert.equal(react.__registro().length, antes, 'seteo estado despues de desmontar')
})

await caso('DESPUES| sesion valida no deja timers colgando', async () => {
  await montar(AuthProviderDespues, { getSession: async () => supa.sesionDe('u1') })
  await microtareas()
  assert.equal(temporizadores.length, 0, `quedaron ${temporizadores.length} timers vivos`)
})

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n[F] FAILSAFE DEL SPLASH - el mensaje a los 12s\n')

// Recorre el arbol de descriptores que devuelve el jsx falso.
function buscar(nodo, pred, out = []) {
  if (!nodo || typeof nodo !== 'object') return out
  if (Array.isArray(nodo)) { nodo.forEach((n) => buscar(n, pred, out)); return out }
  if (pred(nodo)) out.push(nodo)
  if (nodo.props) buscar(nodo.props.children, pred, out)
  return out
}
const textoDe = (arbol) =>
  buscar(arbol, (n) => typeof n.props?.children === 'string')
    .map((n) => n.props.children).join(' | ')

let onDoneLlamado = 0
async function montarSplash(props) {
  ahora = 0
  temporizadores = []
  onDoneLlamado = 0
  react.__reset()
  react.__empezarRender()
  SplashArranque(props)
  react.__correrEfectos()
  await microtareas()
}
// Re-render: los efectos solo vuelven a correr si cambiaron sus deps, igual
// que en React de verdad.
function repintar(props) {
  react.__empezarRender()
  const arbol = SplashArranque(props)
  react.__correrEfectos()
  return arbol
}

const propsBase = { ready: false, onDone: () => { onDoneLlamado++ } }

await caso('SPLASH | a los 11.9s todavia NO muestra el mensaje', async () => {
  await montarSplash(propsBase)
  await avanzar(11900)
  const t = textoDe(repintar(propsBase))
  assert.ok(!t.includes('tardando'), `aparecio antes de tiempo: ${t}`)
})

await caso('SPLASH | a los 12s muestra el mensaje y el boton Reintentar', async () => {
  await montarSplash(propsBase)
  await avanzar(12000)
  const arbol = repintar(propsBase)
  const t = textoDe(arbol)
  assert.ok(t.includes('Esto está tardando más de lo normal.'), `textos: ${t}`)
  assert.ok(t.includes('Reintentar'), `textos: ${t}`)
})

await caso('SPLASH | el boton Reintentar tiene handler de recarga', async () => {
  await montarSplash(propsBase)
  await avanzar(12000)
  const botones = buscar(repintar(propsBase), (n) => n.tipo === 'button')
  assert.equal(botones.length, 1, 'deberia haber exactamente 1 boton')
  assert.equal(typeof botones[0].props.onClick, 'function')
})

await caso('SPLASH | el failsafe NO cierra el splash solo (no llama onDone)', async () => {
  await montarSplash(propsBase)
  await avanzar(60000)
  assert.equal(onDoneLlamado, 0, 'el failsafe no debe desmontar el splash')
})

await caso('SPLASH | app lista -> el mensaje NUNCA aparece', async () => {
  const props = { ready: true, onDone: () => { onDoneLlamado++ } }
  await montarSplash(props)
  await avanzar(60000)
  const t = textoDe(repintar(props))
  assert.ok(!t.includes('tardando'), `no debia aparecer: ${t}`)
})

await caso('SPLASH | app lista -> hace fade y llama onDone (flujo normal)', async () => {
  const props = { ready: true, onDone: () => { onDoneLlamado++ } }
  await montarSplash(props)
  await avanzar(900)   // MIN_VISIBLE_MS: minElapsed pasa a true
  repintar(props)      // este render dispara el efecto que pone fading=true
  repintar(props)      // y este arma el timer del cierre del fade
  await avanzar(450)   // FADE_FALLBACK_MS
  assert.ok(onDoneLlamado > 0, 'nunca llamo onDone')
})

// ═══════════════════════════════════════════════════════════════════════════
warnReal('\n==============================================================')
warnReal(` RESULTADO: ${ok} OK, ${fallados} fallas`)
warnReal('==============================================================\n')

console.warn = warnReal
if (fallados) {
  for (const f of fallos) { console.error(`\n--- ${f.nombre} ---\n`, f.e) }
  process.exit(1)
}
