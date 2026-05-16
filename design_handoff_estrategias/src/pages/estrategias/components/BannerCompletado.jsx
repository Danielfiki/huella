import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BannerCompletado.module.css';

export default function BannerCompletado({ plan, hijoNombre }) {
  const navigate = useNavigate();
  return (
    <div className={styles.banner}>
      <div className={styles.em}>🌿</div>
      <div className={styles.lab}>Plan completado</div>
      <div className={styles.ttl}>{plan.total_semanas} semanas trabajando {plan.habilidad_nombre.toLowerCase()} con {hijoNombre}.</div>
      <p className={styles.sub}>
        Anotaste {plan.episodios_durante || '—'} momentos durante el plan.
        Tu reflexión final ya quedó guardada en Hitos.
      </p>
      <div className={styles.acts}>
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => navigate('/logros')}>Ver tu hito</button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={() => navigate(`/estrategias/${plan.id}`)}>Releer reflexiones</button>
      </div>
    </div>
  );
}
