import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import { md } from '../helpers';
import styles from './SemanaActiva.module.css';

export default function SemanaActiva({ semana, numero, total, reflexion, onReflexionChange, onAvanzar, onToggleTarea, onGenerarTareas, generandoTareas, avanzando, errMsg }) {
  const [tareas, setTareas] = useState(Array.isArray(semana.tareas) ? semana.tareas : []);
  const [cerrarModal, setCerrarModal] = useState(false);

  const sinTareas = !Array.isArray(tareas) || tareas.length === 0;
  const completas = tareas.filter((t) => t.completada).length;
  const puedeAvanzar = !sinTareas && completas >= 2;
  const esUltima = numero === total;

  const toggleTarea = (id) => {
    setTareas((prev) => prev.map((t) => t.id === id ? { ...t, completada: !t.completada } : t));
    onToggleTarea?.(id);
  };

  const handleAvanzarClick = () => {
    if (esUltima) {
      setCerrarModal(true);
    } else {
      onAvanzar?.();
    }
  };

  const handleConfirmarCierre = () => {
    setCerrarModal(false);
    onAvanzar?.();
  };

  return (
    <>
      <article className={styles.card}>
        <header className={styles.head}>
          <div className={styles.eye}>Esta semana · activa</div>
          <h3 className={styles.ttl}>{semana.titulo}</h3>
          <p className={styles.sub} dangerouslySetInnerHTML={{ __html: md(semana.descripcion) }} />
        </header>
        <div className={styles.tasks}>
          {sinTareas ? (
            <button
              className={styles.task}
              onClick={() => onGenerarTareas?.()}
              disabled={generandoTareas}
            >
              <span className={styles.copy}>
                {generandoTareas ? 'Generando tareas…' : 'Generar tareas de esta semana'}
              </span>
            </button>
          ) : tareas.map((t) => (
            <button
              key={t.id}
              className={`${styles.task} ${t.completada ? styles.done : ''}`}
              onClick={() => toggleTarea(t.id)}
            >
              <span className={styles.chk} />
              <span className={styles.copy}>{t.texto}</span>
            </button>
          ))}
        </div>
        <div className={styles.checkin}>
          <div className={styles.lbl}>Check-in semanal</div>
          <div className={styles.ask}>¿Qué viste cambiar esta semana?</div>
          <textarea
            placeholder="Una o dos frases. Lo que viste, no lo que esperabas ver."
            value={reflexion}
            onChange={(e) => onReflexionChange(e.target.value)}
          />
          {errMsg && <p className={styles.errMsg}>{errMsg}</p>}
          <Button
            disabled={!puedeAvanzar || reflexion.trim().length < 5 || avanzando}
            onClick={handleAvanzarClick}
            className={styles.advBtn}
          >
            {avanzando ? 'Guardando…' : esUltima ? 'Cerrar el plan ✓' : `Avanzar a Semana ${numero + 1} →`}
          </Button>
        </div>
      </article>

      {cerrarModal && (
        <div className={styles.modalOverlay} onClick={() => setCerrarModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTtl}>¿Listo para cerrar el plan?</p>
            <p className={styles.modalSub}>Tu reflexión y progreso quedarán guardados. Esta acción no se puede deshacer.</p>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setCerrarModal(false)}>Cancelar</button>
              <button className={styles.modalConfirm} onClick={handleConfirmarCierre} disabled={avanzando}>
                {avanzando ? 'Guardando…' : 'Cerrar plan →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
