import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Trash2, ChevronRight, X } from 'lucide-react';
import styles from './Pantalla1_Lista.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Pantalla 1 — Lista de estrategias con timeline horizontal por estrategia
// Approach 1A. Incluye MenuPopover reusable y sheet escalado en 2 niveles
// para ciclos pasados (resumen → bitácora completa).
// ────────────────────────────────────────────────────────────────────────────

const MOCK_ESTRATEGIAS = [
  {
    id: 'est-1',
    habilidad: 'Concentración',
    hijo: { nombre: 'Pascualito', edad: 6 },
    ciclos: [
      { id: 'c1', numero: 1, estado: 'completado', fecha_inicio: '2025-12-10', fecha_fin: '2026-01-08', semanas: 4 },
      { id: 'c2', numero: 2, estado: 'activo', fecha_inicio: '2026-04-22', semanas: 4, semana_actual: 3 },
    ],
  },
  {
    id: 'est-2',
    habilidad: 'Autorregulación',
    hijo: { nombre: 'Pascualito', edad: 6 },
    ciclos: [
      { id: 'c3', numero: 1, estado: 'activo', fecha_inicio: '2026-05-01', semanas: 4, semana_actual: 2 },
    ],
  },
  {
    id: 'est-3',
    habilidad: 'Rutinas de sueño',
    hijo: { nombre: 'Pascualito', edad: 6 },
    ciclos: [
      { id: 'c4', numero: 1, estado: 'completado', fecha_inicio: '2025-09-15', fecha_fin: '2025-10-12', semanas: 4 },
      { id: 'c5', numero: 2, estado: 'abandonado', fecha_inicio: '2025-11-20', semanas: 4 },
    ],
  },
];

function MenuPopover({ items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div ref={ref} className={styles.menu} role="menu">
      {items.map((it) => (
        <button
          key={it.label}
          className={`${styles.menuItem} ${it.danger ? styles.menuItemDanger : ''}`}
          onClick={() => { it.onClick(); onClose(); }}
        >
          {it.icon} {it.label}
        </button>
      ))}
    </div>
  );
}

function CicloPill({ ciclo, onClick }) {
  const isActivo = ciclo.estado === 'activo';
  const isCompletado = ciclo.estado === 'completado';
  const isAbandonado = ciclo.estado === 'abandonado';

  const cls = [
    styles.pill,
    isActivo && styles.pillActivo,
    isCompletado && styles.pillCompletado,
    isAbandonado && styles.pillAbandonado,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} onClick={onClick}>
      <span className={styles.pillNum}>Ciclo {ciclo.numero}</span>
      <span className={styles.pillState}>
        {isActivo && `Semana ${ciclo.semana_actual}/${ciclo.semanas}`}
        {isCompletado && '✓ completado'}
        {isAbandonado && '· abandonado'}
      </span>
    </button>
  );
}

// Una estrategia es "activa" sólo si tiene un ciclo en curso.
// Si todos los ciclos están completados o abandonados, está en descanso.
const esEstrategiaActiva = (e) => e.ciclos.some((c) => c.estado === 'activo');

function EstrategiaCarril({ estrategia, atenuada, onAbrirCiclo, onVerCicloPasado, onEliminar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className={`${styles.carril} ${atenuada ? styles.carrilAtenuado : ''}`}>
      <header className={styles.carrilHead}>
        <div className={styles.carrilTitulo}>
          <h3 className={styles.h3}>{estrategia.habilidad}</h3>
          <div className={styles.sub}>{estrategia.hijo.nombre} · {estrategia.hijo.edad} años</div>
        </div>
        <div className={styles.menuWrap}>
          <button
            className={styles.menuTrigger}
            onClick={() => setMenuOpen(true)}
            aria-label="Opciones de la estrategia"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <MenuPopover
              items={[
                {
                  label: 'Eliminar estrategia',
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onClick: () => onEliminar(estrategia),
                },
              ]}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </header>
      <div className={styles.timeline}>
        {estrategia.ciclos.map((c) => (
          <CicloPill
            key={c.id}
            ciclo={c}
            onClick={() => (c.estado === 'activo' ? onAbrirCiclo(c) : onVerCicloPasado(c, estrategia))}
          />
        ))}
      </div>
    </article>
  );
}

