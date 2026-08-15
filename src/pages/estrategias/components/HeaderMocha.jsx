// HeaderMocha.jsx — header compartido. Recibe título + opciones (stats, progreso, episodios-origen).
//
// B3 · se eliminó la tuerca de "Ajustes". Era código muerto: el botón solo se
// pintaba con `onAjustes` y ningún caller de este header lo pasaba nunca, así
// que no hacía nada en ninguna pantalla de Estrategias. Si algún día vuelve a
// hacer falta, tiene que llegar con destino, no como icono decorativo.
import React from 'react';
import styles from './HeaderMocha.module.css';

export default function HeaderMocha({ titulo, onBack, stats, clinical, progreso, episodiosOrigen, cicloNumero }) {
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
