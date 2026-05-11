import React, { useState, useRef, useEffect } from 'react'
import { Mic, Check, X } from 'lucide-react'
import styles from './VoiceTextarea.module.css'

const NUM_BARS = 20

export default function VoiceTextarea({ value, onChange, onVoiceResult, placeholder = '' }) {
  // idle | grabando | finalizando | revisando | error
  const [voiceEstado, setVoiceEstado] = useState('idle')
  const [transcriptText, setTranscriptText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const recRef            = useRef(null)
  const transcriptRef     = useRef('')
  const audioCtxRef       = useRef(null)
  const analyserRef       = useRef(null)
  const streamRef         = useRef(null)
  const animFrameRef      = useRef(null)
  const barsRef           = useRef([])
  const releaseHandlerRef = useRef(null)
  const isRecordingRef    = useRef(false)
  const holdStartRef      = useRef(0)
  const endTimeoutRef     = useRef(null)

  const disponibleVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => () => {
    clearTimeout(endTimeoutRef.current)
    if (releaseHandlerRef.current) {
      document.removeEventListener('mouseup', releaseHandlerRef.current)
      document.removeEventListener('touchend', releaseHandlerRef.current)
    }
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    recRef.current?.abort()
  }, [])

  function startWaveform() {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      animFrameRef.current = requestAnimationFrame(tick)
      analyser.getByteFrequencyData(data)
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        const bin = Math.floor((i / NUM_BARS) * data.length * 0.6)
        const v = data[bin] || 0
        bar.style.height = Math.max(3, (v / 255) * 34) + 'px'
      })
    }
    tick()
  }

  // Called by rec.onend (after stop() + all pending onresult events have fired)
  function finalizarRevision() {
    clearTimeout(endTimeoutRef.current)
    const held = Date.now() - holdStartRef.current
    const captured = transcriptRef.current.trim()
    if (held < 300 && !captured) {
      setVoiceEstado('idle')
    } else {
      setTranscriptText(captured)
      setVoiceEstado('revisando')
    }
  }

  function mostrarError(msg) {
    clearTimeout(endTimeoutRef.current)
    isRecordingRef.current = false
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    recRef.current = null
    if (releaseHandlerRef.current) {
      document.removeEventListener('mouseup', releaseHandlerRef.current)
      document.removeEventListener('touchend', releaseHandlerRef.current)
    }
    setErrorMsg(msg)
    setVoiceEstado('error')
    setTimeout(() => { setVoiceEstado('idle'); setErrorMsg('') }, 3500)
  }

  async function startMic() {
    if (isRecordingRef.current || voiceEstado !== 'idle') return
    isRecordingRef.current = true
    holdStartRef.current = Date.now()
    transcriptRef.current = ''
    setVoiceEstado('grabando')

    const onRelease = () => {
      document.removeEventListener('mouseup', onRelease)
      document.removeEventListener('touchend', onRelease)
      if (!isRecordingRef.current) return
      isRecordingRef.current = false
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close().catch(() => {})
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
    releaseHandlerRef.current = onRelease
    // 80ms delay: prevents the mouseup from the same click triggering onRelease immediately
    setTimeout(() => {
      document.addEventListener('mouseup', onRelease)
      document.addEventListener('touchend', onRelease)
    }, 80)

    // Web Audio API — best-effort waveform visualization
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (!isRecordingRef.current) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          audioCtxRef.current = ctx
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 64
          analyserRef.current = analyser
          ctx.createMediaStreamSource(stream).connect(analyser)
          startWaveform()
        }
      } catch {
        // getUserMedia denied or unavailable — SR may still work independently
      }
    }

    if (!isRecordingRef.current) return

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
      if (isRecordingRef.current) return // SR ended unexpectedly while still recording
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
                  onMouseDown={startMic}
                  onTouchStart={(e) => { e.preventDefault(); startMic() }}
                  type="button"
                  aria-label="Mantén presionado para dictar"
                >
                  <Mic size={17} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ── GRABANDO ── */}
        {voiceEstado === 'grabando' && (
          <div className={styles.vozWaveformArea}>
            <span className={styles.vozRecDot} />
            <div className={styles.vozBars}>
              {Array.from({ length: NUM_BARS }, (_, i) => (
                <span
                  key={i}
                  ref={(el) => { barsRef.current[i] = el }}
                  className={styles.vozBar}
                  style={{ animationDelay: `${i * 0.07}s` }}
                />
              ))}
            </div>
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
