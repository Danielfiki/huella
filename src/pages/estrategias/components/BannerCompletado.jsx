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
        <button className={`${styles.btn} ${styles.primary}`} onClick={() => navigate(`/estrategias/${plan.id}/cierre/${plan.numero_ciclo_actual}`)}>Ver cierre completo</button>
        <button className={`${styles.btn} ${styles.ghost}`} onClick={() => navigate('/perfil?highlight=plan_completo')}>Ver tu medalla</button>
      </div>
    </div>
  );
}
