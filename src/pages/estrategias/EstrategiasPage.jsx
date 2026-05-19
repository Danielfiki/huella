import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { useAuth } from '../../context/AuthContext';
import { detectarPatronesEstructurado, generarEstrategiaDesdeContexto } from '../../services/anthropic';
import { retryAsync, esErrorIAReintentable } from '../../utils/retryAsync';
import { supabase } from '../../lib/supabase';
import HeaderMocha from './components/HeaderMocha';
import EstrategiaActivaCard from './components/EstrategiaActivaCard';
import PuertaUnoHallazgo from '../../components/estrategias/puerta1/PuertaUnoHallazgo';
import PuertaUnoEmpty from '../../components/estrategias/puerta1/PuertaUnoEmpty';
import PuertaUnoLoading from '../../components/estrategias/puerta1/PuertaUnoLoading';
import SelectorHabilidades from './components/SelectorHabilidades';
import EstrategiaPasadaCard from './components/EstrategiaPasadaCard';
import LoadingDignificado from './components/LoadingDignificado';
import {
  buildSugerenciaFromInterpretacion,
  debeMostrarSugerencia,
  estadoPlan,
  MAX_PLANES_ACTIVOS_FREE,
  HABILIDADES_CATALOGO,
  ciclosAnterioresDe,
  cicloNumeroDe,
} from './helpers';
import { getAuthorDisplay } from '../../utils/authorDisplay';
import styles from './EstrategiasPage.module.css';

