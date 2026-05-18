import React from 'react';
import styles from './SemanaFutura.module.css';

export default function SemanaFutura({ numero, titulo, esUltima = false }) {
  return (
    <article className={styles.chip} aria-disabled="true">
      <span className={styles.mark}>{numero}</span>
      <span className={styles.nm}>{titulo}</span>
      <span className={styles.pip}>{esUltima ? 'Bloq.' : 'Próxima'}</span>
    </article>
  );
}
