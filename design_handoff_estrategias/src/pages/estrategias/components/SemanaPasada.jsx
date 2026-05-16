import React, { useState } from 'react';
import styles from './SemanaPasada.module.css';

export default function SemanaPasada({ numero, semana }) {
  const [open, setOpen] = useState(false);
  const reflexion = semana.reflexion?.trim() || 'Sin reflexión escrita.';
  return (
    <article className={`${styles.chip} ${open ? styles.open : ''}`}>
      <button className={styles.row} onClick={() => setOpen((v) => !v)}>
        <span className={styles.num}>✓</span>
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
