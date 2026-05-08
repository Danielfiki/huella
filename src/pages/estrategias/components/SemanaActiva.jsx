import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import { md } from '../helpers';
import styles from './SemanaActiva.module.css';

export default function SemanaActiva({ semana, numero, total, reflexion, onReflexionChange, onAvanzar }) {
  const [tareas, setTareas] = useState(semana.tareas || []);

  const completas = tareas.filter((t) => t.completada).length;
  const puedeAvanzar = completas >= 2;
  const esUltima = numero === total;

  const toggleTarea = (id) => {
    setTareas((prev) => prev.map((t) => t.id === id ? { ...t, completada: !t.completada } : t));
  };

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <div className={styles.eye}>Esta semana · activa</div>
        <h3 className={styles.ttl}>{semana.titulo}</h3>
        <p className={styles.sub} dangerouslySetInnerHTML={{ __html: md(semana.descripcion) }} />
      </header>
      <div className={styles.tasks}>
        {tareas.map((t) => (
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
        <Button
          disabled={!puedeAvanzar || reflexion.trim().length < 5}
          onClick={onAvanzar}
          className={styles.advBtn}
        >
          {esUltima ? 'Cerrar el plan ✓' : `Avanzar a Semana ${numero + 1} →`}
        </Button>
      </div>
    </article>
  );
}
