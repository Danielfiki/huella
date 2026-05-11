import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { estadoPlan, mesCortoDe } from '../helpers';
import { canModify } from '../../../utils/authorDisplay';
import styles from './DrawerPasados.module.css';

export default function DrawerPasados({ planes, onEliminar }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.box}>
      <button className={styles.head} onClick={() => setOpen((v) => !v)}>
        <span className={styles.ttl}>Lo que ya trabajaste</span>
        <span className={styles.count}>{planes.length} {planes.length === 1 ? 'plan' : 'planes'}</span>
        <span className={`${styles.chev} ${open ? styles.chevOpen : ''}`}>▾</span>
      </button>
      {open && (
        <ul className={styles.list}>
          {planes.map((p) => {
            const estado = estadoPlan(p);
            return (
              <li key={p.id} className={styles.item}>
                <span className={`${styles.ic} ${estado === 'abandonado' ? styles.ab : ''}`}>
                  {estado === 'completado' ? '✓' : '✕'}
                </span>
                <span className={styles.nm}>
                  {p.habilidad_nombre || p.habilidad} · {estado === 'completado' ? `${p.total_semanas} sem` : `abandonado en sem ${p.semana_actual}`}
                </span>
                <span className={styles.meta}>{mesCortoDe(p.created_at)}</span>
                {onEliminar && canModify(p.userId, user?.id) && (
                  <button className={styles.del} onClick={() => onEliminar(p.id)} aria-label="Eliminar">✕</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
