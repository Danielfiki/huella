import React, { useState } from 'react';
import { HABILIDADES_CATALOGO } from '../helpers';
import styles from './SelectorHabilidades.module.css';

export default function SelectorHabilidades({ seleccionada, onElegir }) {
  const [otra, setOtra] = useState(false);
  const [otraTexto, setOtraTexto] = useState('');
  const grupos = Object.entries(HABILIDADES_CATALOGO);

  return (
    <div className={styles.box}>
      <header className={styles.head}>
        <span className={styles.headTtl}>Elige una habilidad</span>
      </header>
      {grupos.map(([key, grupo]) => (
        <div key={key} className={styles.group}>
          <div className={styles.grpName}>{grupo.nombre}</div>
          <div className={styles.skills}>
            {grupo.items.map((it) => {
              const on = seleccionada === it.id;
              return (
                <button
                  key={it.id}
                  className={`${styles.skill} ${on ? styles.on : ''}`}
                  onClick={() => onElegir({ ...it, grupo: key, grupoNombre: grupo.nombre })}
                >
                  <span className={styles.e}>{it.emoji}</span>
                  {it.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!otra ? (
        <button className={styles.other} onClick={() => setOtra(true)}>+ Otra situación · escríbelo en tus palabras</button>
      ) : (
        <div className={styles.otraBox}>
          <textarea
            placeholder="Describí la situación en tus palabras…"
            value={otraTexto}
            onChange={(e) => setOtraTexto(e.target.value)}
          />
          <button
            disabled={otraTexto.trim().length < 10}
            onClick={() => onElegir({ id: 'otra', label: otraTexto.trim(), grupo: 'otra', grupoNombre: 'Otra' })}
          >
            Usar este texto
          </button>
        </div>
      )}
    </div>
  );
}
