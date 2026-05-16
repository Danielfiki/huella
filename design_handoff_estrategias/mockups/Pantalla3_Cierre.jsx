import React from 'react';
import { Sparkles } from 'lucide-react';
import styles from './Pantalla3_Cierre.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Pantalla 3 — Cierre del ciclo con 2 CTAs gemelas y 3 secciones IA
// Approach 3A. Aparece tras cerrar la última semana.
// ────────────────────────────────────────────────────────────────────────────

const MOCK_CIERRE = {
  hijo: { nombre: 'Pascualito' },
  habilidad: 'Concentración',
  ciclo_numero: 2,
  duracion_semanas: 4,
  notas_count: 11,
  episodios_count: 4,
  analisis: {
    queCambio: 'Pascualito empezó a sostener tareas de 15-20 min sin necesidad de recordatorio. Reconoce cuando se distrae y vuelve solo a la tarea — eso es nuevo desde el Ciclo 1.',
    quePendiente: 'En contextos con pantalla cercana la concentración aún se rompe rápido. También cuesta más cuando vuelve cansado del colegio.',
    recomendaciones: [
      'Trabajar transiciones desde pantallas a tareas concretas con un ritual corto.',
      'Acordar una hora "ventana de concentración" antes del cansancio acumulado del día.',
      'Mantener el reloj de arena como ancla — funcionó y le da autonomía.',
    ],
  },
};

export default function Pantalla3Cierre() {
  const c = MOCK_CIERRE;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.celebrationDot}><Sparkles size={20} /></div>
          <div className={styles.eye}>Ciclo {c.ciclo_numero} completado</div>
          <h1 className={styles.h1}>{c.habilidad}</h1>
          <p className={styles.lead}>
            Trabajaste {c.duracion_semanas} semanas con {c.hijo.nombre}. La IA leyó tus notas, los episodios vinculados y los check-ins para devolverte lo que encontró.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statNum}>{c.duracion_semanas}</div>
            <div className={styles.statLbl}>semanas</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>{c.notas_count}</div>
            <div className={styles.statLbl}>notas</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>{c.episodios_count}</div>
            <div className={styles.statLbl}>episodios vinculados</div>
          </div>
        </div>

        <section className={styles.analisis}>
          <article className={styles.bloque}>
            <div className={styles.bloqueIco}>✦</div>
            <h3 className={styles.h3}>Qué cambió</h3>
            <p className={styles.p}>{c.analisis.queCambio}</p>
          </article>

          <article className={styles.bloque}>
            <div className={styles.bloqueIco}>◗</div>
            <h3 className={styles.h3}>Qué quedó pendiente</h3>
            <p className={styles.p}>{c.analisis.quePendiente}</p>
          </article>

          <article className={styles.bloque}>
            <div className={styles.bloqueIco}>→</div>
            <h3 className={styles.h3}>Recomendaciones para integrar</h3>
            <ul className={styles.ul}>
              {c.analisis.recomendaciones.map((r, i) => (
                <li key={i} className={styles.li}>{r}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className={styles.ctasWrap}>
          <p className={styles.ctasLead}>¿Qué quieres hacer ahora?</p>
          <div className={styles.ctas}>
            <button
              className={styles.cta}
              onClick={() => console.log('trabajar libre')}
            >
              <div className={styles.ctaText}>
                <div className={styles.ctaTtl}>Trabajar libre</div>
                <div className={styles.ctaSub}>Sigue presente sin abrir un ciclo nuevo</div>
              </div>
            </button>
            <button
              className={styles.cta}
              onClick={() => console.log('iniciar nuevo ciclo')}
            >
              <div className={styles.ctaText}>
                <div className={styles.ctaTtl}>Iniciar nuevo ciclo</div>
                <div className={styles.ctaSub}>Arma un próximo ciclo con tareas y semanas</div>
              </div>
            </button>
          </div>
        </section>

        <p className={styles.disclaimer}>
          Este análisis es una orientación, no un diagnóstico. Si algo te preocupa, conversa con un profesional de confianza.
        </p>
      </main>
    </div>
  );
}