// Sheet escalado en 2 niveles: nivel 1 = resumen, nivel 2 = bitácora completa
function CicloPasadoSheet({ ciclo, estrategia, onClose }) {
  const [nivel, setNivel] = useState(1);

  const MOCK_BITACORA = [
    { id: 'n1', autor: 'Pareja', fecha: '2025-12-15', texto: 'Hoy se quedó 20 min concentrado armando legos. Sin pantalla cerca.' },
    { id: 'n2', autor: 'Tú', fecha: '2025-12-22', texto: 'Después del colegio le costó más. Cansancio acumulado.' },
    { id: 'n3', autor: 'Tú', fecha: '2026-01-03', texto: 'Cerró el ciclo sintiéndose orgulloso. Le mostré sus avances.' },
  ];
  const MOCK_ANALISIS = {
    queCambio: 'Pascualito empezó a sostener tareas de 15-20 min sin necesidad de recordatorio.',
    quePendiente: 'En contextos con pantalla cercana la concentración aún se rompe rápido.',
    recomendaciones: 'Probar trabajar transiciones desde pantallas a tareas concretas.',
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <header className={styles.sheetHead}>
          <div>
            <div className={styles.sheetEye}>{estrategia.habilidad}</div>
            <h2 className={styles.sheetTtl}>Ciclo {ciclo.numero} · {ciclo.estado}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        {nivel === 1 ? (
          <div className={styles.sheetBody}>
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <div className={styles.metaLbl}>Inició</div>
                <div className={styles.metaVal}>{ciclo.fecha_inicio}</div>
              </div>
              {ciclo.fecha_fin && (
                <div className={styles.metaItem}>
                  <div className={styles.metaLbl}>Cerró</div>
                  <div className={styles.metaVal}>{ciclo.fecha_fin}</div>
                </div>
              )}
              <div className={styles.metaItem}>
                <div className={styles.metaLbl}>Duración</div>
                <div className={styles.metaVal}>{ciclo.semanas} semanas</div>
              </div>
            </div>

            <section className={styles.analisis}>
              <h4 className={styles.h4}>Qué cambió</h4>
              <p className={styles.p}>{MOCK_ANALISIS.queCambio}</p>
              <h4 className={styles.h4}>Qué quedó pendiente</h4>
              <p className={styles.p}>{MOCK_ANALISIS.quePendiente}</p>
              <h4 className={styles.h4}>Recomendaciones</h4>
              <p className={styles.p}>{MOCK_ANALISIS.recomendaciones}</p>
            </section>

            <button className={styles.ctaSecondary} onClick={() => setNivel(2)}>
              Ver bitácora completa de este ciclo
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.sheetBody}>
            <button className={styles.backLink} onClick={() => setNivel(1)}>← Volver al resumen</button>
            <h3 className={styles.h3}>Bitácora · {MOCK_BITACORA.length} notas</h3>
            <ul className={styles.notas}>
              {MOCK_BITACORA.map((n) => (
                <li key={n.id} className={styles.nota}>
                  <div className={styles.notaHead}>
                    <span className={styles.notaAutor}>{n.autor}</span>
                    <span className={styles.notaFecha}>{n.fecha}</span>
                  </div>
                  <p className={styles.notaTexto}>{n.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pantalla1Lista() {
  const [estrategias] = useState(MOCK_ESTRATEGIAS);
  const [sheetCiclo, setSheetCiclo] = useState(null);

  const activas = estrategias.filter(esEstrategiaActiva);
  const enDescanso = estrategias.filter((e) => !esEstrategiaActiva(e));

  const renderCarril = (e, atenuada) => (
    <EstrategiaCarril
      key={e.id}
      estrategia={e}
      atenuada={atenuada}
      onAbrirCiclo={(c) => console.log('abrir ciclo activo', c.id)}
      onVerCicloPasado={(c, est) => setSheetCiclo({ ciclo: c, estrategia: est })}
      onEliminar={(est) => console.log('eliminar estrategia', est.id)}
    />
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.h1}>Tus estrategias</h1>
          <p className={styles.lead}>
            {activas.length} estrategias activas · {enDescanso.length} en descanso · trabajando lo que vive Pascualito día a día.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {activas.map((e) => renderCarril(e, false))}

        {enDescanso.length > 0 && (
          <>
            <div className={styles.sectionEyebrow}>En descanso</div>
            {enDescanso.map((e) => renderCarril(e, true))}
          </>
        )}

        <button className={styles.fab} onClick={() => console.log('nueva estrategia')}>
          + Empezar otra estrategia
        </button>
      </main>

      {sheetCiclo && (
        <CicloPasadoSheet
          ciclo={sheetCiclo.ciclo}
          estrategia={sheetCiclo.estrategia}
          onClose={() => setSheetCiclo(null)}
        />
      )}
    </div>
  );
}
