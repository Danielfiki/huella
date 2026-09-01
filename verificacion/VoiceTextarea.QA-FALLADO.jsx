import React, { useState, useRef, useEffect } from 'react'
import { Mic, Check, X, Square } from 'lucide-react'
import styles from './VoiceTextarea.module.css'

// ── Barras de "está grabando" ──
// NO leen el micrófono. Antes lo hacían vía getUserMedia + AudioContext, y eso
// era justamente lo que rompía la transcripción: en Safari iOS un MediaStream
// abierto y SpeechRecognition no pueden coexistir — mientras el stream vive, el
// reconocimiento no captura una palabra. Confirmado con un experimento que
// saltaba getUserMedia: la grabación volvió a transcribir al instante.
//
// Así que las barras pasaron a ser puro CSS. Cada una late con su propio ritmo,
// desfase y altura tope; los módulos con primos distintos hacen que los ciclos
// no coincidan nunca, así el conjunto se ve orgánico en vez de un loop
// sincronizado. Se calcula una sola vez al cargar el módulo.
//
// 14 y no 20: comparten la fila con el contador y el botón de stop, y en
// pantallas angostas 20 quedaban apretadas.
const NUM_BARS = 14
const BARRAS = Array.from({ length: NUM_BARS }, (_, i) => ({
  duracion: (0.65 + ((i * 7) % 9) * 0.09).toFixed(2),
  delay:    (((i * 5) % 11) * 0.11).toFixed(2),
  alto:     14 + ((i * 3) % 7) * 4,
}))

// Techo de duración de una grabación. Dos minutos cubre de sobra el relato de
// un episodio hablado, y protege del olvido: con toggle el micrófono queda
// abierto hasta que alguien lo cierre, así que si el usuario se distrae o
// bloquea el teléfono, esto lo cierra por él. Al llegar al tope NO se descarta
// nada — corta y pasa a revisión con todo lo dicho hasta ahí.
const MAX_SEGUNDOS = 120
// Umbral para avisar que se está acabando el tiempo.
const AVISO_SEGUNDOS = 20

// Un solo grabador activo en toda la app. Con push-to-talk esto lo garantizaba
// el gesto (un dedo sostenido, un botón); con toggle no: el usuario puede
// dejar uno grabando y tocar el de al lado. Pasa en PatronPage y en el
// detallado de RegistroPage, que muestran dos campos de voz a la vez.
//
// Guarda { token, detenerRef }, NO la función suelta. El token es un objeto de
// identidad estable por instancia: comparar funciones acá fue un bug real —
// `detenerGrabacion` se recrea en cada render, así que el `===` era casi
// siempre falso y el registro no se limpiaba nunca. El ref (en vez de la
// función capturada) garantiza llamar a la versión viva.
let grabadorActivo = null

// El motor corta el reconocimiento por su cuenta tras un silencio. Lo
// reiniciamos, pero con techo: si rebota una y otra vez es que quedó
// inservible y seguir intentando solo deja la UI mintiendo.
//
// OJO CON EL TECHO: cuenta reinicios SEGUIDOS SIN CAPTURAR NADA, no reinicios
// totales. La diferencia importa porque en Chrome Android `continuous = true`
// no se respeta: el motor cierra después de CADA frase, así que reiniciar es
// el funcionamiento normal, no la excepción. Contando reinicios totales, ocho
// pausas apagaban la grabación con el cuidador hablando — y eso es justo lo
// que reportó la tester del 31 ago.
const MAX_REINICIOS_SR = 8

// Cuánto se espera antes de rearrancar. Un `start()` sincrónico dentro de
// `onend` tira `InvalidStateError` en Chrome: el motor todavía no termina de
// soltarse. Se rearranca con instancia nueva y con este respiro.
const MS_ESPERA_REINICIO = 150
// Cuántas veces se reintenta un `start()` que tropieza antes de rendirse. Antes
// era cero: el primer tropiezo mataba la grabación entera.
const MAX_INTENTOS_START = 3

