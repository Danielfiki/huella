import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { supabase } from '../../services/supabase';
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

  const semanas = plan.semanas || []; // array ordenado [{numero, titulo, descripcion, tareas, reflexion}]
  const actual = plan.semana_actual || 1;

  const onAvanzar = async () => {
    const semIdx = actual - 1;
    const esUltima = actual === plan.total_semanas;
    // 1) guardar reflexión
    await supabase.from('estrategia_semanas').update({
      reflexion,
      completada_at: new Date().toISOString(),
    }).eq('plan_id', plan.id).eq('numero', actual);
    // 2) avanzar plan o completarlo
    const upd = esUltima
      ? { completado_at: new Date().toISOString() }
      : { semana_actual: actual + 1 };
    await supabase.from('estrategias').update(upd).eq('id', plan.id);
    dispatch({ type: 'ESTRATEGIA_AVANZADA', plan_id: plan.id, ...upd, reflexion, semana_completada: actual });
    setReflexion('');
  };

  return (
    <div className={styles.page}>
      <HeaderMocha
        titulo={plan.habilidad_nombre}
        onBack={() => navigate('/estrategias')}
        progreso={{ actual, total: plan.total_semanas || 4 }}
        episodiosOrigen={plan.episodios_detonantes}
      />

      <div className={styles.body}>
        {estado === 'completado' && <BannerCompletado plan={plan} hijoNombre={hijo?.nombre} />}

        {/* Semanas pasadas (chips compactos) */}
        {semanas.filter((s) => s.numero < actual && estado === 'activo').map((s) => (
          <SemanaPasada key={s.numero} numero={s.numero} semana={s} />
        ))}

        {/* Semana activa (solo si estado='activo') */}
        {estado === 'activo' && semanas[actual - 1] && (
          <SemanaActiva
            semana={semanas[actual - 1]}
            numero={actual}
            total={plan.total_semanas || 4}
            reflexion={reflexion}
            onReflexionChange={setReflexion}
            onAvanzar={onAvanzar}
          />
        )}

        {/* Semanas futuras */}
        {estado === 'activo' && semanas.filter((s) => s.numero > actual).map((s) => (
          <SemanaFutura key={s.numero} numero={s.numero} titulo={s.titulo} />
        ))}

        {/* Si está completado/abandonado: mostrar todas las semanas como pasadas */}
        {estado !== 'activo' && semanas.map((s) => (
          <SemanaPasada key={s.numero} numero={s.numero} semana={s} />
        ))}
      </div>
    </div>
  );
}
