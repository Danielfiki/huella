import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { useAuth } from '../../context/AuthContext';
import { generarEstrategia } from '../../services/anthropic';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import HeaderMocha from './components/HeaderMocha';
import LoadingDignificado from './components/LoadingDignificado';
import { HABILIDADES_CATALOGO, CONTEXTOS_HABILIDAD, MAX_PLANES_ACTIVOS_FREE, estadoPlan } from './helpers';
import styles from './EstrategiaNuevaPage.module.css';

const PASOS_LOADING = [
  'Leyendo lo que registraste',
  'Buscando bibliografía pediátrica',
  'Adaptando a la edad de tu hijo',
  'Escribiendo tu plan personalizado',
];

export default function EstrategiaNuevaPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useHuella();
  const { user } = useAuth();
  const hijo = state.hijo;

  const habilidadId = params.get('habilidad');
  const episodiosIds = (params.get('episodios') || '').split(',').filter(Boolean);
  const episodiosDetonantes = (state.episodios || []).filter((e) => episodiosIds.includes(e.id));

  const habilidad = (() => {
    for (const grupo of Object.values(HABILIDADES_CATALOGO)) {
      const it = grupo.items.find((x) => x.id === habilidadId);
      if (it) return { ...it, grupoNombre: grupo.nombre };
    }
    return { id: habilidadId || 'otra', label: habilidadId || 'Habilidad personalizada', emoji: '·', grupoNombre: 'Otra' };
  })();

  const contextoHabilidad = CONTEXTOS_HABILIDAD[habilidad.id] || null;

  const [contextoExtra, setContextoExtra] = useState('');
  const [estado, setEstado] = useState('paso-1-confirmar');
  const [pasoActual, setPasoActual] = useState(0);
  const [error, setError] = useState(null);
  const [showCapModal, setShowCapModal] = useState(false);
  const [planesActivosCap, setPlanesActivosCap] = useState([]);
  const [abandonandoId, setAbandonandoId] = useState(null);

  const iniciarCreacion = () => {
    const activos = (state.estrategias || []).filter(
      (p) => p.hijo_id === hijo?.id && estadoPlan(p) === 'activo'
    );
    if (activos.length >= MAX_PLANES_ACTIVOS_FREE) {
      setPlanesActivosCap(activos);
      setShowCapModal(true);
      return;
    }
    generar();
  };

  const abandonarPlanYCrear = async (id) => {
    setAbandonandoId(id);
    try {
      const abandonado_at = new Date().toISOString();
      await supabase.from('estrategias').update({ abandonado_at }).eq('id', id);
      dispatch({ type: 'UPDATE_ESTRATEGIA', payload: { id, abandonado_at } });
      setShowCapModal(false);
      generar();
    } finally {
      setAbandonandoId(null);
    }
  };

  const generar = async () => {
    setEstado('generando');
    setPasoActual(0);
    try {
      setPasoActual(1);
      // generarEstrategia espera { hijo, habilidad, descripcion }
      const planBase = await generarEstrategia({
        hijo,
        habilidad: habilidad.label,
        descripcion: contextoExtra || '',
      });
      setPasoActual(2);

      // Normalizar semanas: mapear tareas de string[] a {id, texto, completada}
      // y renombrar 'accion' → 'descripcion' para los componentes de semana
      const planData = {
        ...planBase,
        semanas: (planBase?.semanas || []).map((s, si) => ({
          numero: s.numero ?? si + 1,
          titulo: s.titulo || '',
          descripcion: s.accion || s.descripcion || '',
          tareas: (s.tareas || []).map((t, ti) =>
            typeof t === 'string'
              ? { id: `s${si + 1}t${ti + 1}`, texto: t, completada: false }
              : t
          ),
        })),
      };
      setPasoActual(3);

      const { data: row, error: insertErr } = await supabase
        .from('estrategias')
        .insert({
          user_id: user.id,
          hijo_id: hijo.id,
          habilidad: habilidad.label,
          habilidad_grupo: habilidad.grupoNombre,
          total_semanas: planData.semanas.length || 4,
          semana_actual: 1,
          plan: planData,
          episodios_detonantes_ids: episodiosIds.filter(Boolean),
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // Construir objeto en formato app-state para dispatch
      const nuevoPlan = {
        id: row.id,
        hijo_id: hijo.id,
        habilidad: habilidad.label,
        habilidad_nombre: habilidad.label,
        habilidad_grupo: habilidad.grupoNombre,
        plan: planData,
        checkins: [],
        semana_actual: 1,
        semanaActual: 1,
        total_semanas: planData.semanas.length || 4,
        completado_at: null,
        abandonado_at: null,
        episodios_detonantes_ids: episodiosIds.filter(Boolean),
        episodios_detonantes: episodiosDetonantes.map((e) => ({
          id: e.id,
          titulo: e.descripcionLibre?.slice(0, 40) || e.tipo || 'Momento',
          emoji: '·',
          categoria: 'rutina',
        })),
        created_at: row.created_at,
        fecha_inicio: row.fecha_inicio,
        fechaInicio: row.fecha_inicio,
      };

      dispatch({ type: 'ESTRATEGIA_CREADA', plan: nuevoPlan });
      navigate(`/estrategias/${row.id}`, { replace: true });
    } catch (err) {
      console.error('generar estrategia falló', err);
      setError(err.message || 'Algo falló al generar el plan.');
      setEstado('error');
    }
  };

  if (estado === 'generando') {
    return (
      <div className={styles.page}>
        <HeaderMocha titulo="Creando tu plan" onBack={() => navigate(-1)} />
        <div className={styles.body}>
          <LoadingDignificado
            titulo="Estamos armando tu plan."
            sub="Tarda menos de un minuto. Puedes cerrar la app — te avisamos cuando esté listo."
            pasos={PASOS_LOADING}
            pasoActual={pasoActual}
          />
        </div>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className={styles.page}>
        <HeaderMocha titulo="Algo falló" onBack={() => navigate('/estrategias')} />
        <div className={styles.body}>
          <div className={styles.err}>
            <p>{error}</p>
            <Button onClick={generar}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <HeaderMocha titulo="Empezar plan" onBack={() => navigate('/estrategias')} />
      <div className={styles.body}>
        <div className={styles.hero}>
          <div className={styles.eye}>Vamos a trabajar</div>
          <h2 className={styles.ttl}>{habilidad.label}</h2>
          {contextoHabilidad && <p className={styles.ctx}>{contextoHabilidad}</p>}
          <p className={styles.sub}>Para {hijo?.nombre} · {hijo?.edad} años</p>
          {episodiosDetonantes.length > 0 && (
            <div className={styles.epList}>
              <div className={styles.epLbl}>Basado en lo que registraste</div>
              {episodiosDetonantes.slice(0, 3).map((e) => (
                <div key={e.id} className={styles.ep}>
                  <span className={styles.emo}>·</span>
                  <span className={styles.epTtl}>{e.descripcionLibre?.slice(0, 50) || e.tipo}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className={styles.lbl}>
          <span>¿Algo más que quieres que tengamos en cuenta? <em>(opcional)</em></span>
          <textarea
            placeholder="Ej: 'esto pasa más a la noche', 'tiene un hermano de 6 años'…"
            value={contextoExtra}
            onChange={(e) => setContextoExtra(e.target.value)}
          />
        </label>

        <Button className={styles.cta} onClick={iniciarCreacion}>Generar mi plan</Button>
      </div>

      {showCapModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCapModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTtl}>Tienes {MAX_PLANES_ACTIVOS_FREE} planes activos</p>
            <p className={styles.modalSub}>Límite del plan Explorador. ¿Cuál quieres cerrar para empezar este nuevo?</p>
            <div className={styles.modalPlanes}>
              {planesActivosCap.map((p) => (
                <button
                  key={p.id}
                  className={styles.modalPlanBtn}
                  onClick={() => abandonarPlanYCrear(p.id)}
                  disabled={!!abandonandoId}
                >
                  {abandonandoId === p.id ? 'Cerrando…' : (p.habilidad_nombre || p.habilidad)}
                </button>
              ))}
            </div>
            <button className={styles.modalCancel} onClick={() => setShowCapModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
