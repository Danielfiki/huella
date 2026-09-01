// SpeechRecognition falso y controlable. Reemplaza al motor del navegador para
// que el VoiceTextarea REAL corra en Node sin tocar una linea.
//
// La idea central: un motor de voz no entrega "el texto". Entrega una secuencia
// de eventos, y cada navegador la entrega distinto. Lo que rompio el dictado no
// fue el motor: fue que el componente asumia UNA forma de esa secuencia. Asi
// que acá la secuencia es un dato de entrada — una CINTA — y cada cinta es un
// navegador distinto.
//
// Una cinta es una lista de SESIONES. Cada vez que el componente llama a
// start(), el motor consume la siguiente sesion y va emitiendo sus eventos en
// el reloj virtual. Cuando la cinta se acaba, las sesiones que siguen son
// silencio: el motor abre y cierra sin capturar nada.
//
// Cada evento es una de estas tres formas:
//   { ms, resultados: [{ texto, final }], indice }  -> dispara onresult
//   { ms, fin: true }                               -> dispara onend
//   { ms, error: 'no-speech' }                      -> dispara onerror

let cinta = []
let sesionActual = 0
let vivo = null

// Bitacora de lo que el componente le PIDIO al motor. Es la mitad que no se ve
// mirando solo el texto final: cuantas veces reinicio, si llamo a stop() sobre
// un motor ya muerto, si aborto lo que debia abortar.
let bitacora = []

export function __cargarCinta(nueva) {
  cinta = nueva
  sesionActual = 0
  vivo = null
  bitacora = []
}

export function __bitacora() { return bitacora }
export function __sesionesUsadas() { return sesionActual }

// Constructor que el componente ve como window.SpeechRecognition.
export function SpeechRecognitionFalso() {
  this.lang = ''
  this.continuous = false
  this.interimResults = false
  this.onresult = null
  this.onend = null
  this.onerror = null
  this._corriendo = false
  this._timers = []
  // Lista acumulada de la sesion en curso. Se vacia en cada start().
  this._results = []
}

SpeechRecognitionFalso.prototype.start = function () {
  // Fiel al navegador: start() sobre un motor ya corriendo TIRA. Es justo el
  // tropiezo que en Chrome mata la grabacion entera cuando se reinicia sin
  // esperar, asi que el falso tiene que poder reproducirlo.
  if (this._corriendo) {
    bitacora.push({ que: 'start-invalido', sesion: sesionActual })
    const e = new Error('Failed to execute start: recognition has already started')
    e.name = 'InvalidStateError'
    throw e
  }
  this._corriendo = true
  this._results = []
  vivo = this

  // Cuando la cinta se acaba, las sesiones siguientes son SILENCIO: abren y
  // cierran sin capturar nada. Es lo que pasa de verdad cuando la persona dejo
  // de hablar pero todavia no aprieta stop. Repetir la ultima sesion en vez de
  // esto seria mentir: duplicaria la ultima frase y la prueba estaria midiendo
  // un invento del harness.
  const sesion = sesionActual < cinta.length
    ? cinta[sesionActual]
    : [{ ms: 300, fin: true }]
  bitacora.push({ que: 'start', sesion: sesionActual })
  sesionActual += 1

  for (const ev of sesion) {
    const id = setTimeout(() => {
      if (!this._corriendo && !ev.tardio) return
      if (ev.fin) {
        this._corriendo = false
        this.onend?.()
        return
      }
      if (ev.error) {
        this.onerror?.({ error: ev.error })
        return
      }
      // `e.results` es la lista ACUMULADA de la sesion, no lo del evento: el
      // componente recorre desde `resultIndex` hasta el final de esa lista.
      // Si el falso entregara solo el resultado del evento, un resultIndex
      // mayor que cero dejaria el bucle sin recorrer nada y la prueba pasaria
      // por no mirar.
      const base = ev.indice ?? 0
      ev.resultados.forEach((r, k) => {
        const item = [{ transcript: r.texto }]
        item.isFinal = r.final
        this._results[base + k] = item
      })
      this.onresult?.({ results: this._results, resultIndex: base })
    }, ev.ms)
    this._timers.push(id)
  }
}

SpeechRecognitionFalso.prototype.stop = function () {
  // Un stop() sobre un motor que ya termino NO vuelve a disparar onend. Esa es
  // exactamente la trampa que deja al usuario mirando "Procesando..." hasta que
  // salta la red de seguridad, asi que el falso la respeta.
  bitacora.push({ que: 'stop', corriendo: this._corriendo })
  if (!this._corriendo) return
  this._corriendo = false
  setTimeout(() => this.onend?.(), 5)
}

