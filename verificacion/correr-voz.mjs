// Harness de verificacion del DICTADO POR VOZ.
//
// Corre el VoiceTextarea REAL (compilado por vite) contra un SpeechRecognition
// falso y un reloj virtual, y lo compara con la version ANTES del fix rescatada
// de git. No necesita navegador ni framework de tests: solo Node.
//
//   npx vite build --config verificacion/vite.config.mjs
//   node verificacion/correr-voz.mjs
//
// De donde salio: el 1 sep 2026 una tester en Android reporto que el dictado
// "se cortaba" y que Momentos mostraba "un texto larguisimo". La query dio un
// relato de 77.685 caracteres, sin saltos de linea, con la forma
// "momento momento de momento de ir momento de ir a...". Eso es la ESCALERA:
// el motor entrega prefijos que crecen y el componente los SUMABA en vez de
// reemplazarlos.
//
// El reloj es virtual: los segundos no se esperan, se avanzan.

import assert from 'node:assert/strict'
import {
  VoiceTextareaAntes, VoiceTextareaQaFallado, VoiceTextareaDespues, react, voz,
} from './dist/entrada.mjs'

// ── Reloj virtual ───────────────────────────────────────────────────────────
let ahora = 0
let temporizadores = []
let idT = 0

globalThis.setTimeout = (fn, ms = 0) => {
  const id = ++idT
  temporizadores.push({ id, at: ahora + ms, fn, cada: null })
  return id
}
globalThis.setInterval = (fn, ms = 0) => {
  const id = ++idT
  temporizadores.push({ id, at: ahora + ms, fn, cada: ms })
  return id
}
globalThis.clearTimeout = (id) => { temporizadores = temporizadores.filter((t) => t.id !== id) }
globalThis.clearInterval = globalThis.clearTimeout

