// OnboardingComposer.jsx
// Corazón del onboarding · slide 3.
// Maneja la máquina de estados local: idle → typing → loading → response | fallback.
//
// La llamada a la API se hace en `requestPrimerEncuentro()` (importada de ../../services/anthropic).
// Si falla por cualquier motivo (sin conexión, timeout, 5xx, parse error), cae al
// FALLBACK_RESPONSE en frases-onboarding.js. El usuario NUNCA ve un mensaje técnico
// de error — es su primer encuentro con el producto.
//
// Path: src/pages/onboarding/OnboardingComposer.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './OnboardingComposer.module.css';
import { FRASES_ONBOARDING, FALLBACK_RESPONSE } from './frases-onboarding';
import ProgressBar from '../../components/ui/ProgressBar';

// El helper Anthropic vive en src/services/anthropic.js — contrato esperado en
// el README del bundle, sección "API · primer encuentro".
import { requestPrimerEncuentro } from '../../services/anthropic';

const PHRASE_INTERVAL_MS = 2500;
const MIN_TEXT_LENGTH = 3;
const MAX_TEXT_LENGTH = 800;
// 15s: el modelo a veces tarda más de 8s con system prompts largos
// (PROMPT_PRIMER_ENCUENTRO pesa ~2.3KB). El timeout original de 8000ms
// hacía caer al fallback consistentemente por AbortError.
const API_TIMEOUT_MS = 15000;

/**
 * Props
 *   active        bool       · true cuando el acto está visible
 *   submitting    bool       · el cierre del onboarding está guardando
 *   saveError     bool       · el guardado falló; se puede reintentar
 *   onSubmit      (texto: string | null) => void
 *                              · cierra el onboarding con el texto escrito
 *   onSkipInline  () => void  · "Saltar este paso" — cierra sin texto
 */
