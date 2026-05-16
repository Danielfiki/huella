import React, { useState } from 'react';
import styles from './Pantalla5_PDF.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Pantalla 5 — PDF clínico extendido — tabla maestra + dossier por ciclo.
// Approach 5B. Render HTML que simula página del PDF.
// Toggle para alternar entre versión "con Δ Intensidad" y "sin Δ Intensidad".
// ────────────────────────────────────────────────────────────────────────────

const MOCK_PDF = {
  hijo: { nombre: 'Pascualito', edad: 6 },
  rango: '2025-09-01 → 2026-05-13',
  estrategias: [
    {
      id: 'est-1',
      habilidad: 'Concentración',
      ciclos: [
        { numero: 1, estado: 'completado', fecha_inicio: '2025-12-10', fecha_fin: '2026-01-08', semanas: 4, episodios: 3, delta_intensidad: '-0.6' },
        { numero: 2, estado: 'activo',     fecha_inicio: '2026-04-22', fecha_fin: null,         semanas: 4, episodios: 4, delta_intensidad: null },
      ],
    },
    {
      id: 'est-2',
      habilidad: 'Autorregulación',
      ciclos: [
        { numero: 1, estado: 'activo', fecha_inicio: '2026-05-01', fecha_fin: null, semanas: 4, episodios: 2, delta_intensidad: null },
      ],
    },
    {
      id: 'est-3',
      habilidad: 'Rutinas de sueño',
      ciclos: [
        { numero: 1, estado: 'completado', fecha_inicio: '2025-09-15', fecha_fin: '2025-10-12', semanas: 4, episodios: 6, delta_intensidad: '-1.2' },
        { numero: 2, estado: 'abandonado', fecha_inicio: '2025-11-20', fecha_fin: '2025-12-04', semanas: 4, episodios: 1, delta_intensidad: '+0.1' },
      ],
    },
  ],
  dossier_ejemplo: {
    habilidad: 'Concentración',
    ciclo: 1,
    fecha_inicio: '2025-12-10',
    fecha_fin: '2026-01-08',
    tareas_destacadas: [
      'Rutina "antes de la pega" de 2 min',
      'Reloj de arena para tareas de 10 min',
      'Celebrar al terminar sin recordatorio',
    ],
    bitacora_resumen: 'A lo largo del ciclo Pascualito mostró aumentos progresivos en su capacidad de sostener tareas. Los padres anotaron menos episodios de distracción aguda en las últimas dos semanas.',
    analisis: {
      queCambio: 'Pascualito sostuvo tareas de 15-20 min sin recordatorio. Reconoció cuándo se distrajo y volvió solo a la tarea.',
      quePendiente: 'En contextos con pantalla cercana la concentración aún se rompe rápido.',
      recomendaciones: 'Trabajar transiciones desde pantallas a tareas concretas; mantener el reloj de arena.',
    },
    episodios_vinculados: 3,
  },
};

function estadoLabel(e) {
  if (e === 'completado') return '✓ Completado';
  if (e === 'activo')     return '● En curso';
  if (e === 'abandonado') return '· Abandonado';
  return e;
}

