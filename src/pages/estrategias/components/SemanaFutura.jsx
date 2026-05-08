import React from 'react';
import styles from './SemanaFutura.module.css';

export default function SemanaFutura({ numero, titulo }) {
  return (
    <article className={styles.chip}>
      <span className={styles.num}>{numero}</span>
      <span className={styles.nm}>{titulo}</span>
      <span className={styles.lock}>🔒</span>
    </article>
  );
}
