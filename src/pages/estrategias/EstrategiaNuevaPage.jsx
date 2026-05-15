import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { generarEstrategia } from '../../services/anthropic';
import { retryAsync, esErrorIAReintentable } from '../../utils/retryAsync';
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
  const { state, crearEstrategiaConCiclo, reloadEstrategias } = useHuella();
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
  const [capError, setCapError] = useState('');
  const generando = useRef(false);

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

  // Fase 4 Bloque 2C: cierra el ciclo activo del plan que se abandona
  // en el modelo de ciclos. La creación del nuevo plan la hace
  // generar() (ya migrado en Bloque 2A). Caso 2 de la migración:
  // estado solo admite 'activo'/'cerrado', así que el motivo
  // "abandonado" se guarda en cierre_analisis (jsonb).
  const abandonarPlanYCrear = async (id) => {
    setAbandonandoId(id);
    setCapError('');
    try {
      const planViejo = (state.estrategias || []).find((p) => p.id === id);
      const cicloActivo = (planViejo?.ciclos || []).find((c) => c.estado === 'activo');
      if (!cicloActivo) {
        console.error('abandonarPlanYCrear: sin ciclo activo', id);
        setCapError('No pudimos cerrar tu plan actual. Recarga la app e inténtalo de nuevo.');
        setAbandonandoId(null);
        return;
      }

      const { error: dbErr } = await supabase
        .from('estrategia_ciclos')
        .update({
          estado: 'cerrado',
          fecha_cierre: new Date().toISOString().slice(0, 10),
          cierre_analisis: { motivo: 'abandonado', abandonado_at: new Date().toISOString() },
        })
        .eq('id', cicloActivo.id)
        .eq('estado', 'activo');
      if (dbErr) throw new Error(dbErr.message);

      setShowCapModal(false);
      generar();
    } catch {
      setCapError('No pudimos cerrar tu plan actual. Inténtalo de nuevo.');
    } finally {
      setAbandonandoId(null);
    }
  };

  const generar = async () => {
    if (generando.current) return;
    generando.current = true;
    setEstado('generando');
    setPasoActual(0);
    try {
      setPasoActual(1);
      // generarEstrategia espera { hijo, habilidad, descripcion }.
      // Retry silencioso (2 reintentos, backoff 1s/2s) solo para
      // errores transitorios de red/timeout/5xx. El papá no ve nada
      // distinto: el loader sigue rotando.
      const planBase = await retryAsync(
        () => generarEstrategia({
          hijo,
          habilidad: habilidad.label,
          descripcion: contextoExtra || '',
        }),
        { esReintentable: esErrorIAReintentable }
      );
      if (!planBase || typeof planBase !== 'object' || !Array.isArray(planBase.semanas) || planBase.semanas.length === 0) {
        throw new Error('El plan no se generó correctamente. Intenta de nuevo.');
      }
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

      // Fase 4 Bloque 2A: dual insert (identidad + ciclo 1) vía helper del contexto.
      const row = await crearEstrategiaConCiclo({
        hijo_id:                  hijo.id,
        habilidad:                habilidad.label,
        habilidad_grupo:          habilidad.grupoNombre,
        plan:                     planData,
        episodios_detonantes_ids: episodiosIds.filter(Boolean),
      });
      await reloadEstrategias();
      navigate(`/estrategias/${row.id}`, { replace: true });
    } catch (err) {
      console.error('generar estrategia falló', err);
      setError(err.message || 'Algo falló al generar el plan.');
      setEstado('error');
    } finally {
      generando.current = false;
    }
  };

  if (estado === 'generando') {
    return (
      <div className={styles.page}>
        <HeaderMocha titulo="Creando tu plan" onBack={() => navigate(-1)} />
        <div className={styles.body}>
          <LoadingDignificado
            titulo="Estamos armando tu plan."
            sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
            pasos={PASOS_LOADING}
            pasoActual={pasoActual}
            habilidadId={habilidad.id}
            hijoEdad={hijo?.edad}
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

        <Button className={styles.cta} onClick={iniciarCreacion}>Empecemos juntos</Button>
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
            {capError && <p className={styles.modalErr}>{capError}</p>}
            <button className={styles.modalCancel} onClick={() => setShowCapModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