async function microtareas() {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

// Techo de pasos: una cinta de motor roto puede rebotar para siempre, y si el
// componente no corta, la prueba tiene que terminar igual y decirlo.
async function avanzar(ms) {
  const destino = ahora + ms
  let pasos = 0
  for (;;) {
    if (++pasos > 20000) throw new Error('el reloj no avanza: bucle infinito de timers')
    const pendiente = temporizadores
      .filter((t) => t.at <= destino)
      .sort((a, b) => a.at - b.at)[0]
    if (!pendiente) break
    ahora = pendiente.at
    if (pendiente.cada) pendiente.at = ahora + pendiente.cada
    else temporizadores = temporizadores.filter((t) => t.id !== pendiente.id)
    pendiente.fn()
    await microtareas()
  }
  ahora = destino
  await microtareas()
}

react.__configurarReloj(() => ahora)

// El componente pregunta por window.SpeechRecognition al renderizar.
globalThis.window = { SpeechRecognition: voz.SpeechRecognitionFalso }

// ── Driver ──────────────────────────────────────────────────────────────────

// Recorre el arbol de descriptores que devuelve el JSX falso.
function recorrer(nodo, visita) {
  if (!nodo || typeof nodo !== 'object') return
  if (Array.isArray(nodo)) { nodo.forEach((n) => recorrer(n, visita)); return }
  visita(nodo)
  recorrer(nodo.props?.children, visita)
}

function buscar(arbol, pred) {
  let hallado = null
  recorrer(arbol, (n) => { if (!hallado && pred(n)) hallado = n })
  return hallado
}

// Un mando para una instancia montada: re-renderiza, encuentra botones y los
// toca. Nada de esto conoce el interior del componente: se opera igual que un
// dedo sobre la pantalla.
function montar(Componente) {
  ahora = 0
  temporizadores = []
  react.__reset()

  let confirmado = null
  const props = {
    value: '',
    onChange: () => {},
    onVoiceResult: (act) => { confirmado = typeof act === 'function' ? act('') : act },
    placeholder: '',
  }

  let arbol = null
  function render() {
    react.__empezarRender()
    arbol = Componente(props)
    react.__correrEfectos()
    return arbol
  }
  render()

  const porEtiqueta = (et) => buscar(arbol, (n) => n.props?.['aria-label'] === et)

  // Todo el texto plano que cuelga de un nodo. El boton "Agregar" lleva el
  // texto dentro de un <span>, asi que buscar solo en los hijos directos no lo
  // encuentra: hay que mirar el subarbol.
  function textoDe(nodo) {
    let t = ''
    recorrer(nodo, (n) => {
      const c = n.props?.children
      const trozos = Array.isArray(c) ? c : [c]
      trozos.forEach((x) => { if (typeof x === 'string') t += x })
    })
    return t
  }
  const porTexto = (txt) =>
    buscar(arbol, (n) => typeof n.props?.onClick === 'function' && textoDe(n).includes(txt))

  return {
    render,
    async clic(buscarBoton) {
      const b = buscarBoton()
      assert.ok(b, 'no se encontro el boton para tocar')
      b.props.onClick()
      await microtareas()
      render()
    },
    grabar()   { return porEtiqueta('Grabar con voz') },
    detener()  { return porEtiqueta('Detener grabación') },
    agregar()  { return porTexto('Agregar') },
    texto()    { return confirmado },
    // El parrafo de revision: lo que el usuario ALCANZA A VER antes de tocar
    // "Agregar". Si esto y el texto confirmado difieren, el usuario aprueba
    // una cosa y se guarda otra.
    revision() {
      const p = buscar(arbol, (n) => typeof n.props?.children === 'string' && n.tipo === 'p')
      return p?.props?.children ?? null
    },
    desmontar() { react.__desmontar() },
  }
}

// Corre un dictado completo de punta a punta: prender el microfono, dejar
// correr la cinta, apretar stop y confirmar.
async function dictar(Componente, cinta, { msGrabando = 30000, msCierre = 15000 } = {}) {
  voz.__cargarCinta(cinta)
  const m = montar(Componente)
  await m.clic(m.grabar)
  await avanzar(msGrabando)
  if (m.detener()) await m.clic(m.detener)
  await avanzar(msCierre)
  m.render()
  if (m.agregar()) await m.clic(m.agregar)
  const salida = { texto: m.texto(), bitacora: voz.__bitacora() }
  m.desmontar()
  return salida
}

// ── Corredor de casos ───────────────────────────────────────────────────────
let ok = 0
const fallos = []

async function caso(nombre, fn) {
  try {
    await fn()
    ok += 1
    console.log(`  OK   ${nombre}`)
  } catch (e) {
    fallos.push({ nombre, e })
    console.log(`  FALLA ${nombre}`)
    console.log(`        ${e.message.split('\n')[0]}`)
  }
}

// ── Los relatos de prueba ───────────────────────────────────────────────────
const RELATO = [
  'momento de ir a banarse',
  'se puso a llorar y no habia forma de calmarla',
  'yo estaba cansada despues de una semana en que no dormi nada',
  'al final la abrace y se quedo dormida en mis brazos',
]
const RELATO_LIMPIO = RELATO.join(' ')

// Tres versiones, no dos:
//   antes      -> el original, con el `+=` que sumaba la escalera
//   qa-fallado -> el fix 01ad956, que aplastaba solo los peldanos de la MISMA
//                 clave y por eso paso la suite pero fallo en el Android real
//   despues    -> el codigo de hoy
const VERSIONES = {
  'antes':      VoiceTextareaAntes,
  'qa-fallado': VoiceTextareaQaFallado,
  'despues':    VoiceTextareaDespues,
}
const version = VERSIONES[process.argv[2]] ? process.argv[2] : 'despues'
const Componente = VERSIONES[version]

console.log(`\nVerificacion del dictado por voz — version: ${version.toUpperCase()}`)
console.log(`relato dictado: ${RELATO_LIMPIO.length} caracteres, ${RELATO_LIMPIO.split(' ').length} palabras\n`)

// ── A · LA ESCALERA (la raiz del bug) ───────────────────────────────────────
console.log('A · La escalera: el motor entrega prefijos que crecen')

let escalera = null
await caso('A1 · el relato no crece de forma cuadratica', async () => {
  escalera = await dictar(Componente, voz.cintaEscalera(RELATO))
  const largo = escalera.texto?.length ?? 0
  console.log(`        dictado real ${RELATO_LIMPIO.length} chars -> guardado ${largo} chars (x${(largo / RELATO_LIMPIO.length).toFixed(1)})`)
  assert.ok(
    largo <= RELATO_LIMPIO.length * 1.2,
    `el relato se inflo a ${largo} chars (x${(largo / RELATO_LIMPIO.length).toFixed(1)}): es la escalera`
  )
})

await caso('A2 · el relato guardado es el que se dicto', async () => {
  assert.equal(escalera.texto, RELATO_LIMPIO)
})

await caso('A3 · ninguna frase aparece repetida', async () => {
  const t = escalera.texto ?? ''
  assert.ok(!/\b(\w+ \w+ \w+) \1\b/.test(t), `hay fragmentos repetidos: "${t.slice(0, 90)}..."`)
})

// ── A-BIS · LAS DOS FORMAS DEL DISPOSITIVO REAL ─────────────────────────────
// Las que destapó el QA en Android del 1 sep. La versión `qa-fallado` pasa
// todo lo de arriba y se cae acá: es exactamente lo que vio Daniel.
console.log('\nA-bis · Las dos formas que destapo el Android real')

const FRASE_QA = 'me gustaria decir que hoy hablando con ella se calmo'

await caso('A4 · forma A: el indice avanza con cada parcial', async () => {
  const r = await dictar(Componente, voz.cintaIndiceAvanza(FRASE_QA))
  const largo = r.texto?.length ?? 0
  console.log(`        dictado real ${FRASE_QA.length} chars -> guardado ${largo} chars (x${(largo / FRASE_QA.length).toFixed(1)})`)
  assert.equal(r.texto, FRASE_QA, `quedo la escalera: "${(r.texto ?? '').slice(0, 80)}..."`)
})

await caso('A5 · forma B: una sesion nueva por cada parcial', async () => {
  const r = await dictar(Componente, voz.cintaSesionPorParcial(FRASE_QA), { msGrabando: 40000 })
  const largo = r.texto?.length ?? 0
  console.log(`        dictado real ${FRASE_QA.length} chars -> guardado ${largo} chars (x${(largo / FRASE_QA.length).toFixed(1)})`)
  assert.equal(r.texto, FRASE_QA, `quedo la escalera: "${(r.texto ?? '').slice(0, 80)}..."`)
})

await caso('A6 · forma B: un motor que solo manda parciales no agota el techo', async () => {
  const r = await dictar(Componente, voz.cintaSesionPorParcial(FRASE_QA), { msGrabando: 40000 })
  const porTecho = r.bitacora.filter((b) => b.que === 'start').length
  console.log(`        sesiones abiertas: ${porTecho}`)
  assert.ok(
    (r.texto ?? '').includes('se calmo'),
    'la grabacion se corto antes del final: el techo se agoto porque nunca llego un final'
  )
})

// ── B · ANDROID: continuous=true no se respeta ──────────────────────────────
console.log('\nB · Android: el motor cierra despues de cada frase')

await caso('B1 · 12 frases con pausas no agotan el techo de reinicios', async () => {
  const { cinta, frases } = voz.cintaAndroidLarga(12)
  const r = await dictar(Componente, cinta, { msGrabando: 40000 })
  const faltan = frases.filter((f) => !(r.texto ?? '').includes(f))
  console.log(`        frases dictadas 12 -> guardadas ${12 - faltan.length}`)
  assert.equal(faltan.length, 0, `se perdieron ${faltan.length} frases: ${faltan.slice(0, 3).join(' | ')}`)
})

await caso('B2 · el relato de Android queda completo y en orden', async () => {
  const r = await dictar(Componente, voz.cintaAndroid(RELATO), { msGrabando: 40000 })
  assert.equal(r.texto, RELATO_LIMPIO)
})

// ── C · SAFARI: corta con la frase en el aire ───────────────────────────────
console.log('\nC · Safari: corta por silencio con el provisorio en vuelo')

await caso('C1 · no se pierde ninguna frase rescatada', async () => {
  const r = await dictar(Componente, voz.cintaSafari(RELATO), { msGrabando: 40000 })
  const faltan = RELATO.filter((f) => !(r.texto ?? '').includes(f))
  console.log(`        frases dictadas 4 -> guardadas ${4 - faltan.length}`)
  assert.equal(faltan.length, 0, `se perdieron ${faltan.length}: ${faltan.join(' | ')}`)
})

// ── D · MOTOR ROTO: el techo si tiene que cortar ────────────────────────────
console.log('\nD · Motor roto: rebota para siempre sin capturar nada')

await caso('D1 · corta en vez de rebotar infinito', async () => {
  voz.__cargarCinta(voz.cintaMotorRoto())
  const m = montar(Componente)
  await m.clic(m.grabar)
  await avanzar(60000)
  m.render()
  assert.ok(voz.__sesionesUsadas() < 200, `reinicio ${voz.__sesionesUsadas()} veces: no corta nunca`)
  m.desmontar()
})

await caso('D2 · no deja al usuario en "Procesando" por el timeout de 8s', async () => {
  voz.__cargarCinta(voz.cintaMotorRoto())
  const m = montar(Componente)
  await m.clic(m.grabar)
  await avanzar(60000)
  m.render()
  const stopsEnMuerto = voz.__bitacora().filter((b) => b.que === 'stop' && !b.corriendo)
  assert.equal(stopsEnMuerto.length, 0, `se llamo stop() sobre un motor ya muerto ${stopsEnMuerto.length} vez/veces: eso regala 8s de spinner`)
  m.desmontar()
})

// ── E · TOPE DURO ───────────────────────────────────────────────────────────
console.log('\nE · Cinturon de seguridad')

await caso('E1 · un relato desbocado se corta antes de llegar a la IA', async () => {
  const muchas = Array.from({ length: 60 }, (_, i) => `frase larga numero ${i + 1} con varias palabras adentro`)
  const r = await dictar(Componente, voz.cintaEscalera(muchas), { msGrabando: 200000 })
  const largo = r.texto?.length ?? 0
  console.log(`        largo final ${largo} chars`)
  assert.ok(largo <= 12000, `quedaron ${largo} chars: sin tope, esto viaja entero a la IA`)
})

// ── F · LO QUE SE VE ES LO QUE SE GUARDA ────────────────────────────────────
console.log('\nF · Coherencia entre lo que se revisa y lo que se guarda')

await caso('F1 · el texto en revision es el que se confirma', async () => {
  voz.__cargarCinta(voz.cintaAndroid(RELATO))
  const m = montar(Componente)
  await m.clic(m.grabar)
  await avanzar(40000)
  if (m.detener()) await m.clic(m.detener)
  await avanzar(15000)
  m.render()
  const visto = m.revision()
  if (m.agregar()) await m.clic(m.agregar)
  assert.equal(visto, m.texto(), 'el usuario aprueba un texto y se guarda otro')
  m.desmontar()
})

// ── Resumen ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(62)}`)
console.log(`${ok} OK, ${fallos.length} fallas — version ${version.toUpperCase()}`)
if (fallos.length) {
  console.log('\nDetalle:')
  fallos.forEach((f) => console.log(`  · ${f.nombre}\n    ${f.e.message.split('\n')[0]}`))
}
console.log()

// En la version ANTES las fallas son la EVIDENCIA del bug, asi que salir con 1
// seria mentir: lo que se pide es que falle. El codigo de salida solo manda en
// la version DESPUES.
process.exit(version === 'despues' && fallos.length ? 1 : 0)