// Techo duro del relato. No existe dictado humano de 8.000 caracteres: a 150
// palabras por minuto, los 2 minutos de tope dan unos 1.800. Esto no es un
// límite de producto, es un cinturón de seguridad — si algún motor vuelve a
// entregar los resultados de una forma que no previmos, el relato se corta acá
// en vez de viajar entero a la IA. El 31 ago se fueron 77.685 caracteres de
// basura a una llamada de Anthropic por no tener esto.
const MAX_CARACTERES = 8000

// Cuánto se espera el `onend` después de pedir stop() antes de dar por muerto
// al motor y pasar a revisión igual.
//
// Estaban 2s, y era un techo mal calibrado: se eligió pensando en la latencia
// típica, cuando el trabajo de esta red es detectar que el onend NO va a
// llegar nunca. Con relatos largos Safari se demora más de 2s solo en procesar
// el audio pendiente, así que la red se disparaba en grabaciones sanas y
// congelaba media transcripción. 8s no es latencia: a los 8s el motor está
// roto de verdad. Y como los resultados tardíos ahora siguen entrando después
// de finalizar, pasarse de largo ya no cuesta texto — solo tiempo de spinner.
const MS_ESPERA_ONEND = 8000

// Gracia antes de congelar la frase provisoria.
//
// Rescatarla no basta: Safari la deja a medio cocinar cuando se le interrumpe,
// y "difícil" llegaba como "dif". Pero el motor sigue emitiendo un momento
// después de stop(), y ahí suele mandar la versión terminada. Así que se espera
// un poco antes de dar por buena la hipótesis cruda.
//
// 1s: con 800ms un iPhone cargado no siempre alcanza, y sobre 1200ms la espera
// se empieza a notar. Como el estado sigue en "Procesando…", el costo visible
// es que ese spinner dure un pelo más.
const MS_GRACIA_INTERIM = 1000

// ── TEMPORAL - DIAGNOSTICO HUECOS DE TRANSCRIPCION - SACAR ──────────────
// Sirve para responder UNA pregunta con un solo QA: ¿el relato queda completo,
// o los rebotes de Safari se comen pedazos? Por eso registra el largo del ref
// en cada punto donde podría perderse texto, y por dónde entró la finalización.
// PARA SACARLO: borrar este bloque y toda línea que contenga `logVoz`.
let seqVoz = 0
function logVoz(evento, datos) {
  seqVoz += 1
  console.log(`[VOZ ${String(seqVoz).padStart(2, '0')}] ${evento}`, datos || '')
}
// ── FIN TEMPORAL ────────────────────────────────────────────────────────

