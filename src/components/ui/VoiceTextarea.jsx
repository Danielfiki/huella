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

// Safari corta el reconocimiento por su cuenta tras un silencio. Lo
// reiniciamos, pero con techo: si rebota una y otra vez es que el motor quedó
// inservible y seguir intentando solo deja la UI mintiendo.
const MAX_REINICIOS_SR = 8

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
  const transcriptRef     = useRef('')
  // Última hipótesis del motor que todavía NO se marcó como final. Safari
  // descarta lo provisorio al cerrar la sesión, así que sin esto la frase con
  // que uno cierra el relato ("...fue muy complicado") se perdía siempre.
  const interimRef        = useRef('')
  // Lo provisorio que ya se sumó al ref. Si después llega su versión final, hay
  // que sacar esta copia antes de agregarla: si no, la frase queda dos veces.
  const interimCobradoRef = useRef('')
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

  // Suma al relato lo que quedó como provisorio. Se llama al cerrar: para el
  // motor esa frase nunca fue definitiva, pero el padre la dijo igual y prefiere
  // leerla imperfecta antes que no leerla.
  function cobrarInterim() {
    const pendiente = interimRef.current.trim()
    interimRef.current = ''
    if (!pendiente) return
    transcriptRef.current += (transcriptRef.current ? ' ' : '') + pendiente
    interimCobradoRef.current = pendiente
    logVoz('cobrarInterim: se rescata lo provisorio', { largo: pendiente.length })
  }

  // Called by rec.onend (after stop() + all pending onresult events have fired)
  // Siempre pasa a revisión, incluso sin audio captado: ahí el estado muestra
  // "No se captó audio", así que detener nunca termina en silencio.
  function finalizarRevision(via) {
    clearTimeout(endTimeoutRef.current)
    cobrarInterim()
    logVoz(`finalizarRevision via ${via}`, { largoRef: transcriptRef.current.length })
    // El motor pasa a "pendiente" en vez de descartarse. Si acá llegamos por la
    // red de seguridad, el motor sigue procesando y lo que emita después es
    // justamente la parte del relato que faltaba: `onresult` la sigue sumando
    // al ref y refrescando lo que se ve. Se aborta al confirmar, cancelar,
    // volver a grabar o desmontar — nunca cruza a la grabación siguiente.
    if (recRef.current) {
      recPendienteRef.current = recRef.current
      recRef.current = null
    }
    setTranscriptText(transcriptRef.current.trim())
    setVoiceEstado('revisando')
  }

  function mostrarError(msg) {
    clearTimeout(endTimeoutRef.current)
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
      largoRef: transcriptRef.current.length,
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

    isRecordingRef.current = true
    transcriptRef.current = ''
    interimRef.current = ''
    interimCobradoRef.current = ''
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

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = 'es-CL'
    rec.continuous = true
    // Activado no para mostrar texto en vivo, sino para tener un respaldo de la
    // frase en curso: es la única forma de no perder lo último que se dijo
    // cuando la sesión se cierra antes de que el motor la marque como final.
    rec.interimResults = true
    recRef.current = rec

    rec.onresult = (e) => {
      let provisorio = ''
      let huboFinal = false

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (!r.isFinal) {
          // Lo provisorio se ACUMULA dentro del evento pero REEMPLAZA lo del
          // evento anterior: mientras el motor refina una frase, cada evento
          // reenvía la versión completa de lo mismo. Sumarlas duplicaría.
          provisorio += r[0].transcript
          continue
        }
        huboFinal = true
        // Llegó la versión buena de algo que ya habíamos rescatado a la fuerza:
        // se saca la copia provisoria y queda solo la final.
        if (interimCobradoRef.current && transcriptRef.current.endsWith(interimCobradoRef.current)) {
          transcriptRef.current = transcriptRef.current
            .slice(0, -interimCobradoRef.current.length)
            .trimEnd()
        }
        interimCobradoRef.current = ''
        transcriptRef.current += (transcriptRef.current ? ' ' : '') + r[0].transcript
      }

      interimRef.current = provisorio.trim()

      // Solo se loguean los finales: con interimResults activo, los provisorios
      // disparan decenas de eventos por frase y ahogarían la consola.
      if (huboFinal) {
        logVoz('onresult final', { grabando: isRecordingRef.current, largoRef: transcriptRef.current.length })
      }
      // Llegó tarde: la red de seguridad ya nos pasó a revisión y el padre está
      // leyendo la transcripción. Esto la completa en pantalla; si no, leería
      // la mitad y confirmaría esa.
      if (!isRecordingRef.current) setTranscriptText(transcriptRef.current.trim())
    }

    // onend fires after stop() + all pending onresult events — safe to read transcript here
    rec.onend = () => {
      // Si seguimos grabando, este onend NO lo pedimos nosotros: Safari corta
      // el reconocimiento por su cuenta tras un silencio. Con push-to-talk casi
      // no pasaba porque las grabaciones duraban lo que el dedo aguantaba; con
      // toggle duran mucho más y pasa seguido. Sin este reinicio quedaba un
      // motor muerto con la UI mostrando las barras: de ahí en adelante no se
      // capturaba una palabra más.
      if (isRecordingRef.current) {
        // El corte también mata lo provisorio de esta sesión, así que se rescata
        // antes de rearrancar: si no, cada rebote se come la frase que estaba en
        // el aire justo cuando cortó.
        cobrarInterim()
        reiniciosRef.current += 1
        logVoz('onend: Safari corto, reiniciando', {
          reinicio: reiniciosRef.current,
          segundos: segundosRef.current,
          largoRef: transcriptRef.current.length,
        })
        if (reiniciosRef.current > MAX_REINICIOS_SR) {
          detenerRef.current?.()
          return
        }
        try {
          rec.start()
        } catch {
          // Ya está arrancando o el motor no acepta más: cerrar prolijo en vez
          // de dejar al usuario hablándole a un micrófono que no escucha.
          detenerRef.current?.()
        }
        return
      }
      finalizarRevision('onend')
    }

    rec.onerror = (e) => {
      logVoz('onerror', { error: e.error, largoRef: transcriptRef.current.length })
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        mostrarError('Permiso de micrófono denegado. Habilítalo en la configuración del navegador.')
      }
      // 'no-speech', 'network', 'audio-capture': onend still fires → finalizarRevision handles it
    }

    try {
      rec.start()
    } catch {
      mostrarError('No se pudo acceder al micrófono en este navegador.')
    }
  }

  function cancelarVoz() {
    soltarMotor()
    transcriptRef.current = ''
    setTranscriptText('')
    setVoiceEstado('idle')
  }

  function confirmarVoz() {
    // Se manda el ref y no `transcriptText`. El estado es una foto del último
    // render; el ref es todo lo que se dictó. Cuando un resultado llega entre
    // ese render y el toque de "Agregar" —que es lo que pasa con relatos
    // largos— la foto se queda corta y esa diferencia era relato perdido.
    const texto = transcriptRef.current.trim()
    logVoz('confirmarVoz', { largoEnviado: texto.length, largoVisible: transcriptText.length })
    soltarMotor()
    if (texto && onVoiceResult) {
      onVoiceResult((prev) => prev ? prev.trim() + ' ' + texto : texto)
    }
    transcriptRef.current = ''
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
