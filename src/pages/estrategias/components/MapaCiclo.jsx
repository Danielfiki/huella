import React from 'react';
import { mesCortoDe } from '../helpers';
import styles from './MapaCiclo.module.css';

export default function MapaCiclo({
  semanaActual,
  totalSemanas,
  ciclo = 1,
  estado,
  tituloActivo,
  completadoAt,
}) {
  const esActivo = estado === 'activo';
  const esCompletado = estado === 'completado';
  const esAbandonado = estado === 'abandonado';

  const rowClass = esActivo
    ? `${styles.row} ${styles.now}`
    : esCompletado
      ? `${styles.row} ${styles.done}`
      : `${styles.row} ${styles.aban}`;

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <span className={styles.eye}>Mapa del ciclo</span>
        <span
          className={
            esActivo
              ? `${styles.pos} ${styles.posNow}`
              : esCompletado
                ? `${styles.pos} ${styles.posDone}`
                : `${styles.pos} ${styles.posAban}`
          }
        >
          {esActivo && `Sem ${semanaActual} · en curso`}
          {esCompletado && `Cerrado · ${mesCortoDe(completadoAt) || ''}`}
          {esAbandonado && 'Plan cerrado antes'}
        </span>
      </header>

      <div className={rowClass}>
        <span className={styles.cicloLbl}>Ciclo {ciclo}</span>
        <div className={styles.dots}>
          {Array.from({ length: totalSemanas }).map((_, i) => {
            const n = i + 1;
            let cls = styles.d;
            if (esActivo) {
              if (n < semanaActual) cls += ` ${styles.dDone}`;
              else if (n === semanaActual) cls += ` ${styles.dNow}`;
            } else if (esCompletado) {
              cls += ` ${styles.dDone}`;
            } else if (esAbandonado) {
              if (n <= semanaActual) cls += ` ${styles.dDone}`;
            }
            return <span key={n} className={cls} />;
          })}
        </div>
        <span className={styles.counter}>
          {esActivo ? `${semanaActual - 1}/${totalSemanas}` : `${totalSemanas}/${totalSemanas}`}
        </span>
      </div>

      {esActivo && tituloActivo && (
        <p className={styles.nowLine}>
          Vas en <strong>{tituloActivo}</strong>. Toca una semana abajo para releerla.
        </p>
      )}
    </article>
  );
}
