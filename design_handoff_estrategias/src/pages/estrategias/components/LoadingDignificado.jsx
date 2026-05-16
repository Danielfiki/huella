import React from 'react';
import styles from './LoadingDignificado.module.css';

export default function LoadingDignificado({ titulo, sub, pasos, pasoActual }) {
  return (
    <div className={styles.card}>
      <div className={styles.pulse}>h</div>
      <div className={styles.ttl}>{titulo}</div>
      <p className={styles.sub}>{sub}</p>
      <ol className={styles.steps}>
        {pasos.map((txt, i) => {
          const cls = i < pasoActual ? styles.done : i === pasoActual ? styles.now : styles.next;
          return (
            <li key={i} className={cls}>
              <span className={styles.ic}>{i < pasoActual ? '✓' : i === pasoActual ? '·' : '·'}</span>
              <span className={styles.copy}>{txt}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
