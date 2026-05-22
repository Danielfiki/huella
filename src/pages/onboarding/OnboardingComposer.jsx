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

// El helper Anthropic vive en src/services/anthropic.js — contrato esperado en
// el README del bundle, sección "API · primer encuentro".
import { requestPrimerEncuentro } from '../../services/anthropic';

const PHRASE_INTERVAL_MS = 2500;
const MIN_TEXT_LENGTH = 3;
const MAX_TEXT_LENGTH = 800;
const API_TIMEOUT_MS = 8000;

/**
 * Props
 *   active        bool       · true cuando el slide está visible (para autofocus opcional)
 *   onSubmit      (texto: string | '') => void
 *                              · llamado al pulsar "Continuar" en el estado response/fallback.
 *                                Pasa el texto original (o '' si saltó).
 *   onSkipInline  () => void  · "Saltar este paso" — no persiste texto.
 */
export default function OnboardingComposer({ active, onSubmit, onSkipInline }) {
  const [state, setState] = useState('idle'); // idle | typing | loading | response | fallback
  const [text, setText] = useState('');
  const [response, setResponse] = useState(null);
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * FRASES_ONBOARDING.length)
  );
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

  // Cleanup al desmontar
  useEffect(() => () => abortRef.current?.abort(), []);

  const isShowingResponse = state === 'response' || state === 'fallback';

  // ─────────────────────────────── Render: response ───
  if (isShowingResponse) {
    return (
      <div className={styles.wrap}>
        <article className={styles.respCard} aria-live="polite">
          <p className={styles.respPara}>{response.comprension}</p>
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
        <button
          type="button"
          className={styles.cta}
          onClick={() => onSubmit(text.trim())}
        >
          Continuar
        </button>
      </div>
    );
  }

  // ─────────────────────────────── Render: loading ───
  if (state === 'loading') {
    return (
      <div className={styles.wrap}>
        <div
          className={styles.loadFrame}
          aria-live="polite"
          aria-busy="true"
        >
          <div className={styles.ring} aria-hidden="true" />
          <p key={phraseIndex} className={styles.phrase}>
            "{FRASES_ONBOARDING[phraseIndex]}"
          </p>
        </div>
        <button
          type="button"
          className={styles.cta}
          disabled
          aria-disabled="true"
        >
          <span className={styles.spin} aria-hidden="true" />
          Procesando
        </button>
      </div>
    );
  }

  // ─────────────────────────────── Render: idle/typing ───
  return (
    <div className={styles.wrap}>
      <textarea
        ref={textareaRef}
        className={`${styles.composer} ${state === 'typing' ? styles.composerFocus : ''}`}
        placeholder="Ej: Hoy mi hijo gritó porque no quería bañarse..."
        value={text}
        onChange={handleChange}
        rows={4}
        maxLength={MAX_TEXT_LENGTH}
        aria-label="Cuéntale a Huella algo que te haya pasado"
      />
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
      >
        Saltar este paso
      </button>
    </div>
  );
}