export default function OnboardingComposer({
  active,
  submitting = false,
  saveError = false,
  onSubmit,
  onSkipInline,
}) {
  const [state, setState] = useState('idle'); // idle | typing | loading | response | fallback
  const [text, setText] = useState('');
  const [response, setResponse] = useState(null);
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * FRASES_ONBOARDING.length)
  );
  // Progreso visual del loader (0 → 90 → 100). Acompaña los 15s del timeout
  // para que el usuario sienta que el proceso avanza. `progressPhase` controla
  // qué transición CSS se aplica (lenta durante loading, rápida al completar).
  const [progress, setProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState('loading');
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  const canSubmit =
    text.trim().length >= MIN_TEXT_LENGTH &&
    (state === 'idle' || state === 'typing');

  const handleChange = (e) => {
    const value = e.target.value.slice(0, MAX_TEXT_LENGTH);
    setText(value);
    if (state === 'idle' || state === 'typing') {
      setState(value.trim().length > 0 ? 'typing' : 'idle');
    }
  };

  const startLoading = useCallback(async () => {
    if (!canSubmit) return;
    setState('loading');
    setPhraseIndex(Math.floor(Math.random() * FRASES_ONBOARDING.length));

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const resp = await requestPrimerEncuentro(text.trim(), {
        signal: controller.signal,
      });
      // Validación mínima del payload. Si falta cualquier campo crítico → fallback.
      if (!resp || !resp.comprension) throw new Error('payload-incompleto');
      setResponse(resp);
      setState('response');
    } catch (err) {
      // Log del error en consola: barato, da visibilidad para diagnósticos
      // futuros sin afectar UX (el usuario sigue viendo el fallback igual).
      console.error('[OnboardingComposer] requestPrimerEncuentro tiró:', err)
      // sin conexión / timeout / 5xx / parse — siempre fallback silencioso.
      setResponse(FALLBACK_RESPONSE);
      setState('fallback');
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
    }
  }, [canSubmit, text]);

  // Rotación de frase cada 2.5s mientras carga
  useEffect(() => {
    if (state !== 'loading') return undefined;
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % FRASES_ONBOARDING.length);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state]);

  // Progreso visual de la barra. Arranca en 0% al entrar a loading, sube
  // hasta 90% en 14s con curva ease-out (rápido al inicio, lento al final)
  // y NO llega a 100% durante el loading. Al recibir respuesta o fallback,
  // completa de 90 a 100 en 200ms.
  useEffect(() => {
    if (state === 'loading') {
      setProgressPhase('loading');
      setProgress(0);
      // Doble RAF: aseguramos que el browser pinte width:0 antes de cambiar
      // a 90 — sin esto, React colapsa ambos sets en un solo render y la
      // transición CSS no se dispara (no detecta cambio de width).
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setProgress(90);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
    if (state === 'response' || state === 'fallback') {
      setProgressPhase('complete');
      setProgress(100);
    }
    return undefined;
  }, [state]);

  // Cleanup al desmontar
  useEffect(() => () => abortRef.current?.abort(), []);

  const isShowingResponse = state === 'response' || state === 'fallback';

  // El contenido cambia por estado; la cabecera y el marco del acto son los
  // mismos siempre. Antes cada estado devolvia su propio arbol y la cabecera
  // la ponia el slide contenedor, que ya no existe.
  let contenido;

  if (isShowingResponse) {
    contenido = (
      <div className={styles.wrap}>
        <article className={styles.respCard} aria-live="polite">
          {String(response.comprension)
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((parrafo, i) => (
              <p key={i} className={styles.respPara}>{parrafo}</p>
            ))}
          {response.cita && (
            <blockquote className={styles.quote}>
              "{response.cita}"
              {response.autor && (
                <cite className={styles.author}>— {response.autor}</cite>
              )}
            </blockquote>
          )}
          {response.marco && (
            <p className={styles.marco}>Marco · {response.marco}</p>
          )}
        </article>
        {saveError && (
          <p role="alert" className={styles.error}>
            No pudimos guardar tus datos. Revisa tu conexión y vuelve a intentar.
          </p>
        )}
        <button
          type="button"
          className={styles.cta}
          onClick={() => onSubmit(text.trim())}
          disabled={submitting}
          aria-disabled={submitting || undefined}
        >
          {submitting && <span className={styles.spin} aria-hidden="true" />}
          {submitting ? 'Guardando…' : 'Continuar'}
        </button>
      </div>
    );
  } else if (state === 'loading') {
    contenido = (
      <div className={styles.wrap}>
        <div className={styles.loadFrame} aria-live="polite" aria-busy="true">
          <div className={styles.ring} aria-hidden="true" />
          <p key={phraseIndex} className={styles.phrase}>
            "{FRASES_ONBOARDING[phraseIndex]}"
          </p>
          <ProgressBar
            value={progress}
            phase={progressPhase === 'complete' ? 'complete' : 'loading'}
            tone="onLight"
            color="var(--color-primary)"
            className={styles.progressSpace}
          />
        </div>
        <button type="button" className={styles.cta} disabled aria-disabled="true">
          <span className={styles.spin} aria-hidden="true" />
          Procesando
        </button>
      </div>
    );
  } else {
    contenido = (
      <div className={styles.wrap}>
        <textarea
          ref={textareaRef}
          className={`${styles.composer} ${state === 'typing' ? styles.composerFocus : ''}`}
          placeholder="Ej: Hoy gritó porque no quería bañarse..."
          value={text}
          onChange={handleChange}
          rows={4}
          maxLength={MAX_TEXT_LENGTH}
          aria-label="Cuéntale a Huella algo que te haya pasado"
        />
        {saveError && (
          <p role="alert" className={styles.error}>
            No pudimos guardar tus datos. Revisa tu conexión y vuelve a intentar.
          </p>
        )}
        <button
          type="button"
          className={styles.cta}
          onClick={startLoading}
          disabled={!canSubmit}
          aria-disabled={!canSubmit || undefined}
        >
          Ver qué dice Huella
        </button>
        <button
          type="button"
          className={styles.skipInline}
          onClick={onSkipInline}
          disabled={submitting}
        >
          {submitting ? 'Guardando…' : 'Saltar este paso'}
        </button>
      </div>
    );
  }

  return (
    <section className={styles.acto}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Tu primer momento</p>
        <h1 className={styles.title}>Cuéntale a Huella algo que te haya pasado</h1>
        {!isShowingResponse && state !== 'loading' && (
          <p className={styles.hint}>
            Cualquier cosa de estos días, como se la contarías a alguien. No hay
            forma correcta de escribirlo.
          </p>
        )}
      </header>
      {contenido}
    </section>
  );
}
