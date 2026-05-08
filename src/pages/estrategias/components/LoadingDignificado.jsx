import React, { useState } from 'react';
import { fraseCarga } from '../../../lib/frases';
import styles from './LoadingDignificado.module.css';

export default function LoadingDignificado({ titulo, sub, pasos, pasoActual, habilidadId, hijoEdad }) {
  // Inicializar 4 frases al montar — fijas durante toda la carga
  const [frases] = useState(() =>
    [0, 1, 2, 3].map((fase) => fraseCarga(fase, habilidadId, hijoEdad))
  );

  const frase = frases[pasoActual] ?? frases[0];

  return (
    <div className={styles.card}>
      <div className={styles.pulse}>h</div>
      <div className={styles.ttl}>{titulo}</div>
      <p className={styles.sub}>{sub}</p>
      {frase && (
        <div className={styles.fraseWrap} key={pasoActual}>
          <p className={styles.fraseTexto}>"{frase.texto}"</p>
          <span className={styles.fraseAutor}>— {frase.autor}</span>
        </div>
      )}
      <ol className={styles.steps}>
        {pasos.map((txt, i) => {
          const cls = i < pasoActual ? styles.done : i === pasoActual ? styles.now : styles.next;
          return (
            <li key={i} className={cls}>
              <span className={styles.ic}>{i < pasoActual ? '✓' : '·'}</span>
              <span className={styles.copy}>{txt}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