export default function EstrategiasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sugerenciaPrecocida = location.state?.sugerencia_precocida ?? null;
  const { state, crearEstrategiaConCiclo, reloadEstrategias, profilesByUserId } = useHuella();
  const { user } = useAuth();
  const [casoLibreEstado, setCasoLibreEstado] = useState('idle');
  const [casoLibreError, setCasoLibreError] = useState(null);
  const generandoCasoLibreRef = useRef(false);
  const hijo = state.hijo;
  const planes = state.estrategias || [];
  const episodios = state.episodios || [];

  const [sugerencia, setSugerencia] = useState(null);
  const [descartes, setDescartes] = useState([]);
  const [loadingPatrones, setLoadingPatrones] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [esNueva, setEsNueva] = useState(false);
  const sugerenciaRef = useRef(null);
  const hijoIdRef = useRef(null);

  const planesActivos = useMemo(
    () => planes.filter((p) => estadoPlan(p) === 'activo' && p.hijo_id === hijo?.id),
    [planes, hijo]
  );
  const planesPasados = useMemo(
    () => planes.filter((p) => estadoPlan(p) !== 'activo' && p.hijo_id === hijo?.id),
    [planes, hijo]
  );

  // Enriquecer todos los planes activos con episodios_detonantes computados desde IDs
  const planesActivosEnriquecidos = useMemo(() => {
    return planesActivos.map((plan) => {
      if (plan.episodios_detonantes?.length) return plan;
      const ids = plan.episodios_detonantes_ids || [];
      const detonantes = ids
        .map((id) => episodios.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => ({
          id: e.id,
          titulo: e.descripcionLibre?.slice(0, 40) || e.tipo || 'Momento',
          emoji: '·',
          categoria: 'rutina',
        }));
      return { ...plan, episodios_detonantes: detonantes };
    });
  }, [planesActivos, episodios]);

  // Habilidades que ya tienen un plan activo (para bloquear en SelectorHabilidades)
  const habilidadesEnPlanActivo = useMemo(
    () => new Set(planesActivos.map((p) => p.habilidad_nombre || p.habilidad)),
    [planesActivos]
  );

  useEffect(() => {
    if (!hijo?.id) return;
    (async () => {
      const { data } = await supabase
        .from('estrategia_sugerencias_descartadas')
        .select('*')
        .eq('hijo_id', hijo.id);
      setDescartes(data || []);
    })();
  }, [hijo?.id]);

  useEffect(() => {
    if (planesActivos.length >= MAX_PLANES_ACTIVOS_FREE) { setSugerencia(null); return; }
    if (!hijo?.id || episodios.length < 3) { setSugerencia(null); return; }

    // Si venimos del Panel con análisis ya hecho, usarlo directamente
    if (sugerenciaPrecocida) {
      const sug = buildSugerenciaFromInterpretacion(sugerenciaPrecocida, episodios);
      setSugerencia(sug);
      return;
    }

    let cancel = false;
    (async () => {
      setLoadingPatrones(true);
      try {
        const interp = await detectarPatronesEstructurado({ hijo_id: hijo.id, hijo_edad: hijo.edad, episodios });
        if (cancel) return;
        const sug = buildSugerenciaFromInterpretacion(interp, episodios);
        setSugerencia(sug);
      } catch (e) {
        console.error('detectarPatronesEstructurado falló', e);
        setSugerencia(null);
      } finally {
        if (!cancel) setLoadingPatrones(false);
      }
    })();
    return () => { cancel = true; };
  }, [hijo?.id, episodios, planesActivos, sugerenciaPrecocida]);

  // Cambio 3: habilidades que ya se están trabajando o se trabajaron en 90 días
  const habilidadesExcluidas = useMemo(() => {
    const hace90 = new Date(Date.now() - 90 * 86400000);
    return new Set(
      planes
        .filter((p) => p.hijo_id === hijo?.id)
        .filter((p) => {
          if (estadoPlan(p) === 'activo') return true;
          if (p.completado_at && new Date(p.completado_at) >= hace90) return true;
          if (p.abandonado_at && new Date(p.abandonado_at) >= hace90) return true;
          return false;
        })
        .map((p) => p.habilidad_nombre || p.habilidad)
    );
  }, [planes, hijo]);

  // Cambio 3: filtrar sugerencia si su habilidad está excluida
  const sugerenciaFiltrada = useMemo(() => {
    if (!sugerencia) return null;
    if (habilidadesExcluidas.has(sugerencia.habilidad_nombre)) return null;
    return sugerencia;
  }, [sugerencia, habilidadesExcluidas]);

  // Cambio 2: nueva lógica 7d / 5ep (usando sugerenciaFiltrada)
  const sugerenciaVisible = debeMostrarSugerencia(sugerenciaFiltrada, descartes, episodios.length);

  // sin sugerencia pero con datos suficientes: post-rechazo, filtro 90d o IA sin patrón
  const esPostRechazo = !sugerenciaVisible && episodios.length >= 5 && !loadingPatrones;

  // Cambio 5: auto-expand si sugerencia es nueva (no vista en esta sesión)
  useEffect(() => {
    if (!sugerenciaVisible || !sugerenciaFiltrada) return;
    const key = `huella_sug_${hijo?.id}`;
    const vistas = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (!vistas.includes(sugerenciaFiltrada.fingerprint)) {
      setExpanded(true);
      setEsNueva(true);
    } else {
      setExpanded(false);
      setEsNueva(false);
    }
  }, [sugerenciaVisible, sugerenciaFiltrada?.fingerprint, hijo?.id]);

  // Cambio 5: marcar como vista al desmontar (si ya se expandió alguna vez)
  useEffect(() => {
    return () => {
      if (!sugerenciaRef.current || !hijoIdRef.current) return;
      const key = `huella_sug_${hijoIdRef.current}`;
      const vistas = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!vistas.includes(sugerenciaRef.current)) {
        sessionStorage.setItem(key, JSON.stringify([...vistas, sugerenciaRef.current]));
      }
    };
  }, []);

  // Mantener refs actualizados para el cleanup del unmount
  useEffect(() => {
    sugerenciaRef.current = sugerenciaFiltrada?.fingerprint ?? null;
    hijoIdRef.current = hijo?.id ?? null;
  }, [sugerenciaFiltrada?.fingerprint, hijo?.id]);

  const handleToggle = () => {
    if (!expanded && sugerenciaFiltrada) {
      // Al expandir manualmente, marcar como vista
      const key = `huella_sug_${hijo?.id}`;
      const vistas = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!vistas.includes(sugerenciaFiltrada.fingerprint)) {
        sessionStorage.setItem(key, JSON.stringify([...vistas, sugerenciaFiltrada.fingerprint]));
      }
      setEsNueva(false);
    }
    setExpanded((v) => !v);
  };

  const onAceptarSugerencia = () => {
    const ids = sugerenciaFiltrada.episodios_detonantes.map((e) => e.id).join(',');
    navigate(`/estrategias/nuevo?habilidad=${sugerenciaFiltrada.habilidad_id}&episodios=${ids}`);
  };
  const onCerrarSugerencia = async () => {
    if (!sugerenciaFiltrada) return;
    // Cambio 2: incluir episodios_count_al_rechazar
    const reg = {
      hijo_id: hijo.id,
      fingerprint: sugerenciaFiltrada.fingerprint,
      habilidad_id: sugerenciaFiltrada.habilidad_id,
      descartada_at: new Date().toISOString(),
      episodios_count_al_rechazar: episodios.length,
    };
    setDescartes((d) => [...d, reg]);
    setSugerencia(null);
    await supabase.from('estrategia_sugerencias_descartadas').insert(reg);
  };
  const onElegirHabilidad = (hab) => {
    navigate(`/estrategias/nuevo?habilidad=${hab.id}`);
  };

  // Link sutil en Puerta 1 → lleva el foco a Puerta 2 (sección hermana).
  // Scroll suave a la sección con id="puerta-2". No navega ni abre nada.
  const onIrPuerta2 = () => {
    const el = document.getElementById('puerta-2');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCasoLibre = async (texto) => {
    if (generandoCasoLibreRef.current) return;
    if (planesActivos.length >= MAX_PLANES_ACTIVOS_FREE) {
      setCasoLibreError(`Tienes ${MAX_PLANES_ACTIVOS_FREE} planes activos. Completa o cierra uno antes de crear otro.`);
      setCasoLibreEstado('error');
      return;
    }
    generandoCasoLibreRef.current = true;
    setCasoLibreEstado('generando');
    try {
      // Retry silencioso (2 reintentos, backoff 1s/2s) solo para
      // errores transitorios de red/timeout/5xx. Transparente al papá.
      const planBase = await retryAsync(
        () => generarEstrategiaDesdeContexto({ texto_libre: texto, hijo }),
        { esReintentable: esErrorIAReintentable }
      );
      if (!planBase || typeof planBase !== 'object' || !Array.isArray(planBase.semanas) || planBase.semanas.length === 0) {
        throw new Error('El plan no se generó correctamente. Intenta de nuevo.');
      }

      const habilidadLabel = planBase.label_usado || planBase.label_inferido || texto.slice(0, 60);
      const grupoMatch = planBase.habilidad_id
        ? (HABILIDADES_CATALOGO.emocional.items.find((i) => i.id === planBase.habilidad_id)
            ? 'Regulación emocional' : 'Desarrollo y aprendizaje')
        : 'Caso libre';

      const planData = {
        ...planBase,
        semanas: (planBase.semanas || []).map((s, si) => ({
          numero: s.numero ?? si + 1,
          titulo: s.titulo || '',
          descripcion: s.accion || s.descripcion || '',
          tareas: (s.tareas || []).map((t, ti) =>
            typeof t === 'string' ? { id: `s${si + 1}t${ti + 1}`, texto: t, completada: false } : t
          ),
        })),
      };

      // Fase 4 Bloque 2A: dual insert (identidad + ciclo 1) vía helper del contexto.
      const row = await crearEstrategiaConCiclo({
        hijo_id:         hijo.id,
        habilidad:       habilidadLabel,
        habilidad_grupo: grupoMatch,
        plan:            planData,
      });
      await reloadEstrategias();
      navigate(`/estrategias/${row.id}`, { replace: true });
    } catch (err) {
      console.error('caso libre falló', err);
      setCasoLibreError(err.message || 'Algo falló al generar el plan.');
      setCasoLibreEstado('error');
    } finally {
      generandoCasoLibreRef.current = false;
    }
  };

  if (casoLibreEstado === 'generando') {
    return (
      <div className={styles.page}>
        <HeaderMocha titulo="Creando tu plan" />
        <div className={styles.body}>
          <LoadingDignificado
            titulo="Estamos armando tu plan."
            sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
            pasos={['Leyendo lo que describiste', 'Buscando bibliografía pediátrica', 'Adaptando a la edad de tu hijo', 'Escribiendo tu plan personalizado']}
            pasoActual={0}
            hijoEdad={hijo?.edad}
          />
        </div>
      </div>
    );
  }

  if (casoLibreEstado === 'error') {
    return (
      <div className={styles.page}>
        <HeaderMocha titulo="Algo falló" onBack={() => setCasoLibreEstado('idle')} />
        <div className={styles.body}>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--color-ink)', fontSize: '14px' }}>{casoLibreError}</p>
            <button
              style={{ padding: '12px 20px', background: 'var(--color-tangerine)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}
              onClick={() => setCasoLibreEstado('idle')}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <HeaderMocha
        titulo="Estrategias"
        clinical={`Tus planes se construyen con ${episodios.length} ${episodios.length === 1 ? 'momento que has registrado' : 'momentos que has registrado'}.`}
      />

      <div className={styles.body}>
        {planesActivosEnriquecidos.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionLbl}>Lo que estás trabajando</div>
            {planesActivosEnriquecidos.map((plan) => (
              <EstrategiaActivaCard
                key={plan.id}
                plan={plan}
                hijo={hijo}
                ciclosAnteriores={ciclosAnterioresDe(planes, plan)}
                onAbrir={() => navigate(`/estrategias/${plan.id}`)}
                authorName={getAuthorDisplay(plan.userId, profilesByUserId, user?.id)}
              />
            ))}
          </section>
        )}

        {planesActivos.length < MAX_PLANES_ACTIVOS_FREE && (
          <section className={styles.section}>
            <button className={styles.sectionHeader} onClick={handleToggle} aria-expanded={expanded}>
              <span className={styles.sectionLblText}>Lo que Huella ve en {hijo?.nombre || 'tu hijo'}</span>
              {esNueva && sugerenciaVisible && (
                <span className={styles.badgeNueva}>1 nueva</span>
              )}
              <span className={styles.sectionChev}>{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
              loadingPatrones ? (
                <PuertaUnoLoading onIrPuerta2={onIrPuerta2} />
              ) : sugerenciaVisible ? (
                <PuertaUnoHallazgo
                  sugerencia={sugerenciaFiltrada}
                  onAceptar={onAceptarSugerencia}
                  onDescartar={onCerrarSugerencia}
                  onIrPuerta2={onIrPuerta2}
                />
              ) : (
                <PuertaUnoEmpty
                  totalEpisodios={episodios.length}
                  onIrPuerta2={onIrPuerta2}
                />
              )
            )}
          </section>
        )}

        <section id="puerta-2" className={styles.section}>
          <SelectorHabilidades onElegir={onElegirHabilidad} onCasoLibre={handleCasoLibre} habilidadesEnPlanActivo={habilidadesEnPlanActivo} />
        </section>

        {planesPasados.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionLbl}>Lo que ya trabajaste</h2>
            <div className={styles.pasadosStack}>
              {planesPasados
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.completado_at || 0) -
                    new Date(a.completado_at || 0),
                )
                .map((p) => (
                  <EstrategiaPasadaCard
                    key={p.id}
                    plan={p}
                    hijo={hijo}
                    cicloNumero={cicloNumeroDe(planes, p)}
                    onAbrir={() => navigate(`/estrategias/${p.id}`)}
                  />
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
