import React from 'react';
import styles from './SugerenciaIACard.module.css';

export default function SugerenciaIACard({ sugerencia, onAceptar, onCerrar }) {
  const { narrativa, episodios_detonantes } = sugerencia;
  const primer = episodios_detonantes[0];
  const extras = Math.max(0, episodios_detonantes.length - 1);
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.h}>h</span>
        <span className={styles.lab}>Sugerencia de Huella</span>
      </div>
      <div className={styles.ttl}>{narrativa.titulo}</div>
      <p className={styles.bajada}>{narrativa.bajada}</p>
      {primer && (
        <div className={styles.epPreview}>
          <span className={styles.emo}>{primer.emoji || '·'}</span>
          <div className={styles.copy}>
            <div className={styles.epTtl}>{primer.titulo}</div>
            <div className={styles.epMeta}>{primer.fecha_label} · {primer.intensidad}/5</div>
          </div>
          {extras > 0 && <div className={styles.extras}>+{extras}<br/>más</div>}
        </div>
      )}
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.primary}`} onClick={onAceptar}>Empezar este plan</button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={onCerrar} aria-label="No por ahora">✕</button>
      </div>
    </article>
  );
}