SpeechRecognitionFalso.prototype.abort = function () {
  bitacora.push({ que: 'abort', corriendo: this._corriendo })
  this._corriendo = false
  this._timers.forEach((id) => clearTimeout(id))
  this._timers = []
}

// ── Constructores de cintas ─────────────────────────────────────────────────

// CINTA 1 — LA ESCALERA. El motor entrega PREFIJOS QUE CRECEN, todos marcados
// como finales: "momento", "momento de", "momento de ir"... Es lo que hace
// Chrome en Android cuando la sesion es corta y interimResults esta prendido.
// Es la cinta que reproduce los 77.685 caracteres de la tester.
// El indice avanza POR FRASE, no por evento: los peldanos de una misma frase
// son revisiones del MISMO resultado (mismo indice), y la frase siguiente
// estrena indice. Asi lo entrega el navegador, y la distincion es justamente
// la que el codigo tiene que respetar: mismo indice = reemplazar, indice nuevo
// = agregar.
export function cintaEscalera(frases) {
  const eventos = []
  let t = 100
  frases.forEach((frase, indice) => {
    const palabras = frase.split(' ')
    for (let n = 1; n <= palabras.length; n++) {
      eventos.push({
        ms: t,
        indice,
        resultados: [{ texto: palabras.slice(0, n).join(' '), final: true }],
      })
      t += 120
    }
  })
  return [eventos]
}

// CINTA 2 — ANDROID DE VERDAD. Dos cosas a la vez, y la mezcla es la que
// importa:
//   (a) continuous=true NO se respeta: el motor cierra despues de cada frase,
//       asi que hay una sesion por frase y un onend entre medio.
//   (b) por cada frase llegan DECENAS de parciales, uno por palabra, antes del
//       final.
//
// Por que importa la mezcla: el dato de produccion mostro que entre el 12 y el
// 30 de agosto ningun relato se desboco, y que la escalera aparecio recien el
// 31 con una tester en Android. O sea que la acumulacion existia desde el 12,
// pero con pocos parciales por frase el dedupe alcanzaba a taparla. Lo que la
// hace estallar es el VOLUMEN de parciales de Chrome Android. Una cinta con un
// solo final por frase no reproduce el caso real: parece sana y no prueba nada.
export function cintaAndroid(frases) {
  return frases.map((frase) => {
    const palabras = frase.split(' ')
    const eventos = []
    let t = 60
    for (let n = 1; n <= palabras.length; n++) {
      eventos.push({
        ms: t,
        indice: 0,
        resultados: [{ texto: palabras.slice(0, n).join(' '), final: false }],
      })
      t += 60
    }
    // El final llega con la frase entera, y encima el motor cierra la sesion.
    eventos.push({ ms: t, indice: 0, resultados: [{ texto: frase, final: true }] })
    eventos.push({ ms: t + 120, fin: true })
    return eventos
  })
}

// CINTA 3 — SAFARI. El motor corta por silencio con la frase todavia en el
// aire: manda el provisorio y despues onend, SIN final. Sin rescate, cada
// rebote se come la frase que estaba sonando. Pocos parciales por frase: es el
// escenario donde el dedupe alcanzaba a tapar la acumulacion, y por eso el
// iPhone aguanto casi tres semanas sin que nadie viera nada.
export function cintaSafari(frases) {
  return frases.map((frase) => {
    const palabras = frase.split(' ')
    const mitad = Math.max(1, Math.ceil(palabras.length / 2))
    return [
      { ms: 120, indice: 0, resultados: [{ texto: palabras.slice(0, mitad).join(' '), final: false }] },
      { ms: 260, indice: 0, resultados: [{ texto: frase, final: false }] },
      { ms: 400, fin: true },
    ]
  })
}

// CINTA 4 — MOTOR ROTO. Rebota para siempre sin capturar nada. Acá el techo de
// reinicios SI tiene que cortar: es su unica razon de existir.
export function cintaMotorRoto() {
  return [[{ ms: 20, fin: true }]]
}

// CINTA 5 — ANDROID CON PAUSAS LARGAS. Como la 2 pero con muchas frases: sirve
// para probar que hablar con pausas no agota el techo de reinicios.
export function cintaAndroidLarga(n) {
  const frases = Array.from({ length: n }, (_, i) => `frase numero ${i + 1}`)
  return { cinta: cintaAndroid(frases), frases }
}
