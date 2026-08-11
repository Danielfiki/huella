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
  const transcriptRef     = useRef('')
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
    recRef.current?.abort()
    recRef.current = null
  }, [])

  // Called by rec.onend (after stop() + all pending onresult events have fired)
  // Siempre pasa a revisión, incluso sin audio captado: ahí el estado muestra
  // "No se captó audio", así que detener nunca termina en silencio.
  function finalizarRevision() {
    clearTimeout(endTimeoutRef.current)
    // La instancia de SpeechRecognition ya cumplió y no se reusa: una que ya
    // terminó no vuelve a emitir onresult.
    recRef.current = null
    setTranscriptText(transcriptRef.current.trim())
    setVoiceEstado('revisando')
  }

  function mostrarError(msg) {
    clearTimeout(endTimeoutRef.current)
    clearInterval(tickIntervalRef.current)
    isRecordingRef.current = false
    if (grabadorActivo?.token === tokenRef.current) grabadorActivo = null
    recRef.current = null
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
    if (recRef.current) {
      // Transition to 'finalizando' while SR processes pending audio.
      // rec.onend fires after all onresult events, then calls finalizarRevision().
      setVoiceEstado('finalizando')
      // Safety net: if onend never fires (browser bug), fall through after 2s
      endTimeoutRef.current = setTimeout(finalizarRevision, 2000)
      recRef.current.stop()
    } else {
      finalizarRevision()
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

    isRecordingRef.current = true
    transcriptRef.current = ''
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
    rec.interimResults = false
    recRef.current = rec

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcriptRef.current += (transcriptRef.current ? ' ' : '') + e.results[i][0].transcript
        }
      }
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
        reiniciosRef.current += 1
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
      finalizarRevision()
    }

    rec.onerror = (e) => {
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
    transcriptRef.current = ''
    setTranscriptText('')
    setVoiceEstado('idle')
  }

  function confirmarVoz() {
    if (transcriptText && onVoiceResult) {
      onVoiceResult((prev) => prev ? prev.trim() + ' ' + transcriptText : transcriptText)
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
