import React, { useState } from 'react';
import styles from './SemanaPasada.module.css';

export default function SemanaPasada({
  numero,
  semana,
  esCierre = false,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tareas = semana.tareas || [];
  const reflexion = (semana.reflexion || '').trim();
  const titulo = semana.titulo || semana.nombre || `Semana ${numero}`;
  const eyebrow = esCierre ? `Sem ${numero} · cierre` : `Sem ${numero} · completada`;

  return (
    <article className={`${styles.card} ${open ? styles.open : ''}`}>
      <button
        type="button"
        className={styles.row}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.mark}>✓</span>
        <span className={styles.meta}>
          <span className={styles.pip}>{eyebrow}</span>
          <span className={styles.nm}>{titulo}</span>
        </span>
        <span className={styles.chev} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </span>
      </button>

      {open && (
        <div className={styles.detail}>
          {tareas.length > 0 && (
            <div className={styles.miniTasks}>
              {tareas.map((t) => (
                <div key={t.id} className={styles.miniTask}>
                  <span className={styles.miniMark}>{t.completada ? '✓' : '·'}</span>
                  <span>{t.texto}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.reflex}>
            <div className={styles.reflexLbl}>Tu reflexión</div>
            <div className={styles.reflexText}>
              {reflexion || <em className={styles.reflexEmpty}>Sin reflexión escrita.</em>}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
