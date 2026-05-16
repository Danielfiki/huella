import React, { useState, useEffect } from 'react';
import { ArrowRight, EyeOff } from 'lucide-react';
import styles from './Pantalla6_PanelDescanso.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Pantalla 6 — Card "Estrategia en descanso" en el Panel de Inicio.
// Approach 6A. Aparece debajo de EstrategiaActivaPanel para estrategias que
// tuvieron ciclos pero ninguno activo ahora.
//
// ⚠️ CORRECCIÓN 2 aplicada (2026-05-13):
// Icono cambiado de `Moon` (lucide-react) a emoji 🌿 directo en JSX.
// No se importa Moon. Font-size ajustado para que el emoji quede
// proporcional al tile circular (28px sobre fondo de 44px).
//
// ⚠️ CORRECCIÓN 3 aplicada (2026-05-13):
// "Ocultar de aquí" persiste en localStorage (antes sessionStorage).
// Clave: huella_descanso_ocultado_{estrategiaId}, valor "true".
// Al montar, se leen las claves y se ocultan las cards correspondientes.
// Sin confirmación adicional al ocultar.
// En implementación final esto migrará a DB (estrategias_panel_descartadas)
// para sincronizar cross-device entre los adultos de la familia.
// ────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = (estrategiaId) => `huella_descanso_ocultado_${estrategiaId}`;

const MOCK_ESTRATEGIAS_EN_DESCANSO = [
  {
    id: 'est-3',
    habilidad: 'Rutinas de sueño',
    hijo: { nombre: 'Pascualito' },
    ultimo_ciclo: {
      numero: 1,
      fecha_fin: '2025-10-12',
      hace_texto: 'hace 7 meses',
    },
  },
  {
    id: 'est-4',
    habilidad: 'Tolerancia a la frustración',
    hijo: { nombre: 'Pascualito' },
    ultimo_ciclo: {
      numero: 2,
      fecha_fin: '2026-02-18',
      hace_texto: 'hace 3 meses',
    },
  },
];

function EstrategiaDescansoCard({ estrategia, onRetomar, onOcultar }) {
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.tile} aria-hidden="true">
          <span className={styles.emoji}>🌿</span>
        </div>
        <div className={styles.headTxt}>
          <div className={styles.eye}>En descanso</div>
          <h3 className={styles.h3}>{estrategia.habilidad}</h3>
          <p className={styles.sub}>
            Cerraste el Ciclo {estrategia.ultimo_ciclo.numero} {estrategia.ultimo_ciclo.hace_texto}. Cuando quieras retomarlo, sigues aquí.
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.retomar}
          onClick={() => onRetomar(estrategia)}
        >
          Retomar
          <ArrowRight size={14} />
        </button>
        <button
          className={styles.ocultar}
          onClick={() => onOcultar(estrategia.id)}
          aria-label="Ocultar esta estrategia del panel"
        >
          <EyeOff size={14} />
          Ocultar de aquí
        </button>
      </div>
    </article>
  );
}

export default function Pantalla6PanelDescanso() {
  const [estrategias] = useState(MOCK_ESTRATEGIAS_EN_DESCANSO);
  const [ocultas, setOcultas] = useState(() => new Set());

  // ⚠️ CORRECCIÓN 3: leer localStorage al montar y poblar el set de ocultas.
  useEffect(() => {
    const inicial = new Set();
    estrategias.forEach((e) => {
      try {
        if (localStorage.getItem(STORAGE_KEY(e.id)) === 'true') {
          inicial.add(e.id);
        }
      } catch (_err) {
        // localStorage podría no estar disponible (modo privado, etc.)
      }
    });
    setOcultas(inicial);
  }, [estrategias]);

  const ocultar = (estrategiaId) => {
    // Escribe en localStorage y oculta inmediatamente, sin confirmación.
    try {
      localStorage.setItem(STORAGE_KEY(estrategiaId), 'true');
    } catch (_err) {
      // Si localStorage falla, oculta solo en memoria.
    }
    setOcultas((prev) => {
      const next = new Set(prev);
      next.add(estrategiaId);
      return next;
    });
  };

  const retomar = (e) => {
    console.log('[mockup] retomar estrategia', e.id);
  };

  // Helper para limpiar el estado en sesiones de mockup — no afecta producción.
  const resetMockup = () => {
    estrategias.forEach((e) => {
      try { localStorage.removeItem(STORAGE_KEY(e.id)); } catch (_err) { /* noop */ }
    });
    setOcultas(new Set());
  };

  const visibles = estrategias.filter((e) => !ocultas.has(e.id));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.h1}>Hola, Daniel</h1>
          <p className={styles.lead}>Lo que estás trabajando con Pascualito.</p>
        </div>
      </header>

      <main className={styles.main}>
        {/* Placeholder de los componentes existentes que NO se rediseñan */}
        <section className={styles.placeholderPanel} aria-label="EstrategiaActivaPanel (sin cambios)">
          <div className={styles.placeholderTtl}>EstrategiaActivaPanel</div>
          <p className={styles.placeholderTxt}>
            Aquí vive el panel actual de estrategias activas. No se toca en este rediseño — sólo se agrega el bloque "En descanso" debajo.
          </p>
        </section>

        {visibles.length > 0 && (
          <section className={styles.descansoWrap}>
            <header className={styles.descansoHead}>
              <h2 className={styles.h2}>Estrategias en descanso</h2>
              <p className={styles.descansoLead}>
                Habilidades que trabajaste antes y siguen disponibles para retomar.
              </p>
            </header>

            <div className={styles.cards}>
              {visibles.map((e) => (
                <EstrategiaDescansoCard
                  key={e.id}
                  estrategia={e}
                  onRetomar={retomar}
                  onOcultar={ocultar}
                />
              ))}
            </div>
          </section>
        )}

        {/* Utility solo del mockup — facilita probar la persistencia */}
        {ocultas.size > 0 && (
          <button className={styles.resetBtn} onClick={resetMockup}>
            ↺ Restaurar ocultas (sólo mockup)
          </button>
        )}
      </main>
    </div>
  );
}
