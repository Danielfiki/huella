import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './BannerCompletado.module.css';

export default function BannerCompletado({ plan, hijoNombre, episodiosDurante }) {
  const navigate = useNavigate();
  const momentosTxt = episodiosDurante != null
    ? `${episodiosDurante} ${episodiosDurante === 1 ? 'momento' : 'momentos'}`
    : 'varios momentos';
  return (
    <div className={styles.banner}>
      <div className={styles.em}>🌿</div>
      <div className={styles.lab}>Plan completado</div>
      <div className={styles.ttl}>{plan.total_semanas} semanas trabajando {(plan.habilidad_nombre || plan.habilidad || '').toLowerCase()} con {hijoNombre}.</div>
      <p className={styles.sub}>
        Anotaste {momentosTxt} durante el plan.
        Tu reflexión quedó guardada en el álbum de logros.
      </p>
      <div className={styles.acts}>
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => navigate('/hitos?highlight=plan_completo')}>Ver tu hito</button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={() => navigate(`/estrategias/${plan.id}`)}>Releer reflexiones</button>
      </div>
    </div>
  );
}