export default function Pantalla5PDF() {
  const [conDelta, setConDelta] = useState(true);
  const d = MOCK_PDF;

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarLbl}>Vista PDF · sección "Estrategias trabajadas"</span>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={conDelta}
            onChange={(e) => setConDelta(e.target.checked)}
          />
          <span>Columna Δ Intensidad</span>
        </label>
      </div>

      {/* Hoja PDF #1 — Tabla maestra */}
      <article className={styles.hoja}>
        <header className={styles.hojaHead}>
          <div className={styles.hojaTtl}>Estrategias trabajadas</div>
          <div className={styles.hojaSub}>{d.hijo.nombre}, {d.hijo.edad} años · {d.rango}</div>
        </header>

        <p className={styles.intro}>
          A lo largo de este período se trabajaron <strong>{d.estrategias.length} estrategias</strong> con un total de{' '}
          <strong>{d.estrategias.reduce((acc, e) => acc + e.ciclos.length, 0)} ciclos</strong>. Cada ciclo agrupa tareas, bitácora de los padres, episodios vinculados y un análisis de cierre.
        </p>

        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Habilidad</th>
              <th>Ciclo</th>
              <th>Período</th>
              <th>Estado</th>
              <th>Episodios</th>
              {conDelta && <th>Δ Intensidad</th>}
            </tr>
          </thead>
          <tbody>
            {d.estrategias.flatMap((est) =>
              est.ciclos.map((c, idx) => (
                <tr key={`${est.id}-${c.numero}`}>
                  {idx === 0
                    ? <td rowSpan={est.ciclos.length} className={styles.habilCell}>{est.habilidad}</td>
                    : null}
                  <td>Ciclo {c.numero}</td>
                  <td>{c.fecha_inicio} → {c.fecha_fin || '—'}</td>
                  <td className={styles[`estado_${c.estado}`]}>{estadoLabel(c.estado)}</td>
                  <td className={styles.numCell}>{c.episodios}</td>
                  {conDelta && (
                    <td className={styles.numCell}>
                      {c.delta_intensidad
                        ? <span className={c.delta_intensidad.startsWith('-') ? styles.deltaGood : styles.deltaBad}>{c.delta_intensidad}</span>
                        : <span className={styles.deltaNa}>—</span>}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!conDelta && (
          <p className={styles.narrativaFallback}>
            <strong>Lectura narrativa:</strong> Los ciclos de Concentración mostraron mejoría sostenida.
            El segundo ciclo de Rutinas de sueño se interrumpió antes de completarse y queda como
            antecedente para futuras iteraciones. Autorregulación se trabaja actualmente.
          </p>
        )}

        <div className={styles.pageNum}>— pág. 7 —</div>
      </article>

      {/* Hoja PDF #2 — Dossier por ciclo */}
      <article className={styles.hoja}>
        <header className={styles.hojaHead}>
          <div className={styles.hojaTtl}>Dossier · {d.dossier_ejemplo.habilidad} · Ciclo {d.dossier_ejemplo.ciclo}</div>
          <div className={styles.hojaSub}>{d.dossier_ejemplo.fecha_inicio} → {d.dossier_ejemplo.fecha_fin}</div>
        </header>

        <section className={styles.seccion}>
          <h4 className={styles.seccionTtl}>Tareas trabajadas</h4>
          <ul className={styles.ul}>
            {d.dossier_ejemplo.tareas_destacadas.map((t, i) => (
              <li key={i} className={styles.li}>{t}</li>
            ))}
          </ul>
        </section>

        <section className={styles.seccion}>
          <h4 className={styles.seccionTtl}>Resumen de la bitácora</h4>
          <p className={styles.p}>{d.dossier_ejemplo.bitacora_resumen}</p>
        </section>

        <section className={styles.seccion}>
          <h4 className={styles.seccionTtl}>Análisis IA al cierre</h4>
          <div className={styles.subTtl}>Qué cambió</div>
          <p className={styles.p}>{d.dossier_ejemplo.analisis.queCambio}</p>
          <div className={styles.subTtl}>Qué quedó pendiente</div>
          <p className={styles.p}>{d.dossier_ejemplo.analisis.quePendiente}</p>
          <div className={styles.subTtl}>Recomendaciones</div>
          <p className={styles.p}>{d.dossier_ejemplo.analisis.recomendaciones}</p>
        </section>

        <section className={styles.seccion}>
          <h4 className={styles.seccionTtl}>Episodios vinculados</h4>
          <p className={styles.pSm}>
            {d.dossier_ejemplo.episodios_vinculados} episodios quedaron asociados a este ciclo. Los detalles aparecen en la sección de Episodios del informe.
          </p>
        </section>

        <p className={styles.disclaimer}>
          Este análisis es una orientación basada en lo que los padres registraron. No constituye diagnóstico clínico.
        </p>

        <div className={styles.pageNum}>— pág. 8 —</div>
      </article>
    </div>
  );
}
