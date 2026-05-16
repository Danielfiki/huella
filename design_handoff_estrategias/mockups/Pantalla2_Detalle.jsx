import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, Link2, MessageSquarePlus } from 'lucide-react';
import styles from './Pantalla2_Detalle.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Pantalla 2 — Detalle del ciclo con bitácora "Lo que está pasando"
// Approach 2C. NotaCard + EpisodioVinculadoCard + botón persistente "Anotar algo".
// ────────────────────────────────────────────────────────────────────────────

const MOCK_CICLO = {
  estrategia: 'Concentración',
  hijo: { nombre: 'Pascualito', edad: 6 },
  ciclo_numero: 2,
  semana_actual: 3,
  total_semanas: 4,
  tareas_semana: [
    { id: 't1', texto: 'Hacer una rutina de "antes de la pega" de 2 min', completada: true },
    { id: 't2', texto: 'Usar el reloj de arena para tareas de 10 min', completada: true },
    { id: 't3', texto: 'Celebrar cuando termina sin que le recuerden', completada: false },
  ],
  bitacora: [
    {
      id: 'n1',
      tipo: 'nota',
      autor: 'Pareja',
      fecha: 'Hace 2 días',
      texto: 'Le funcionó re bien el reloj de arena. Pidió "ponerlo otra vez" después de la primera tarea.',
    },
    {
      id: 'e1',
      tipo: 'episodio',
      autor: 'Tú',
      fecha: 'Hace 3 días',
      titulo: 'Frustración al cambiar de actividad',
      descripcion: 'Llevaba 15 min con legos, le pedí ir a comer. Lloró fuerte.',
      intensidad: 3,
      emoji: '😤',
    },
    {
      id: 'n2',
      tipo: 'nota',
      autor: 'Tú',
      fecha: 'Hace 5 días',
      texto: 'Hoy se sentó solo a dibujar 25 min. No le recordé nada. Le mostré después y se enorgulleció.',
    },
  ],
};

function NotaCard({ nota }) {
  return (
    <article className={styles.notaCard}>
      <header className={styles.notaHead}>
        <div className={styles.notaTipo}>
          <MessageSquarePlus size={14} />
          <span>Nota</span>
        </div>
        <div className={styles.notaMeta}>
          <span className={styles.notaAutor}>{nota.autor}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.notaFecha}>{nota.fecha}</span>
        </div>
      </header>
      <p className={styles.notaTexto}>{nota.texto}</p>
    </article>
  );
}

function EpisodioVinculadoCard({ ep }) {
  return (
    <article className={styles.epCard}>
      <header className={styles.epHead}>
        <div className={styles.epEmojiBox}>{ep.emoji}</div>
        <div className={styles.epHeadText}>
          <div className={styles.epTipo}>
            <Link2 size={12} />
            <span>Episodio vinculado</span>
          </div>
          <h4 className={styles.epTtl}>{ep.titulo}</h4>
        </div>
      </header>
      <p className={styles.epDesc}>{ep.descripcion}</p>
      <footer className={styles.epFoot}>
        <div className={styles.epDots}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`${styles.dotInt} ${i <= ep.intensidad ? styles.dotOn : ''}`} />
          ))}
        </div>
        <div className={styles.epMeta}>
          <span className={styles.notaAutor}>{ep.autor}</span>
          <span className={styles.dot}>·</span>
          <span className={styles.notaFecha}>{ep.fecha}</span>
        </div>
      </footer>
    </article>
  );
}

export default function Pantalla2Detalle() {
  const [c, setC] = useState(MOCK_CICLO);
  const [showAnotar, setShowAnotar] = useState(false);
  const [draft, setDraft] = useState('');

  const toggleTarea = (id) => {
    setC((prev) => ({
      ...prev,
      tareas_semana: prev.tareas_semana.map((t) =>
        t.id === id ? { ...t, completada: !t.completada } : t,
      ),
    }));
  };

  const guardarNota = () => {
    if (!draft.trim()) return;
    setC((prev) => ({
      ...prev,
      bitacora: [
        { id: `n-${Date.now()}`, tipo: 'nota', autor: 'Tú', fecha: 'Hace un momento', texto: draft },
        ...prev.bitacora,
      ],
    }));
    setDraft('');
    setShowAnotar(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.back} onClick={() => console.log('volver')}>
            <ArrowLeft size={18} />
          </button>
          <div className={styles.headTexts}>
            <div className={styles.eye}>Ciclo {c.ciclo_numero} · {c.hijo.nombre}</div>
            <h1 className={styles.h1}>{c.estrategia}</h1>
            <div className={styles.weekChip}>Semana {c.semana_actual} de {c.total_semanas}</div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Tareas de la semana */}
        <section className={styles.tareasSec}>
          <h3 className={styles.h3}>Tu semana</h3>
          <ul className={styles.tareas}>
            {c.tareas_semana.map((t) => (
              <li key={t.id} className={styles.tarea}>
                <button
                  className={`${styles.checkbox} ${t.completada ? styles.checked : ''}`}
                  onClick={() => toggleTarea(t.id)}
                  aria-label={t.completada ? 'Desmarcar' : 'Marcar como hecha'}
                >
                  {t.completada && <Check size={14} strokeWidth={3} />}
                </button>
                <span className={`${styles.tareaTxt} ${t.completada ? styles.tachada : ''}`}>{t.texto}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Bitácora — "Lo que está pasando" */}
        <section className={styles.bitacoraSec}>
          <header className={styles.bitacoraHead}>
            <h3 className={styles.h3}>Lo que está pasando</h3>
            <span className={styles.bitacoraCount}>{c.bitacora.length} entradas</span>
          </header>
          <div className={styles.bitacora}>
            {c.bitacora.map((item) =>
              item.tipo === 'nota'
                ? <NotaCard key={item.id} nota={item} />
                : <EpisodioVinculadoCard key={item.id} ep={item} />
            )}
          </div>
        </section>
      </main>

      {/* Botón persistente "Anotar algo" */}
      <button className={styles.anotarFab} onClick={() => setShowAnotar(true)}>
        <Plus size={18} />
        Anotar algo
      </button>

      {showAnotar && (
        <div className={styles.scrim} onClick={() => setShowAnotar(false)}>
          <div className={styles.composer} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.h4}>Anotar algo de hoy</h4>
            <p className={styles.composerLead}>
              Lo que observaste, una pelea que te llamó la atención, algo que te enterneció.
            </p>
            <textarea
              className={styles.textarea}
              placeholder="Escribe libre — sin formato, sin presión…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={4}
            />
            <div className={styles.composerActions}>
              <button className={styles.btnGhost} onClick={() => setShowAnotar(false)}>Cancelar</button>
              <button className={styles.btnPrim} onClick={guardarNota}>Guardar nota</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
