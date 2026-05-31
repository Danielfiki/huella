// HeaderMocha.jsx — header compartido. Recibe título + opciones (stats, progreso, episodios-origen).
import React from 'react';
import styles from './HeaderMocha.module.css';

export default function HeaderMocha({ titulo, onBack, onAjustes, stats, clinical, progreso, episodiosOrigen, cicloNumero }) {
  return (
    <header className={styles.top}>
      {cicloNumero > 1 && (
        <div className={styles.cicloEyebrow}>
          Ciclo {cicloNumero} · Adaptado a lo que aprendiste
        </div>
      )}
      <div className={styles.row}>
        {onBack && (
          <button className={styles.iconBtn} onClick={onBack} aria-label="Atrás">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
        <h1 className={styles.h1}>{titulo}</h1>
        {!onBack && onAjustes && (
          <button className={styles.iconBtn} onClick={onAjustes} aria-label="Ajustes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}><span className={styles.num}>{stats.habilidades}</span><span className={styles.lbl}>Habilidades</span></div>
          <div className={styles.stat}><span className={styles.num}>{stats.semanas}</span><span className={styles.lbl}>Sem totales</span></div>
        </div>
      )}
      {clinical && <div className={styles.clinical}>{clinical}</div>}
      {progreso && (
        <div className={styles.progStrip}>
          <div className={styles.bar}>
            {Array.from({ length: progreso.total }).map((_, i) => {
              const n = i + 1;
              let cls = '';
              if (progreso.variante === 'completado') {
                cls = styles.doneOk;
              } else if (progreso.variante === 'abandonado') {
                cls = n <= progreso.actual ? styles.doneMuted : '';
              } else {
                cls = n < progreso.actual ? styles.done : n === progreso.actual ? styles.now : '';
              }
              return <i key={i} className={cls} />;
            })}
          </div>
          <span className={styles.barLbl}>
            {progreso.label || `Sem ${progreso.actual}/${progreso.total}`}
          </span>
        </div>
      )}
      {episodiosOrigen && episodiosOrigen.length > 0 && (
        <div className={styles.origin}>
          <span className={styles.originLbl}>Nace de</span>
          {episodiosOrigen.slice(0, 3).map((e) => (
            <span key={e.id} className={styles.ep}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>{e.emoji || '·'}</span>
              {e.titulo}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
