// OnboardingComposer.jsx
// Corazón del onboarding · slide 3.
// Maneja la máquina de estados local: idle → typing → loading → response | fallback.
//
// La llamada a la API se hace en `requestPrimerEncuentro()` (importada de ../../services/anthropic).
// Si falla por cualquier motivo (sin conexión, timeout de 15s, 429 de límite
// diario, 5xx, parse error), cae al `fallbackResponse(nombre)` de
// frases-onboarding.js. El usuario NUNCA ve un mensaje técnico de error — es su
// primer encuentro con el producto.
//
// Path: src/pages/onboarding/OnboardingComposer.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './OnboardingComposer.module.css';
import { FRASES_ONBOARDING, fallbackResponse } from './frases-onboarding';
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
// Carga simulada del modo ensayo. No imita el tiempo real de la API: solo dura
// lo suficiente para que la pantalla de carga se alcance a ver en el QA.
const ENSAYO_DELAY_MS = 1200;

// El marco viaja en minusculas en el JSON; la firma lo muestra capitalizado,
// como hace la Accion Rapida con la lente.
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Props
 *   active        bool       · true cuando el acto está visible
 *   hijo          object     · { nombre, edad, genero } del acto A. Viaja al
 *                              prompt para que la respuesta hable de ESTE hijo
 *                              por su nombre y con el marco de su edad. Antes
 *                              el primer encuentro era ciego a proposito.
 *   ensayo        bool       · modo ensayo: NO se llama a Anthropic. Se pinta
 *                              el fallback local, que es contenido real de la
 *                              app. Sirve para el QA visual y evita tanto el
 *                              gasto de la llamada como la fila que el backend
 *                              escribe en `api_llamadas` (api/anthropic.js).
 *   ensayoIA      bool       · variante ?onboarding=1&ia=1. Ensayo igual de
 *                              seco para la base de la cuenta, pero el acto B
 *                              SI llama a Anthropic con el hijo del acto A,
 *                              para poder revisar la respuesta real. La unica
 *                              escritura que reaparece es la fila de
 *                              `api_llamadas`, que es solo el contador.
 *   submitting    bool       · el cierre del onboarding está guardando
 *   saveError     bool       · el guardado falló; se puede reintentar
 *   onSubmit      (texto: string | null) => void
 *                              · cierra el onboarding con el texto escrito
 *   onSkipInline  () => void  · "Saltar este paso" — cierra sin texto
 */
export default function OnboardingComposer({
  active,
  hijo = null,
  ensayo = false,
  ensayoIA = false,
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
  // Timer de la carga simulada del ensayo. Se limpia al desmontar.
  const ensayoTimerRef = useRef(null);

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

    // Modo ensayo: cero red. Dejamos correr el estado 'loading' un momento
    // para que el QA alcance a ver la pantalla de carga (anillo, frases y
    // barra de progreso son parte de lo que hay que revisar) y despues
    // pintamos el fallback local por el mismo camino que el fallback real.
    //
    // Con `ensayoIA` (?onboarding=1&ia=1) este atajo NO aplica: seguimos de
    // largo al camino real de abajo, que llama a Anthropic con el hijo del
    // acto A. Todo lo demas del ensayo sigue igual — el Layout es el que corta
    // las escrituras, y eso no depende de esta rama.
    if (ensayo && !ensayoIA) {
      const id = setTimeout(() => {
        setResponse(fallbackResponse(hijo?.nombre));
        setState('fallback');
      }, ENSAYO_DELAY_MS);
      ensayoTimerRef.current = id;
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const resp = await requestPrimerEncuentro(text.trim(), {
        hijo,
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
      setResponse(fallbackResponse(hijo?.nombre));
      setState('fallback');
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
    }
  }, [canSubmit, text, ensayo, ensayoIA, hijo]);

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

  // Cleanup al desmontar. El timer del ensayo se limpia igual que el abort:
  // si se sale del flujo a mitad de la carga simulada, no queda un setState
  // pendiente sobre un componente desmontado.
  useEffect(() => () => {
    abortRef.current?.abort();
    if (ensayoTimerRef.current) clearTimeout(ensayoTimerRef.current);
  }, []);

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
          {/* SIN COMILLAS, a proposito. Lo que viene del banco AUTORES son
              articulaciones del enfoque de cada autor escritas en la voz de
              Huella, no citas textuales suyas. Entrecomillarlas y firmarlas
              con su nombre convertia una parafrasis en una cita falsa
              atribuida a una persona real. Se firma como en la Accion Rapida:
              "Autor · Lente", que dice de donde viene la idea sin afirmar que
              son sus palabras exactas. */}
          {response.cita && (
            <div className={styles.idea}>
              <p className={styles.ideaTexto}>{response.cita}</p>
              {response.autor && (
                <p className={styles.firma}>
                  — <span className={styles.firmaAutor}>{response.autor}</span>
                  {response.marco && (
                    <>
                      <span className={styles.firmaSep}> · </span>
                      <span className={styles.firmaLente}>{capitalizar(response.marco)}</span>
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </article>
        <p className={styles.promesa}>
          En Huella vas a entender por qué pasa cada episodio, y qué hacer con eso.
        </p>
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
