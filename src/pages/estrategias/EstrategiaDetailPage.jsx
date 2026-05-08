import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { supabase } from '../../lib/supabase';
import HeaderMocha from './components/HeaderMocha';
import SemanaActiva from './components/SemanaActiva';
import SemanaPasada from './components/SemanaPasada';
import SemanaFutura from './components/SemanaFutura';
import BannerCompletado from './components/BannerCompletado';
import { estadoPlan } from './helpers';
import styles from './EstrategiaDetailPage.module.css';

export default function EstrategiaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useHuella();
  const plan = (state.estrategias || []).find((p) => p.id === id);
  const hijo = state.hijo;
  const [reflexion, setReflexion] = useState('');

  const estado = useMemo(() => plan && estadoPlan(plan), [plan]);

  if (!plan) return <div className={styles.loading}>Cargando…</div>;

  // plan.plan es el JSONB guardado (porQueImporta, semanas[])
  const semanas = plan.plan?.semanas || [];
  const actual = plan.semana_actual || 1;

  // Merge reflexiones desde el array checkins
  const checkins = Array.isArray(plan.checkins) ? plan.checkins : [];
  const semanasConReflexion = semanas.map((s) => {
    const ck = checkins.find((c) => c.semana_numero === s.numero);
    return { ...s, reflexion: ck?.reflexion || '' };
  });

  // Episodios detonantes para el header
  const episodiosDetonantes = useMemo(() => {
    if (plan.episodios_detonantes?.length) return plan.episodios_detonantes;
    const ids = plan.episodios_detonantes_ids || [];
    return ids
      .map((eid) => (state.episodios || []).find((e) => e.id === eid))
      .filter(Boolean)
      .map((e) => ({
        id: e.id,
        titulo: e.descripcionLibre?.slice(0, 40) || e.tipo || 'Momento',
        emoji: '·',
      }));
  }, [plan, state.episodios]);

  const onToggleTarea = async (tareaId) => {
    const idx = actual - 1;
    const semanaObj = plan.plan?.semanas?.[idx];
    if (!semanaObj) return;
    const updatedTareas = (semanaObj.tareas || []).map((t) =>
      t.id === tareaId ? { ...t, completada: !t.completada } : t
    );
    const updatedSemanas = (plan.plan.semanas || []).map((s, i) =>
      i === idx ? { ...s, tareas: updatedTareas } : s
    );
    const updatedPlan = { ...plan.plan, semanas: updatedSemanas };
    await supabase.from('estrategias').update({ plan: updatedPlan }).eq('id', plan.id);
    dispatch({ type: 'UPDATE_ESTRATEGIA', payload: { id: plan.id, plan: updatedPlan } });
  };

  const onAvanzar = async () => {
    const esUltima = actual === (plan.total_semanas || 4);
    const newCheckin = {
      semana_numero: actual,
      reflexion,
      completada_at: new Date().toISOString(),
    };
    const newCheckins = [...checkins, newCheckin];

    const upd = esUltima
      ? { completado_at: new Date().toISOString(), checkins: newCheckins }
      : { semana_actual: actual + 1, checkins: newCheckins };

    await supabase.from('estrategias').update(upd).eq('id', plan.id);
    dispatch({
      type: 'ESTRATEGIA_AVANZADA',
      plan_id: plan.id,
      ...upd,
      semana_completada: actual,
      reflexion,
    });
    setReflexion('');
  };

  return (
    <div className={styles.page}>
      <HeaderMocha
        titulo={plan.habilidad_nombre || plan.habilidad}
        onBack={() => navigate('/estrategias')}
        progreso={{ actual, total: plan.total_semanas || 4 }}
        episodiosOrigen={episodiosDetonantes}
      />

      <div className={styles.body}>
        {estado === 'completado' && <BannerCompletado plan={plan} hijoNombre={hijo?.nombre} />}

        {semanasConReflexion.filter((s) => s.numero < actual && estado === 'activo').map((s) => (
          <SemanaPasada key={s.numero} numero={s.numero} semana={s} />
        ))}

        {estado === 'activo' && semanasConReflexion[actual - 1] && (
          <SemanaActiva
            semana={semanasConReflexion[actual - 1]}
            numero={actual}
            total={plan.total_semanas || 4}
            reflexion={reflexion}
            onReflexionChange={setReflexion}
            onAvanzar={onAvanzar}
            onToggleTarea={onToggleTarea}
          />
        )}

        {estado === 'activo' && semanasConReflexion.filter((s) => s.numero > actual).map((s) => (
          <SemanaFutura key={s.numero} numero={s.numero} titulo={s.titulo} />
        ))}

        {estado !== 'activo' && semanasConReflexion.map((s) => (
          <SemanaPasada key={s.numero} numero={s.numero} semana={s} />
        ))}
      </div>
    </div>
  );
}
