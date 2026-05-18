import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { generarTareas } from '../../services/anthropic';
import HeaderMocha from './components/HeaderMocha';
import SemanaActiva from './components/SemanaActiva';
import SemanaPasada from './components/SemanaPasada';
import SemanaFutura from './components/SemanaFutura';
import BannerCompletado from './components/BannerCompletado';
import MapaCiclo from './components/MapaCiclo';
import StatsPlan from './components/StatsPlan';
import { estadoPlan } from './helpers';
import styles from './EstrategiaDetailPage.module.css';

export default function EstrategiaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, addHito, reloadEstrategias, deleteEstrategia } = useHuella();
  const { user } = useAuth();
  const plan = (state.estrategias || []).find((p) => p.id === id);
  const hijo = state.hijo;
  const [reflexion, setReflexion] = useState('');
  const [generandoTareas, setGenerandoTareas] = useState(false);
  const [avanzando, setAvanzando] = useState(false);
  const [avanzarErr, setAvanzarErr] = useState('');
  const [tareaKey, setTareaKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [eliminarErr, setEliminarErr] = useState('');

  const estado = useMemo(() => plan && estadoPlan(plan), [plan]);

  if (!plan) return <div className={styles.loading}>Cargando…</div>;

  // plan.plan es el JSONB guardado (porQueImporta, semanas[])
  const semanas = plan.plan?.semanas || [];
  const actual = plan.semana_actual || 1;
  const total = plan.total_semanas || 4;
  const ciclo = plan.numero_ciclo_actual || 1;
  const esActivo = estado === 'activo';

  // Merge reflexiones desde el array checkins
  const checkins = Array.isArray(plan.checkins) ? plan.checkins : [];
  const semanasConReflexion = semanas.map((s) => {
    const ck = checkins.find((c) => c.semana_numero === s.numero);
    return { ...s, reflexion: ck?.reflexion || '' };
  });

  const episodiosDurante = useMemo(() => {
    if (!plan.fecha_inicio) return null;
    const inicio = new Date(plan.fecha_inicio);
    const fin = plan.completado_at ? new Date(plan.completado_at) : new Date();
    const count = (state.episodios || []).filter((e) => {
      const f = new Date(e.fecha);
      return f >= inicio && f <= fin;
    }).length;
    return count > 0 ? count : null;
  }, [plan.fecha_inicio, plan.completado_at, state.episodios]);

  // Fase 4 Bloque 2B: las escrituras van al ciclo activo en
  // estrategia_ciclos, no a columnas legacy de estrategias.
  // Guard: si no hay ciclo activo (no debería pasar tras 2A), se
  // loguea y se retorna sin escribir. Refuerzo: el UPDATE filtra
  // además por estado='activo' para no escribir sobre un ciclo que
  // cambió de estado entre el guard y la escritura (race cross-tab).
  const getCicloActivo = () =>
    (plan.ciclos || []).find((c) => c.estado === 'activo') || null;

  const onGenerarTareas = async () => {
    const cicloActivo = getCicloActivo();
    if (!cicloActivo) {
      console.error('onGenerarTareas: sin ciclo activo', plan.id);
      return;
    }
    setGenerandoTareas(true);
    try {
      const result = await generarTareas({
        hijo,
        habilidad: plan.habilidad_nombre || plan.habilidad,
        descripcion: plan.descripcion,
      });
      if (!result) return;
      const updatedSemanas = (plan.plan?.semanas || []).map((s, i) => ({
        ...s,
        tareas: result[(i + 1).toString()] || [],
      }));
      const updatedPlan = { ...plan.plan, semanas: updatedSemanas };
      await supabase
        .from('estrategia_ciclos')
        .update({ plan: updatedPlan })
        .eq('id', cicloActivo.id)
        .eq('estado', 'activo');
      dispatch({ type: 'UPDATE_ESTRATEGIA', payload: { id: plan.id, plan: updatedPlan } });
    } catch (e) {
      console.error('generarTareas falló', e);
    } finally {
      setGenerandoTareas(false);
    }
  };

  const onToggleTarea = async (tareaId) => {
    const cicloActivo = getCicloActivo();
    if (!cicloActivo) {
      console.error('onToggleTarea: sin ciclo activo', plan.id);
      return;
    }
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
    dispatch({ type: 'UPDATE_ESTRATEGIA', payload: { id: plan.id, plan: updatedPlan } });
    const { error: dbErr } = await supabase
      .from('estrategia_ciclos')
      .update({ plan: updatedPlan })
      .eq('id', cicloActivo.id)
      .eq('estado', 'activo');
    if (dbErr) {
      // Rollback optimista: el check vuelve a su estado anterior, lo
      // que da feedback visual implícito de que el guardado falló.
      dispatch({ type: 'UPDATE_ESTRATEGIA', payload: { id: plan.id, plan: plan.plan } });
      setTareaKey((k) => k + 1);
    }
  };

  const onAvanzar = async () => {
    if (avanzando) return;
    const cicloActivo = getCicloActivo();
    if (!cicloActivo) {
      console.error('onAvanzar: sin ciclo activo', plan.id);
      setAvanzarErr('No se pudo guardar. Recarga la app e intenta de nuevo.');
      return;
    }
    setAvanzando(true);
    setAvanzarErr('');

    const dur = cicloActivo.duracion_semanas ?? plan.total_semanas ?? 4;
    const esUltima = actual + 1 > dur;
    const numeroCicloCerrado = cicloActivo.numero_ciclo;
    const newCheckin = {
      semana_numero: actual,
      reflexion,
      completada_at: new Date().toISOString(),
    };
    const newCheckins = [...checkins, newCheckin];

    const upd = esUltima
      ? {
          estado: 'cerrado',
          fecha_cierre: new Date().toISOString().slice(0, 10),
          semana_actual: dur,
          checkins_legacy: newCheckins,
        }
      : { semana_actual: actual + 1, checkins_legacy: newCheckins };

    try {
      const { error: dbErr } = await supabase
        .from('estrategia_ciclos')
        .update(upd)
        .eq('id', cicloActivo.id)
        .eq('estado', 'activo');
      if (dbErr) throw new Error(dbErr.message);

      if (esUltima && reflexion.trim()) {
        try {
          await addHito({
            id: Date.now().toString(),
            categoria: 'otro',
            descripcion: `Plan completado: "${plan.habilidad_nombre || plan.habilidad}" (${dur} semanas). Reflexión final: ${reflexion.trim()}`,
            fecha: new Date().toISOString(),
          });
        } catch { /* hito es no-crítico — el plan se completó igual */ }
      }

      setReflexion('');
      await reloadEstrategias();
      if (esUltima) {
        navigate(`/estrategias/${id}/cierre/${numeroCicloCerrado}`);
      }
    } catch {
      setAvanzarErr('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setAvanzando(false);
    }
  };

  const handleEliminarPlan = async () => {
    if (eliminando) return;
    setEliminando(true);
    setEliminarErr('');
    try {
      await deleteEstrategia(plan.id);
      navigate('/estrategias');
    } catch {
      setEliminando(false);
      setEliminarErr('No se pudo eliminar el plan. Verifica tu conexión e intenta de nuevo.');
    }
  };

  return (
    <div className={styles.page}>
      <HeaderMocha
        titulo={plan.habilidad_nombre || plan.habilidad}
        onBack={() => navigate('/estrategias')}
        cicloNumero={plan.numero_ciclo_actual}
        progreso={(() => {
          const dur = plan.total_semanas || 4;
          if (estado === 'completado') {
            return { actual: dur, total: dur, variante: 'completado', label: `Plan completado · ${dur} ${dur === 1 ? 'semana' : 'semanas'}` };
          }
          if (estado === 'abandonado') {
            const n = plan.semana_actual || 1;
            return { actual: n, total: dur, variante: 'abandonado', label: `Abandonado en semana ${n}` };
          }
          return { actual, total: dur };
        })()}
      />

      <div className={styles.body}>
        {estado === 'completado' && (
          <BannerCompletado plan={plan} hijoNombre={hijo?.nombre} episodiosDurante={episodiosDurante} />
        )}

        <MapaCiclo
          semanaActual={actual}
          totalSemanas={total}
          ciclo={ciclo}
          estado={estado}
          tituloActivo={semanasConReflexion[actual - 1]?.titulo || semanasConReflexion[actual - 1]?.nombre || ''}
          completadoAt={plan.completado_at}
        />

        <StatsPlan plan={plan} semanas={semanasConReflexion} estado={estado} episodiosDurante={episodiosDurante} />

        <section className={styles.section}>
          <header className={styles.secHead}>
            <span className={styles.secTitle}>
              {esActivo ? 'Semanas del ciclo' : 'Releer el ciclo'}
            </span>
            <span className={styles.secLine} />
          </header>
          <div className={styles.stack}>
            {semanasConReflexion.map((s, idx) => {
              const numero = idx + 1;
              const titulo = s.titulo || s.nombre || `Semana ${numero}`;
              if (esActivo) {
                if (numero < actual) return <SemanaPasada key={numero} numero={numero} semana={s} />;
                if (numero === actual) return (
                  <SemanaActiva
                    key={numero}
                    semana={s}
                    numero={numero}
                    total={total}
                    reflexion={reflexion}
                    onReflexionChange={setReflexion}
                    onAvanzar={onAvanzar}
                    onToggleTarea={onToggleTarea}
                    onGenerarTareas={onGenerarTareas}
                    generandoTareas={generandoTareas}
                    avanzando={avanzando}
                    errMsg={avanzarErr}
                  />
                );
                return <SemanaFutura key={numero} numero={numero} titulo={titulo} esUltima={numero === total} />;
              }
              return (
                <SemanaPasada
                  key={numero}
                  numero={numero}
                  semana={s}
                  esCierre={numero === total}
                  defaultOpen={numero === total}
                />
              );
            })}
          </div>
        </section>

        <div className={styles.dangerZone}>
          <button
            type="button"
            className={styles.eliminarLink}
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar este plan
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => !eliminando && setConfirmDelete(false)}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTtl}>¿Eliminar este plan?</p>
            <p className={styles.modalSub}>Esta acción no se puede deshacer.</p>
            {eliminarErr && <p className={styles.modalErr}>{eliminarErr}</p>}
            <div className={styles.modalBtns}>
              <button
                className={styles.modalCancel}
                onClick={() => setConfirmDelete(false)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                className={styles.modalDanger}
                onClick={handleEliminarPlan}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
