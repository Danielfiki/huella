import React from 'react';
import { pillClassFor } from '../helpers';
import styles from './EstrategiaActivaCard.module.css';

export default function EstrategiaActivaCard({ plan, hijo, onAbrir }) {
  const total = plan.total_semanas || 4;
  const actual = plan.semana_actual || 1;
  const inicial = (hijo?.nombre || '·')[0].toUpperCase();
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.row1}>
          <div className={styles.child}>{inicial}</div>
          <div className={styles.ttls}>
            <div className={styles.eye}>{hijo?.nombre} · {hijo?.edad} años</div>
            <div className={styles.ttl}>{plan.habilidad_nombre || plan.habilidad}</div>
            <div className={styles.week}>Semana {actual} de {total}</div>
          </div>
        </div>
        <div className={styles.progRow}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`${styles.seg} ${i + 1 < actual ? styles.done : i + 1 === actual ? styles.now : ''}`} />
          ))}
        </div>
      </div>
      {(plan.episodios_detonantes || []).length > 0 && (
        <div className={styles.origRow}>
          <span className={styles.origLbl}>Nace de</span>
          {plan.episodios_detonantes.slice(0, 3).map((e) => (
            <span key={e.id} className={`${styles.ep} ${styles[pillClassFor(e.categoria)]}`}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>{e.emoji || '·'}</span>
              {e.titulo}
            </span>
          ))}
        </div>
      )}
      <button className={styles.cta} onClick={onAbrir}>
        Ver tu semana {actual}
        <span className={styles.arr}>→</span>
      </button>
    </article>
  );
}