function formatearTiempo(seg) {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VoiceTextarea({ value, onChange, onVoiceResult, placeholder = '' }) {
  // idle | grabando | finalizando | revisando | error
  const [voiceEstado, setVoiceEstado] = useState('idle')
  const [transcriptText, setTranscriptText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [segundos, setSegundos] = useState(0)

  const recRef            = useRef(null)
  // Motor que ya finalizó pero todavía puede emitir resultados tardíos. Se
  // separa del activo para que `detenerGrabacion` no lo confunda con uno en
  // curso, pero sigue siendo un motor vivo y hay que abortarlo (ver
  // `soltarMotor`).
  const recPendienteRef   = useRef(null)
  // ── El relato se GUARDA POR CLAVE, nunca se concatena ─────────────────
  //
  // Este es el corazón del componente y la causa del bug del 31 ago. Antes el
  // relato era un string al que se le sumaba cada resultado con `+=`. Eso es
  // correcto solo si cada resultado es un pedazo NUEVO. Pero un motor de voz
  // también reenvía el MISMO pedazo con más palabras a medida que entiende
  // mejor: "momento", "momento de", "momento de ir"... Sumando, el relato
  // termina siendo la escalera entera. Con 161 palabras dictadas eso da 77.685
  // caracteres, que es exactamente lo que llegó a la base.
  //
  // La solución no es detectar y descontar duplicados —eso ya se intentó y era
  // el parche que además se comía frases buenas—, sino que guardar deje de ser
  // una suma. Cada resultado se guarda bajo la clave `sesion:indice`: si el
  // motor reenvía ese mismo resultado con el texto crecido, REEMPLAZA en vez de
  // sumar. Guardar pasa a ser idempotente y la escalera no se puede formar,
  // dé lo que dé el navegador.
  //
  // La `sesion` va en la clave porque al reiniciar los índices vuelven a
  // empezar en 0: sin ella, la primera frase de la sesión nueva pisaría a la
  // primera de la anterior.
  const finalesRef        = useRef(new Map())   // `sesion:indice` -> texto final
  const parcialesRef      = useRef(new Map())   // `sesion:indice` -> texto en curso
  const sesionRef         = useRef(0)
  const graciaTimeoutRef  = useRef(null)
  const enGraciaRef       = useRef(false)
  const isRecordingRef    = useRef(false)
  const endTimeoutRef     = useRef(null)
  const tickIntervalRef   = useRef(null)
  const segundosRef       = useRef(0)
  const reiniciosRef      = useRef(0)
  // Puntero siempre-vivo a `detenerGrabacion` (la función se recrea en cada
  // render; el ref no).
  const detenerRef        = useRef(null)
  // Identidad de ESTA instancia, estable de por vida. Es lo que se compara
  // contra el registro global — nunca la función.
  const tokenRef          = useRef({})

  const disponibleVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  // Si el usuario navega a otra pantalla mientras graba, el componente se
  // desmonta y esto cierra todo: el reconocimiento nunca queda abierto de
  // fondo. Con toggle importa más que antes — ya no hay un dedo levantándose
  // que marque el fin de la grabación.
  useEffect(() => () => {
    clearTimeout(endTimeoutRef.current)
    clearTimeout(graciaTimeoutRef.current)
    clearInterval(tickIntervalRef.current)
    if (grabadorActivo?.token === tokenRef.current) grabadorActivo = null
    // Bajar la bandera antes de abortar: si algún handler pendiente del SR
    // dispara durante el desmontaje, tiene que verse a sí mismo como detenido
    // y no intentar reiniciarse.
    isRecordingRef.current = false
    logVoz('desmontaje')
    soltarMotor()
  }, [])

  // Mata de verdad cualquier motor que siga vivo, activo o pendiente.
  //
  // Soltar la referencia NO alcanza, y esa fue la causa del bug: en Safari iOS
  // un SpeechRecognition abierto impide que el siguiente capture — el mismo
  // conflicto que teníamos con getUserMedia, solo que ahora entre dos SR. Y
  // como la app es una SPA, un motor huérfano sobrevive a la navegación y se
  // arrastra hasta la grabación del episodio siguiente.
  //
  // Los handlers se desconectan antes del abort() porque abort() dispara onend,
  // y sin esto ese onend volvería a entrar a finalizarRevision.
  function soltarMotor() {
    const rec = recRef.current || recPendienteRef.current
    recRef.current = null
    recPendienteRef.current = null
    if (!rec) return
    logVoz('soltarMotor: habia un motor vivo, se aborta')
    rec.onresult = null
    rec.onend = null
    rec.onerror = null
    try { rec.abort() } catch { /* ya estaba muerto */ }
  }

  // Arma el relato a partir de lo guardado, en el orden en que se dijo.
  //
  // `conParciales` incluye lo que el motor todavía no marcó como definitivo.
  // Va en true en todos lados menos donde solo interesa saber si hubo avance:
  // para el motor esa última frase nunca fue final, pero el cuidador la dijo
  // igual y prefiere leerla imperfecta antes que no leerla.
  function armarRelato(conParciales = true) {
    const claves = new Set(finalesRef.current.keys())
    if (conParciales) for (const k of parcialesRef.current.keys()) claves.add(k)

    const orden = [...claves].sort((a, b) => {
      const [sa, ia] = a.split(':').map(Number)
      const [sb, ib] = b.split(':').map(Number)
      return sa - sb || ia - ib
    })

    const trozos = []
    for (const k of orden) {
      // El final manda siempre: si existe, el parcial de esa misma clave es una
      // versión vieja de lo mismo y no debe aparecer además.
      const t = (finalesRef.current.get(k) ?? parcialesRef.current.get(k) ?? '').trim()
      if (t) trozos.push(t)
    }

    const relato = trozos.join(' ')
    return relato.length > MAX_CARACTERES ? relato.slice(0, MAX_CARACTERES) : relato
  }

  function hayParciales() {
    for (const t of parcialesRef.current.values()) if (t.trim()) return true
    return false
  }

  // Called by rec.onend (after stop() + all pending onresult events have fired)
  // Siempre pasa a revisión, incluso sin audio captado: ahí el estado muestra
  // "No se captó audio", así que detener nunca termina en silencio.
  function finalizarRevision(via) {
    clearTimeout(endTimeoutRef.current)

    // Ya estamos esperando la frase terminada: un onend que entre acá en medio
    // no puede cortar la espera, o congelaría justo la palabra a medias que la
    // gracia venía a rescatar. Solo la red de seguridad manda por encima.
    if (enGraciaRef.current && via !== 'timeout') {
      logVoz(`finalizarRevision via ${via}: ya en gracia, se deja correr`)
      return
    }
    // El motor pasa a "pendiente" en vez de descartarse. Sigue procesando, y lo
    // que emita después es justamente la parte del relato que faltaba:
    // `onresult` la sigue sumando al ref y refrescando lo que se ve. Se aborta
    // al confirmar, cancelar, volver a grabar o desmontar — nunca cruza a la
    // grabación siguiente.
    if (recRef.current) {
      recPendienteRef.current = recRef.current
      recRef.current = null
    }

    // Quedó una frase a medio cocinar. Antes de congelarla se le da un momento
    // al motor para que mande la versión terminada. No se aplica si venimos de
    // la red de seguridad: ahí ya se esperaron 8 segundos y el motor no va a
    // reaccionar.
    if (hayParciales() && via !== 'timeout' && !enGraciaRef.current) {
      enGraciaRef.current = true
      logVoz(`finalizarRevision via ${via}: hay provisorio, se espera el final`)
      setVoiceEstado('finalizando')
      graciaTimeoutRef.current = setTimeout(() => cerrarRevision('gracia-vencida'), MS_GRACIA_INTERIM)
      return
    }

    cerrarRevision(via)
  }

  // Congela lo que haya y muestra la transcripción. Es el único punto que pasa
  // a 'revisando'.
  function cerrarRevision(via) {
    clearTimeout(graciaTimeoutRef.current)
    enGraciaRef.current = false
    const relato = armarRelato()
    logVoz(`cerrarRevision via ${via}`, { largoRelato: relato.length })
    setTranscriptText(relato)
    setVoiceEstado('revisando')
  }

  function mostrarError(msg) {
    clearTimeout(endTimeoutRef.current)
    clearTimeout(graciaTimeoutRef.current)
    enGraciaRef.current = false
    clearInterval(tickIntervalRef.current)
    isRecordingRef.current = false
    if (grabadorActivo?.token === tokenRef.current) grabadorActivo = null
    soltarMotor()
    setErrorMsg(msg)
    setVoiceEstado('error')
    setTimeout(() => { setVoiceEstado('idle'); setErrorMsg('') }, 3500)
  }

  // Detiene la grabación en curso. Se llama desde el botón de stop, desde el
  // tope de tiempo, o desde otro grabador que arranca y reclama el turno.
  function detenerGrabacion() {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    if (grabadorActivo?.token === tokenRef.current) grabadorActivo = null
    clearInterval(tickIntervalRef.current)
    logVoz('detenerGrabacion', {
      segundos: segundosRef.current,
      reinicios: reiniciosRef.current,
      largoRelato: armarRelato().length,
    })
    if (recRef.current) {
      // Transition to 'finalizando' while SR processes pending audio.
      // rec.onend fires after all onresult events, then calls finalizarRevision().
      setVoiceEstado('finalizando')
      // Red de seguridad por si onend nunca llega (bug del navegador).
      endTimeoutRef.current = setTimeout(() => finalizarRevision('timeout'), MS_ESPERA_ONEND)
      recRef.current.stop()
    } else {
      finalizarRevision('sin-motor')
    }
  }

  detenerRef.current = detenerGrabacion

  // Síncrona de punta a punta: entre tocar el botón y `rec.start()` no hay
  // ningún await, así que no existe una ventana en la que la UI diga
  // "grabando" mientras el reconocimiento todavía no arrancó.
  function iniciarGrabacion() {
    if (isRecordingRef.current || voiceEstado !== 'idle') return

    // Si hay otro campo de voz grabando, se cierra antes de abrir este. Nunca
    // dos reconocimientos a la vez.
    if (grabadorActivo && grabadorActivo.token !== tokenRef.current) {
      grabadorActivo.detenerRef.current?.()
    }
    grabadorActivo = { token: tokenRef.current, detenerRef }

    // Último cortafuegos: si de la grabación anterior quedó un motor respirando,
    // muere acá. Dos SpeechRecognition abiertos en Safari iOS terminan en una
    // transcripción a medias, y ese es justamente el síntoma que perseguimos.
    soltarMotor()
    logVoz('iniciarGrabacion')

    clearTimeout(graciaTimeoutRef.current)
    enGraciaRef.current = false
    isRecordingRef.current = true
    finalesRef.current = new Map()
    parcialesRef.current = new Map()
    sesionRef.current = 0
    segundosRef.current = 0
    reiniciosRef.current = 0
    setSegundos(0)
    setVoiceEstado('grabando')

    // Reloj de la grabación: alimenta el contador visible y aplica el tope.
    // El conteo vive en un ref y el corte se decide acá, fuera del updater de
    // setState, que debe ser puro.
    tickIntervalRef.current = setInterval(() => {
      segundosRef.current += 1
      setSegundos(segundosRef.current)
      if (segundosRef.current >= MAX_SEGUNDOS) detenerRef.current?.()
    }, 1000)

    arrancarMotor({ primero: true })
  }

  // Arma un motor nuevo con sus manejadores. Cada reinicio crea uno: reusar la
  // misma instancia es lo que hace que Chrome tire `InvalidStateError` al
  // rearrancar, porque el objeto todavía se está soltando.
  function crearMotor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null

    const rec = new SR()
    rec.lang = 'es-CL'
    rec.continuous = true
    // Activado no para mostrar texto en vivo, sino para tener un respaldo de la
    // frase en curso: es la única forma de no perder lo último que se dijo
    // cuando la sesión se cierra antes de que el motor la marque como final.
    rec.interimResults = true

    rec.onresult = (e) => {
      let huboFinal = false

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const clave = `${sesionRef.current}:${i}`
        const texto = r[0].transcript

        if (r.isFinal) {
          huboFinal = true
          // `set` y no `+=`: si este índice ya tenía algo, esto es la versión
          // mejorada de lo mismo y tiene que reemplazarla. Acá se corta la
          // escalera de raíz.
          finalesRef.current.set(clave, texto)
          parcialesRef.current.delete(clave)
        } else {
          parcialesRef.current.set(clave, texto)
        }
      }

      // Llegó texto definitivo: el motor está sano. El contador de reinicios
      // vuelve a cero porque solo debe atrapar rebotes SEGUIDOS SIN CAPTURAR
      // NADA. Sin esto, hablar con pausas en Android agotaba el techo y la
      // grabación se apagaba sola con el cuidador hablando.
      if (huboFinal) {
        reiniciosRef.current = 0
        // Solo se loguean los finales: con interimResults activo, los
        // provisorios disparan decenas de eventos por frase y ahogarían la
        // consola.
        logVoz('onresult final', {
          grabando: isRecordingRef.current,
          largoRelato: armarRelato().length,
        })
      }

      // Justo lo que la gracia estaba esperando: llegó la frase terminada, así
      // que no hace falta seguir esperando ni congelar la versión cruda.
      if (huboFinal && enGraciaRef.current) {
        cerrarRevision('final-dentro-de-la-gracia')
        return
      }

      // Llegó tarde: la red de seguridad ya nos pasó a revisión y el cuidador
      // está leyendo la transcripción. Esto la completa en pantalla; si no,
      // leería la mitad y confirmaría esa.
      if (!isRecordingRef.current) setTranscriptText(armarRelato())
    }

    rec.onend = () => {
      // Si seguimos grabando, este onend NO lo pedimos nosotros: el motor cortó
      // por su cuenta tras un silencio. En Safari pasa cada tanto; en Chrome
      // Android pasa DESPUÉS DE CADA FRASE, porque ahí `continuous = true` no
      // se respeta. Así que reiniciar no es la excepción: es el funcionamiento
      // normal, y todo lo que cuelgue de acá tiene que aguantarlo.
      if (isRecordingRef.current) {
        reiniciosRef.current += 1
        logVoz('onend: el motor cerro solo, reiniciando', {
          reinicioSeguido: reiniciosRef.current,
          segundos: segundosRef.current,
          largoRelato: armarRelato().length,
        })

        if (reiniciosRef.current > MAX_REINICIOS_SR) {
          // Se cierra DIRECTO, sin pasar por detenerGrabacion. Ese camino
          // llamaba a stop() sobre un motor que ya estaba muerto, y un stop
          // sobre un motor detenido no vuelve a disparar onend: el cuidador
          // quedaba 8 segundos mirando "Procesando…" para nada.
          isRecordingRef.current = false
          if (grabadorActivo?.token === tokenRef.current) grabadorActivo = null
          clearInterval(tickIntervalRef.current)
          clearTimeout(endTimeoutRef.current)
          recRef.current = null
          cerrarRevision('techo-de-reinicios')
          return
        }

        // Sesión nueva: los índices del motor vuelven a empezar en 0, así que
        // sin esto la primera frase de la sesión que viene pisaría a la
        // primera de la que se acaba de cerrar.
        sesionRef.current += 1
        recRef.current = null
        setTimeout(() => {
          if (isRecordingRef.current) arrancarMotor({ primero: false })
        }, MS_ESPERA_REINICIO)
        return
      }
      finalizarRevision('onend')
    }

    rec.onerror = (e) => {
      logVoz('onerror', { error: e.error, largoRelato: armarRelato().length })
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        mostrarError('Permiso de micrófono denegado. Habilítalo en la configuración del navegador.')
      }
      // 'no-speech', 'network', 'audio-capture': igual llega onend → lo maneja
      // el reinicio o finalizarRevision.
    }

    return rec
  }

  // Arranca un motor nuevo. Si `start()` tropieza, reintenta en vez de matar la
  // grabación: antes el primer tropiezo la terminaba entera, y en Chrome ese
  // tropiezo es común justo después de un reinicio.
  function arrancarMotor({ primero, intento = 0 }) {
    const rec = crearMotor()
    if (!rec) {
      if (primero) mostrarError('No se pudo acceder al micrófono en este navegador.')
      return
    }
    recRef.current = rec
    try {
      rec.start()
    } catch {
      recRef.current = null
      if (intento + 1 < MAX_INTENTOS_START) {
        logVoz('start tropezo, reintentando', { intento: intento + 1 })
        setTimeout(() => {
          if (isRecordingRef.current) arrancarMotor({ primero, intento: intento + 1 })
        }, MS_ESPERA_REINICIO)
        return
      }
      logVoz('start fallo definitivo', { intentos: intento + 1 })
      if (primero) {
        mostrarError('No se pudo acceder al micrófono en este navegador.')
      } else {
        isRecordingRef.current = false
        if (grabadorActivo?.token === tokenRef.current) grabadorActivo = null
        clearInterval(tickIntervalRef.current)
        cerrarRevision('start-fallido')
      }
    }
  }

  function cancelarVoz() {
    soltarMotor()
    finalesRef.current = new Map()
    parcialesRef.current = new Map()
    setTranscriptText('')
    setVoiceEstado('idle')
  }

  function confirmarVoz() {
    // Se arma desde lo guardado y no se manda `transcriptText`. El estado es
    // una foto del último render; lo guardado es todo lo que se dictó. Cuando
    // un resultado llega entre ese render y el toque de "Agregar" —que es lo
    // que pasa con relatos largos— la foto se queda corta y esa diferencia era
    // relato perdido.
    const texto = armarRelato()
    logVoz('confirmarVoz', { largoEnviado: texto.length, largoVisible: transcriptText.length })
    soltarMotor()
    if (texto && onVoiceResult) {
      onVoiceResult((prev) => prev ? prev.trim() + ' ' + texto : texto)
    }
    finalesRef.current = new Map()
    parcialesRef.current = new Map()
    setTranscriptText('')
    setVoiceEstado('idle')
  }

  return (
    <div className={styles.narrativaWrap}>
      <div className={styles.narrativaBar}>

        {/* ── IDLE: textarea + botón micrófono ── */}
        {voiceEstado === 'idle' && (
          <>
            <textarea
              className={styles.narrativaTextarea}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={2}
            />
            {disponibleVoz && (
              <div className={styles.narrativaBtns}>
                <button
                  className={styles.narrativaMicBtn}
                  onClick={iniciarGrabacion}
                  // Con toggle ya no debería dispararse el menú del sistema,
                  // pero no estorban y cubren al usuario que igual mantiene el
                  // dedo apretado por costumbre.
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                  type="button"
                  aria-label="Grabar con voz"
                >
                  <Mic size={20} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ── GRABANDO ── */}
        {voiceEstado === 'grabando' && (
          <div className={styles.vozWaveformArea}>
            <span className={styles.vozRecDot} />
            <div className={styles.vozBars} aria-hidden="true">
              {BARRAS.map((b, i) => (
                <span
                  key={i}
                  className={styles.vozBar}
                  style={{
                    height: `${b.alto}px`,
                    animationDuration: `${b.duracion}s`,
                    animationDelay: `${b.delay}s`,
                  }}
                />
              ))}
            </div>
            <span
              className={`${styles.vozTiempo} ${MAX_SEGUNDOS - segundos <= AVISO_SEGUNDOS ? styles.vozTiempoPorTerminar : ''}`}
            >
              {formatearTiempo(segundos)}
            </span>
            <button
              className={styles.vozStopBtn}
              onClick={detenerGrabacion}
              type="button"
              aria-label="Detener grabación"
            >
              <Square size={13} fill="currentColor" />
            </button>
          </div>
        )}

        {/* ── FINALIZANDO: SR procesando audio restante ── */}
        {voiceEstado === 'finalizando' && (
          <div className={styles.vozProcesandoRow}>
            <span className={styles.vozSpinner} />
            <span className={styles.vozProcesandoLabel}>Procesando…</span>
          </div>
        )}

        {/* ── REVISANDO: texto transcrito + X / Agregar ── */}
        {voiceEstado === 'revisando' && (
          <div className={styles.vozRevisando}>
            <p className={styles.vozTranscriptText}>
              {transcriptText || <em className={styles.vozTranscriptVacio}>No se captó audio</em>}
            </p>
            <div className={styles.vozRevisandoBtns}>
              <button className={styles.vozCancelarBtn} onClick={cancelarVoz} type="button" aria-label="Cancelar">
                <X size={16} />
              </button>
              <button className={styles.vozConfirmarBtn} onClick={confirmarVoz} type="button">
                <Check size={16} />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR: permiso denegado u otro fallo ── */}
        {voiceEstado === 'error' && (
          <div className={styles.vozErrorRow}>
            <span className={styles.vozErrorMsg}>{errorMsg}</span>
          </div>
        )}

      </div>
    </div>
  )
}
