import React from 'react';
import { estadoPlan, mesCortoDe } from '../helpers';
import styles from './EstrategiaPasadaCard.module.css';

export default function EstrategiaPasadaCard({
  plan,
  hijo,
  cicloNumero,
  onAbrir,
}) {
  const estado = estadoPlan(plan);
  const total = plan.total_semanas || 4;
  const completadas =
    estado === 'completado'
      ? total
      : Math.max(0, (plan.semana_actual || 1) - 1);
  // abandonado_at siempre es null en el shim; usamos completado_at
  // que se puebla para ambos estados cerrados.
  const fecha = mesCortoDe(plan.completado_at || plan.created_at);
  const inicial = (hijo?.nombre || '·').charAt(0).toUpperCase();
  const eyebrow = estado === 'completado' ? 'Completado' : 'Abandonado';

  return (
    <button
      type="button"
      className={`${styles.card} ${styles[estado]}`}
      onClick={onAbrir}
      aria-label={`${plan.habilidad_nombre} · ${eyebrow.toLowerCase()}`}
    >
      <div className={styles.topR}>
        <div className={styles.av}>{inicial}</div>
        <div className={styles.core}>
          <div className={styles.eyeState}>
            {eyebrow}{fecha ? ` · ${fecha}` : ''}
          </div>
          <div className={styles.nm}>
            {plan.habilidad_nombre}
            {cicloNumero && cicloNumero > 1 ? ` · Ciclo ${cicloNumero}` : ''}
          </div>
        </div>
        <span className={styles.chev} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </span>
      </div>

      <div className={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`${styles.d} ${i < completadas ? styles.dDone : ''}`}
          />
        ))}
      </div>
    </button>
  );
}
