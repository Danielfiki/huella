import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FRASES } from '../../../lib/frases';
import styles from './ModalPuenteCiclo.module.css';

// ModalPuenteCiclo (P4) — puente Ciclo 1 → Ciclo 2.
// Diseño "Hilo como columna": el spine vertical de P1 Lista se vuelve
// la arquitectura del modal. 4 bloques cuelgan de nodos del spine.
//
// NOTA DE ARQUITECTURA (B·2): el spec original pedía filtrar frases por
// el autor que devuelve marcoEdad(edad). En el código real `marcoEdad`
// no está exportado y NO devuelve autores — devuelve un bloque-prompt
// científico para la IA. La adaptación correcta es usar FRASES.estrategia
// de src/lib/frases.js, cuyo contexto declarado es exactamente
// "crear estrategia, avanzar semanas, cambio de conducta" — el momento
// puente. Si el set estuviera vacío, el bloque se omite (null), como
// pedía el spec.

function elegirFrase() {
  const pool = Array.isArray(FRASES?.estrategia) ? FRASES.estrategia : [];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

const plural = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

function copyReflejo({ semanas, episodiosDurante, habilidad, diasDesdeUltimo }) {
  const enSemanas = `En ${semanas === 1 ? 'esta' : 'estas'} ${plural(semanas, 'semana', 'semanas')}`;
  if (episodiosDurante > 0 && diasDesdeUltimo !== null && diasDesdeUltimo !== undefined) {
    const ultimo = diasDesdeUltimo === 0
      ? 'El último fue hoy.'
      : `El último fue hace ${plural(diasDesdeUltimo, 'día', 'días')}.`;
    return `${enSemanas} registraste ${plural(episodiosDurante, 'episodio', 'episodios')} de ${habilidad}. ${ultimo}`;
  }
  if (episodiosDurante > 0) {
    return `${enSemanas} registraste ${plural(episodiosDurante, 'episodio', 'episodios')} de ${habilidad}.`;
  }
  return `${enSemanas} trabajaste ${habilidad}.`;
}

export default function ModalPuenteCiclo({
  planActivo,
  semanas = 3,
  habilidad,
  episodiosDurante = 0,
  diasDesdeUltimo = null,
  edadHijo,
  hijoNombre = '',
  cargando = false,
  onConfirmar,
  onPosponer,
}) {
  const [accion, setAccion] = useState('idle'); // 'idle' | 'confirmando' | 'posponiendo'
  const [errMsg, setErrMsg] = useState('');
  const overlayRef = useRef(null);
  const primaryRef = useRef(null);
  const previaFocusRef = useRef(null);
  const touchStartY = useRef(null);

  const ocupado = accion !== 'idle';

  // La frase se elige una sola vez por montaje (no reroll en cada render).
  const frase = useMemo(() => elegirFrase(), []);

  const reflejo = copyReflejo({ semanas, episodiosDurante, habilidad, diasDesdeUltimo });
  const duracionCiclo2 = planActivo?.total_semanas || 4;

  const cerrarPosponiendo = async () => {
    if (ocupado) return;
    setAccion('posponiendo');
    setErrMsg('');
    try {
      await onPosponer?.();
    } catch {
      setAccion('idle');
      setErrMsg('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
    }
  };

  const confirmar = async () => {
    if (ocupado) return;
    setAccion('confirmando');
    setErrMsg('');
    try {
      await onConfirmar?.();
    } catch {
      setAccion('idle');
      setErrMsg('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
    }
  };

  // Foco inicial al CTA primario + restaurar foco al cerrar.
  useEffect(() => {
    previaFocusRef.current = document.activeElement;
    const t = setTimeout(() => primaryRef.current?.focus(), 60);
    return () => {
      clearTimeout(t);
      if (previaFocusRef.current && previaFocusRef.current.focus) {
        previaFocusRef.current.focus();
      }
    };
  }, []);

  // ESC → posponer. Focus trap dentro del overlay.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarPosponiendo();
        return;
      }
      if (e.key !== 'Tab') return;
      const cont = overlayRef.current;
      if (!cont) return;
      const focusables = cont.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // Swipe down (mobile) → posponer, con umbral.
  const onTouchStart = (e) => { touchStartY.current = e.touches[0]?.clientY ?? null; };
  const onTouchEnd = (e) => {
    if (touchStartY.current == null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    touchStartY.current = null;
    if (dy > 90) cerrarPosponiendo();
  };

  const headingId = 'p4-heading';

  const Skeleton = ({ w }) => (
    <span className={styles.skel} style={{ width: w }} aria-hidden="true" />
  );

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.sheet}>
        <button
          type="button"
          className={styles.close}
          onClick={cerrarPosponiendo}
          disabled={ocupado}
          aria-label="Cerrar y tomarme un tiempo"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div className={styles.thread}>
          <span className={styles.spine} aria-hidden="true" />

          {/* B·0 Contexto */}
          <section className={styles.station}>
            <span className={styles.node} aria-hidden="true" />
            <div className={styles.block}>
              <p className={styles.eyebrow}>
                {hijoNombre || 'Tu hijo'}{edadHijo ? ` · ${edadHijo} años` : ''}
              </p>
              <h2 id={headingId} className={styles.heading}>
                Comienza tu Ciclo 2
              </h2>
            </div>
          </section>

          {/* B·1 Reflejo */}
          <section className={styles.station}>
            <span className={styles.node} aria-hidden="true" />
            <div className={styles.block}>
              {cargando ? (
                <>
                  <Skeleton w="100%" />
                  <Skeleton w="70%" />
                </>
              ) : (
                <p className={styles.body}>{reflejo}</p>
              )}
            </div>
          </section>

          {/* B·2 Cita del marco — se omite silenciosamente si no hay frase */}
          {!cargando && frase && (
            <section className={styles.station}>
              <span className={styles.node} aria-hidden="true" />
              <div className={styles.block}>
                <figure className={styles.fraseWrap}>
                  <blockquote className={styles.fraseTexto}>{frase.texto}</blockquote>
                  <figcaption className={styles.fraseAutor}>{frase.autor}</figcaption>
                </figure>
              </div>
            </section>
          )}

          {/* B·3 Puente */}
          <section className={styles.station}>
            <span className={styles.node} aria-hidden="true" />
            <div className={styles.block}>
              {cargando ? (
                <>
                  <Skeleton w="90%" />
                  <Skeleton w="60%" />
                </>
              ) : (
                <p className={styles.body}>
                  Lo que sigue ahora es profundizar en {habilidad}.
                  <br />
                  El Ciclo 2 son {duracionCiclo2} semanas que se construyen sobre lo que ya trabajaron.
                </p>
              )}
            </div>
          </section>

          {/* B·4 CTAs */}
          <section className={`${styles.station} ${styles.stationCta}`}>
            <span className={styles.node} aria-hidden="true" />
            <div className={styles.block}>
              {errMsg && <p className={styles.err} role="alert">{errMsg}</p>}
              <button
                ref={primaryRef}
                type="button"
                className={styles.ctaPrimary}
                onClick={confirmar}
                disabled={ocupado || cargando}
              >
                {accion === 'confirmando' ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Guardando…
                  </>
                ) : (
                  'Vamos al Ciclo 2'
                )}
              </button>
              <button
                type="button"
                className={styles.ctaGhost}
                onClick={cerrarPosponiendo}
                disabled={ocupado}
              >
                {accion === 'posponiendo' ? 'Guardando…' : 'Lo veo después'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
