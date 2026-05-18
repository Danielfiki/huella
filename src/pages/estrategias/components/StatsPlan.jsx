import React from 'react';
import styles from './StatsPlan.module.css';

export default function StatsPlan({ plan, semanas = [], estado, episodiosDurante = null }) {
  const total = plan.total_semanas || semanas.length || 4;
  const actual = plan.semana_actual || 1;
  const cerradas = estado === 'activo' ? Math.max(0, actual - 1) : total;
  const momentos = episodiosDurante ?? plan.episodios_durante ?? null;
  const reflexiones = semanas.filter((s) => (s?.reflexion || '').trim().length > 0).length;
  const showAsCheckins = estado !== 'activo';

  return (
    <div className={styles.stats}>
      <Stat num={`${cerradas}`} lbl={cerradas === 1 ? 'Sem cerrada' : 'Semanas'} />
      <Stat num={momentos === null ? '—' : `${momentos}`} lbl="Momentos" />
      <Stat
        num={showAsCheckins ? `${reflexiones}/${total}` : `${reflexiones}`}
        lbl={showAsCheckins ? 'Check-ins' : (reflexiones === 1 ? 'Reflexión' : 'Reflexiones')}
      />
    </div>
  );
}

function Stat({ num, lbl }) {
  return (
    <div className={styles.stat}>
      <div className={styles.num}>{num}</div>
      <div className={styles.lbl}>{lbl}</div>
    </div>
  );
}
