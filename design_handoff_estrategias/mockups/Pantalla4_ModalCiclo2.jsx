import React, { useState } from 'react';
import { X, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import styles from './Pantalla4_ModalCiclo2.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Pantalla 4 — Modal Ciclo 2 (bottom sheet)
// Approach 4B. Aparece cuando el usuario elige una habilidad sobre la que
// ya existe historia previa.
//
// ⚠️ CORRECCIÓN 1 aplicada (2026-05-13):
// Ambas opciones — "Continuar" y "Ciclo independiente" — crean el Ciclo N+1
// DENTRO de la misma estrategia contenedor. NO se crea una estrategia paralela.
// La diferencia está sólo en el prompt a la IA:
//  - Continuar: la IA recibe el historial completo del Ciclo anterior.
//  - Ciclo independiente: la IA parte fresca, sin memoria del ciclo previo.
// Preserva la invariante "una habilidad = una estrategia".
//
// Si el ciclo anterior no tiene análisis IA (caso fallback), se muestra
// preview reducida y se invita igual a iniciar Ciclo N+1.
// ────────────────────────────────────────────────────────────────────────────

const MOCK_DATA = {
  habilidad: 'Concentración',
  hijo: { nombre: 'Pascualito' },
  estrategia_id: 'est-1',
  ciclo_anterior: {
    numero: 1,
    fecha_inicio: '2025-12-10',
    fecha_fin: '2026-01-08',
    semanas: 4,
    estado: 'completado',
    tiene_analisis: true,
    analisis_resumen: 'Pascualito empezó a sostener tareas de 15-20 min sin recordatorio. En contextos con pantalla cercana la concentración aún se rompe rápido.',
  },
};

// Variante sin análisis IA (fallback) — cambiar tiene_analisis a false para ver el preview reducido
// const MOCK_DATA_FALLBACK = { ...MOCK_DATA, ciclo_anterior: { ...MOCK_DATA.ciclo_anterior, tiene_analisis: false, analisis_resumen: null } };

export default function Pantalla4ModalCiclo2({ onClose = () => {} }) {
  const data = MOCK_DATA; // o MOCK_DATA_FALLBACK para probar fallback
  const [seleccion, setSeleccion] = useState(null); // 'continuar' | 'independiente' | null

  const proximoCiclo = data.ciclo_anterior.numero + 1;

  // ⚠️ Ambos handlers crean el siguiente ciclo dentro de la MISMA estrategia.
  // La única diferencia es el flag `usarMemoriaIA` que el backend pasa al prompt.
  const confirmar = () => {
    if (!seleccion) return;
    const payload = {
      estrategia_id: data.estrategia_id, // ⬅️ misma estrategia siempre
      crear_ciclo: {
        numero: proximoCiclo,            // ⬅️ ciclo N+1, NO estrategia nueva
        usar_memoria_ia: seleccion === 'continuar',
      },
    };
    console.log('[mockup] confirmar Ciclo', proximoCiclo, payload);
    onClose();
  };

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.grabber} aria-hidden="true" />

        <header className={styles.head}>
          <div>
            <div className={styles.eye}>Ya trabajaste esto antes</div>
            <h2 className={styles.h2}>{data.habilidad}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        {/* Preview del ciclo anterior */}
        <section className={styles.preview}>
          <header className={styles.previewHead}>
            <span className={styles.cicloBadge}>Ciclo {data.ciclo_anterior.numero}</span>
            <span className={styles.previewMeta}>
              {data.ciclo_anterior.fecha_inicio} → {data.ciclo_anterior.fecha_fin}
            </span>
          </header>
          {data.ciclo_anterior.tiene_analisis ? (
            <p className={styles.previewTxt}>{data.ciclo_anterior.analisis_resumen}</p>
          ) : (
            <p className={styles.previewFallback}>
              Este ciclo no quedó con análisis al cierre. Igual queda como antecedente.
            </p>
          )}
        </section>

        <p className={styles.pregunta}>¿Cómo quieres armar el Ciclo {proximoCiclo}?</p>

        {/* Opciones */}
        <div className={styles.opciones}>
          <button
            className={`${styles.opcion} ${seleccion === 'continuar' ? styles.opcionSel : ''}`}
            onClick={() => setSeleccion('continuar')}
            disabled={!data.ciclo_anterior.tiene_analisis}
          >
            <div className={styles.opcionIco}><Sparkles size={18} /></div>
            <div className={styles.opcionTxt}>
              <div className={styles.opcionTtl}>Continuar el trabajo</div>
              <div className={styles.opcionSub}>
                La IA construye el Ciclo {proximoCiclo} con la memoria del ciclo anterior — recomienda partiendo de lo que ya conocen de {data.hijo.nombre}.
              </div>
            </div>
            <div className={styles.radio} aria-hidden="true">
              <span className={styles.radioDot} />
            </div>
          </button>

          <button
            className={`${styles.opcion} ${seleccion === 'independiente' ? styles.opcionSel : ''}`}
            onClick={() => setSeleccion('independiente')}
          >
            <div className={styles.opcionIco}><RotateCcw size={18} /></div>
            <div className={styles.opcionTxt}>
              <div className={styles.opcionTtl}>Ciclo independiente</div>
              {/* Copy de la Corrección 1: aclara que NO crea estrategia nueva */}
              <div className={styles.opcionSub}>
                Empezar un ciclo nuevo desde cero, sin arrastrar lo del ciclo anterior. Sigue dentro de la misma estrategia, pero la IA parte fresca.
              </div>
            </div>
            <div className={styles.radio} aria-hidden="true">
              <span className={styles.radioDot} />
            </div>
          </button>
        </div>

        {!data.ciclo_anterior.tiene_analisis && (
          <p className={styles.note}>
            Al no haber análisis del ciclo anterior, sólo puedes empezar uno independiente.
          </p>
        )}

        <button
          className={styles.confirmar}
          onClick={confirmar}
          disabled={!seleccion}
        >
          Empezar Ciclo {proximoCiclo}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
