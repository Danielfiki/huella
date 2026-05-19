// PuertaUnoEmpty.jsx
// Estado "sin sugerencia" de Puerta 1 · Concepto C.
// Tono observacional. Reemplaza al antiguo EmptyPuerta1 (que se elimina).
//
// Path: src/components/estrategias/puerta1/PuertaUnoEmpty.jsx

import React from 'react';
import styles from './PuertaUnoEmpty.module.css';

/**
 * Props
 *   totalEpisodios   number    cantidad de momentos del hijo activo (ya filtrados)
 *   onIrPuerta2      () => void
 */
export default function PuertaUnoEmpty({ totalEpisodios = 0, onIrPuerta2 }) {
  const meta =
    totalEpisodios > 0
      ? `${totalEpisodios} ${totalEpisodios === 1 ? 'momento registrado' : 'momentos esta semana'}`
      : 'Empieza registrando un momento cualquiera';

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.topRow}>
          <span className={styles.dot} aria-hidden="true">h</span>
          <span className={styles.lab}>Huella · observando</span>
        </div>
        <h3 className={styles.ttl}>
          Huella está mirando. Todavía no se asoma un patrón claro.
        </h3>
        <p className={styles.baj}>
          Cuando vea un hilo común, lo armo acá con la evidencia.
        </p>
      </div>

      <div className={styles.meta}>
        <span>{meta}</span>
        <button type="button" className={styles.p2} onClick={onIrPuerta2}>
          ¿Prefieres elegir tú? →
        </button>
      </div>
    </article>
  );
}
