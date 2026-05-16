// ListaView.jsx — vista principal. Renderiza las dos puertas + activa + drawer.
import React, { useState } from 'react';
import HeaderMocha from '../components/HeaderMocha';
import EstrategiaActivaCard from '../components/EstrategiaActivaCard';
import SugerenciaIACard from '../components/SugerenciaIACard';
import EmptyPuerta1 from '../components/EmptyPuerta1';
import SelectorHabilidades from '../components/SelectorHabilidades';
import DrawerPasados from '../components/DrawerPasados';
import BannerCompletado from '../components/BannerCompletado';
import { estadoPlan } from '../helpers';
import styles from './ListaView.module.css';

export default function ListaView({
  hijo,
  planActivo,
  sugerencias,
  episodios,
  planesPasados,
  onCerrarSugerencia,
  onAceptarSugerencia,
  onAbrirActivo,
  onIrCrear,
}) {
  // banner completado: cuando el plan completado es de hoy o la última semana, lo destacamos en lista
  const recienCompletado = planesPasados.find((p) => esRecienCompletado(p));
  const tienePatron = sugerencias.length > 0;
  const stats = {
    habilidades: planesPasados.filter((p) => estadoPlan(p) === 'completado').length + (planActivo ? 1 : 0),
    semanas: planesPasados.reduce((acc, p) => acc + (p.semana_actual || 0), 0) + (planActivo?.semana_actual || 0),
  };

  return (
    <>
      <HeaderMocha
        titulo="Estrategias"
        stats={planActivo || planesPasados.length ? stats : null}
        clinical={
          planActivo || planesPasados.length
            ? `Tus planes se construyen con ${episodios.length} momentos registrados.`
            : 'Aún no hay un plan en marcha. Empieza por donde te haga sentido.'
        }
      />

      <div className={styles.body}>
        {recienCompletado && (
          <BannerCompletado plan={recienCompletado} hijoNombre={hijo?.nombre} />
        )}

        {planActivo && (
          <Section titulo="Lo que estás trabajando">
            <EstrategiaActivaCard
              plan={planActivo}
              hijo={hijo}
              onAbrir={() => onAbrirActivo(planActivo)}
            />
          </Section>
        )}

        <Section titulo={tienePatron ? 'Patrones recientes' : 'Patrones recientes'} meta="Puerta 1 · IA">
          {tienePatron
            ? sugerencias.map((s) => (
                <SugerenciaIACard
                  key={s.id}
                  sugerencia={s}
                  onAceptar={() => onAceptarSugerencia(s)}
                  onCerrar={() => onCerrarSugerencia(s)}
                />
              ))
            : <EmptyPuerta1 totalEpisodios={episodios.length} />
          }
        </Section>

        <Section
          titulo={planActivo ? '¿Quieres trabajar otra cosa?' : '¿Qué quieres trabajar?'}
          meta="Puerta 2"
        >
          <SelectorHabilidades onElegir={(habilidadId) => onIrCrear(habilidadId)} />
        </Section>

        {planesPasados.length > 0 && (
          <DrawerPasados planes={planesPasados} />
        )}
      </div>
    </>
  );
}

function Section({ titulo, meta, children }) {
  return (
    <section>
      <header className={styles.secH}>
        <span className={styles.ttl}>{titulo}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
        <span className={styles.line} />
      </header>
      {children}
    </section>
  );
}

function esRecienCompletado(plan) {
  if (estadoPlan(plan) !== 'completado') return false;
  if (!plan.completado_at) return false;
  const dias = (Date.now() - new Date(plan.completado_at).getTime()) / (1000 * 60 * 60 * 24);
  return dias < 2;
}
