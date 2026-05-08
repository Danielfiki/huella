import React from 'react';
import styles from './EmptyPuerta1.module.css';

export default function EmptyPuerta1({ totalEpisodios, postRechazo }) {
  if (postRechazo) {
    return (
      <div className={styles.empty}>
        <div className={styles.em}>🌱</div>
        <div className={styles.ttl}>Sin sugerencias activas por ahora.</div>
        <p className={styles.sub}>
          Volveremos a proponerte algo cuando aparezca un patrón nuevo o registres más episodios.
        </p>
      </div>
    );
  }
  const conData = totalEpisodios > 0;
  return (
    <div className={styles.empty}>
      <div className={styles.em}>🌱</div>
      <div className={styles.ttl}>Cuando registres más vida, Huella encontrará patrones para sugerirte.</div>
      <p className={styles.sub}>
        {conData
          ? `Llevas ${totalEpisodios} ${totalEpisodios === 1 ? 'momento' : 'momentos'}. Con unos pocos más empezamos a ver tendencias.`
          : 'Empieza registrando un momento cualquiera — bueno, regular o difícil. Con un puñado, ya empezamos a ver tendencias.'
        }
      </p>
    </div>
  );
}
