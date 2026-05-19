// PuertaUnoLoading.jsx
// Estado "generando" de Puerta 1 · Concepto C.
// LoadingDignificado RECORTADO: solo pulse + título + sub + barra indeterminada.
// NO importa al componente original LoadingDignificado (queda intacto, usado en el
// flujo de creación de plan). Es una versión propia y compacta del bloque P1.
//
// Path: src/components/estrategias/puerta1/PuertaUnoLoading.jsx

import React from 'react';
import styles from './PuertaUnoLoading.module.css';

/**
 * Props
 *   onIrPuerta2   () => void
 */
export default function PuertaUnoLoading({ onIrPuerta2 }) {
  return (
    <article className={styles.card} aria-busy="true" aria-live="polite">
      <div className={styles.topRow}>
        <span className={styles.pulse} aria-hidden="true">h</span>
        <div className={styles.stack}>
          <h3 className={styles.ttl}>Huella está mirando tus últimos momentos.</h3>
          <p className={styles.sub}>Buscando un hilo común. Toma unos segundos.</p>
        </div>
      </div>
      <div className={styles.indet} role="progressbar" aria-label="Procesando" />
      <div className={styles.foot}>
        <span className={styles.badge}>En segundo plano</span>
        <button type="button" className={styles.p2} onClick={onIrPuerta2}>
          ¿Prefieres elegir tú? →
        </button>
      </div>
    </article>
  );
}
