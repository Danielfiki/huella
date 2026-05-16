import React, { useState } from 'react';
import Pantalla1Lista from './Pantalla1_Lista';
import Pantalla2Detalle from './Pantalla2_Detalle';
import Pantalla3Cierre from './Pantalla3_Cierre';
import Pantalla4ModalCiclo2 from './Pantalla4_ModalCiclo2';
import Pantalla5PDF from './Pantalla5_PDF';
import Pantalla6PanelDescanso from './Pantalla6_PanelDescanso';
import styles from './MockupViewer.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Visor temporal de los 6 mockups del rediseño "Estrategias con Ciclos".
// Ruta: /mockups (pública). Sirve para previsualización visual durante la
// revisión. SE BORRA al terminar.
// ────────────────────────────────────────────────────────────────────────────

const PANTALLAS = [
  { id: 'p1', label: 'P1 · Lista',         Component: Pantalla1Lista },
  { id: 'p2', label: 'P2 · Detalle ciclo', Component: Pantalla2Detalle },
  { id: 'p3', label: 'P3 · Cierre ciclo',  Component: Pantalla3Cierre },
  { id: 'p4', label: 'P4 · Modal Ciclo 2', Component: Pantalla4ModalCiclo2 },
  { id: 'p5', label: 'P5 · PDF',           Component: Pantalla5PDF },
  { id: 'p6', label: 'P6 · Panel descanso',Component: Pantalla6PanelDescanso },
];

export default function MockupViewer() {
  const [activo, setActivo] = useState('p1');
  const current = PANTALLAS.find((p) => p.id === activo) || PANTALLAS[0];
  const Current = current.Component;

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.brand}>
            <span className={styles.brandTag}>MOCKUPS</span>
            <span className={styles.brandTtl}>Estrategias con Ciclos</span>
          </div>
          <nav className={styles.nav}>
            {PANTALLAS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivo(p.id)}
                className={`${styles.btn} ${p.id === activo ? styles.btnActive : ''}`}
              >
                {p.label}
              </button>
            ))}
          </nav>
          <div className={styles.currentLbl}>
            <span className={styles.currentLblTag}>Viendo:</span> {current.label}
          </div>
        </div>
      </header>

      <main className={styles.stage}>
        <Current />
      </main>
    </div>
  );
}
