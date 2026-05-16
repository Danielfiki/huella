// DetalleView.jsx — detalle del plan con anclaje permanente del episodio-origen.
import React, { useState } from 'react';
import HeaderMocha from '../components/HeaderMocha';
import SemanaActiva from '../components/SemanaActiva';
import SemanaPasada from '../components/SemanaPasada';
import SemanaFutura from '../components/SemanaFutura';
import styles from './DetalleView.module.css';

export default function DetalleView({ plan, onAvanzar, onVolver }) {
  const [reflexion, setReflexion] = useState('');
  const semanaActual = plan.semana_actual || 1;
  const total = plan.total_semanas || 4;

  return (
    <>
      <HeaderMocha
        titulo={plan.habilidad_nombre}
        onBack={onVolver}
        progreso={{ actual: semanaActual, total }}
        episodiosOrigen={plan.episodios_detonantes || []}
      />

      <div className={styles.body}>
        <SemanaActiva
          semana={plan.semanas[semanaActual - 1]}
          numero={semanaActual}
          total={total}
          reflexion={reflexion}
          onReflexionChange={setReflexion}
          onAvanzar={() => onAvanzar(plan, reflexion)}
        />

        <section>
          <header className={styles.secH}>
            <span className={styles.ttl}>Otras semanas</span>
            <span className={styles.line} />
          </header>
          {plan.semanas.map((s, idx) => {
            if (idx === semanaActual - 1) return null;
            const num = idx + 1;
            if (num < semanaActual) {
              return <SemanaPasada key={num} numero={num} semana={s} />;
            }
            return <SemanaFutura key={num} numero={num} titulo={s.titulo} />;
          })}
        </section>
      </div>
    </>
  );
}
