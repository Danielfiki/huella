import React, { useState } from 'react';
import styles from './SemanaPasada.module.css';

// marca: 'hecha' (default, ✓ neutro legacy) | 'ok' (✓ verde, plan
// completado) | 'no-hecha' (círculo vacío, semana nunca trabajada
// en un plan abandonado).
export default function SemanaPasada({ numero, semana, marca = 'hecha' }) {
  const [open, setOpen] = useState(false);
  const reflexion = semana.reflexion?.trim() || 'Sin reflexión escrita.';
  const numClass =
    marca === 'ok' ? `${styles.num} ${styles.numOk}`
    : marca === 'no-hecha' ? `${styles.num} ${styles.numEmpty}`
    : styles.num;
  return (
    <article className={`${styles.chip} ${open ? styles.open : ''}`}>
      <button className={styles.row} onClick={() => setOpen((v) => !v)}>
        <span className={numClass}>{marca === 'no-hecha' ? '' : '✓'}</span>
        <span className={styles.meta}>
          <span className={styles.nm}>Sem {numero} · {semana.titulo}</span>
          {!open && <span className={styles.reflex}>{reflexion}</span>}
        </span>
        <span className={styles.ic}>{open ? '▴' : '▸'}</span>
      </button>
      {open && (
        <div className={styles.detail}>
          <div className={styles.detLab}>Tu reflexión</div>
          <p className={styles.detText}>{reflexion}</p>
        </div>
      )}
    </article>
  );
}
