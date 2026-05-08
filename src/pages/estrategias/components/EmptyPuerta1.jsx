import React from 'react';
import styles from './EmptyPuerta1.module.css';

export default function EmptyPuerta1({ totalEpisodios }) {
  const conData = totalEpisodios > 0;
  return (
    <div className={styles.empty}>
      <div className={styles.em}>🌱</div>
      <div className={styles.ttl}>Cuando registres más vida, Huella encontrará patrones para sugerirte.</div>
      <p className={styles.sub}>
        {conData
          ? `Llevas ${totalEpisodios} ${totalEpisodios === 1 ? 'momento' : 'momentos'}. Con unos pocos más empezamos a ver tendencias.`
          : 'Empezá registrando un momento cualquiera — bueno, regular o difícil. Con un puñado, ya empezamos a ver tendencias.'
        }
      </p>
    </div>
  );
}
