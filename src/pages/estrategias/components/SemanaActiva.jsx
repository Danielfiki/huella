import React from 'react';
import Button from '../../../components/ui/Button';
import { md } from '../helpers';
import styles from './SemanaActiva.module.css';

export default function SemanaActiva({
  semana,
  numero,
  total,
  reflexion,
  onReflexionChange,
  onAvanzar,
  onToggleTarea,
  onGenerarTareas,
  generandoTareas,
  avanzando,
  errMsg,
}) {
  const tareas = semana.tareas || [];
  const sinTareas = !Array.isArray(tareas) || tareas.length === 0;
  const completas = tareas.filter((t) => t.completada).length;
  const puedeAvanzar = completas >= 2;
  const esUltima = numero === total;

  const titulo = semana.titulo || semana.nombre || `Semana ${numero}`;

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.eye}>Esta semana · activa</div>
        <h2 className={styles.ttl}>{titulo}</h2>
        {semana.descripcion && (
          <p
            className={styles.desc}
            dangerouslySetInnerHTML={{ __html: md(semana.descripcion) }}
          />
        )}
      </header>

      <div className={styles.body}>
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
              className={`${styles.task} ${t.completada ? styles.taskDone : ''}`}
              onClick={() => onToggleTarea(t.id)}
            >
              <span className={styles.chk} />
              <span className={styles.copy}>{t.texto}</span>
            </button>
          ))}
        </div>

        <div className={styles.checkin}>
          <div className={styles.checkinLbl}>Check-in semanal</div>
          <div className={styles.checkinAsk}>¿Qué viste cambiar esta semana?</div>
          <textarea
            className={styles.checkinArea}
            placeholder="Una o dos frases. Lo que viste, no lo que esperabas ver."
            value={reflexion}
            onChange={(e) => onReflexionChange(e.target.value)}
          />
          {errMsg && <p className={styles.errMsg}>{errMsg}</p>}
          <Button
            disabled={!puedeAvanzar || reflexion.trim().length < 5 || avanzando}
            onClick={onAvanzar}
            className={styles.adv}
          >
            {avanzando ? 'Guardando…' : (esUltima ? 'Cerrar el plan' : `Avanzar a Semana ${numero + 1}`)}
          </Button>
        </div>
      </div>
    </article>
  );
}
