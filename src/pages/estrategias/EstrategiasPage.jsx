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
import SeccionColapsable from './components/SeccionColapsable';
import LoadingDignificado from './components/LoadingDignificado';
import UpgradeModal from '../../components/ui/UpgradeModal';
import {
  buildSugerenciasFromInterpretacion,
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
  const { state, crearEstrategiaConCiclo, reloadEstrategias, profilesByUserId, isPro } = useHuella();
  const { user } = useAuth();
  const [casoLibreEstado, setCasoLibreEstado] = useState('idle');
  const [casoLibreError, setCasoLibreError] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const generandoCasoLibreRef = useRef(false);
  const hijo = state.hijo;
  const planes = state.estrategias || [];
  const episodios = state.episodios || [];

  const [sugerencias, setSugerencias] = useState([]);
  const [descartes, setDescartes] = useState([]);
  const [loadingPatrones, setLoadingPatrones] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nuevasCount, setNuevasCount] = useState(0);
  const [puerta2Abierta, setPuerta2Abierta] = useState(false);
  const sugerenciasRef = useRef([]);
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
    // El cap de foco (no sugerir lo que no se puede crear hasta cerrar una)
    // aplica solo a Pro/Admin. El free ve sugerencias siempre: al aceptar una
    // cae en el gate de Pro de iniciarCreacion (no las crea sin Pro).
    if (isPro() && planesActivos.length >= MAX_PLANES_ACTIVOS_FREE) { setSugerencias([]); return; }
    if (!hijo?.id || episodios.length < 3) { setSugerencias([]); return; }

    // Si venimos del Panel con análisis ya hecho, usarlo directamente
    if (sugerenciaPrecocida) {
      setSugerencias(buildSugerenciasFromInterpretacion(sugerenciaPrecocida, episodios));
      return;
    }

    let cancel = false;
    (async () => {
      setLoadingPatrones(true);
      try {
        const interp = await detectarPatronesEstructurado({ hijo_id: hijo.id, hijo_edad: hijo.edad, episodios });
        if (cancel) return;
        setSugerencias(buildSugerenciasFromInterpretacion(interp, episodios));
      } catch (e) {
        console.error('detectarPatronesEstructurado falló', e);
        setSugerencias([]);
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

  // Cambio 3 + Bug 1: lista de sugerencias visibles. Se filtra cada una
  // por (a) habilidad no excluida y (b) lógica de descarte 7d/5ep POR
  // habilidad (debeMostrarSugerencia ya filtra los descartes por
  // habilidad_id). Así cada tarjeta vive y muere de forma independiente.
  const sugerenciasVisibles = useMemo(() => {
    return sugerencias
      .filter((s) => !habilidadesExcluidas.has(s.habilidad_nombre))
      .filter((s) => debeMostrarSugerencia(s, descartes, episodios.length));
  }, [sugerencias, habilidadesExcluidas, descartes, episodios.length]);

  // Clave estable de fingerprints para deps de efectos (evita loops por
  // identidad de arreglo nuevo en cada render).
  const fingerprintsVisibles = useMemo(
    () => sugerenciasVisibles.map((s) => s.fingerprint).join('|'),
    [sugerenciasVisibles]
  );

  // Cambio 5: auto-expand si hay alguna sugerencia nueva (no vista en
  // esta sesión). nuevasCount alimenta el badge "N nueva(s)".
  useEffect(() => {
    if (sugerenciasVisibles.length === 0) { setNuevasCount(0); return; }
    const key = `huella_sug_${hijo?.id}`;
    const vistas = JSON.parse(sessionStorage.getItem(key) || '[]');
    const nuevas = sugerenciasVisibles.filter((s) => !vistas.includes(s.fingerprint));
    if (nuevas.length > 0) {
      setExpanded(true);
      setNuevasCount(nuevas.length);
    } else {
      setNuevasCount(0);
    }
  }, [fingerprintsVisibles, hijo?.id]);

  // Cambio 5: marcar todas las visibles como vistas al desmontar.
  useEffect(() => {
    return () => {
      if (!sugerenciasRef.current.length || !hijoIdRef.current) return;
      const key = `huella_sug_${hijoIdRef.current}`;
      const vistas = JSON.parse(sessionStorage.getItem(key) || '[]');
      const merged = Array.from(new Set([...vistas, ...sugerenciasRef.current]));
      sessionStorage.setItem(key, JSON.stringify(merged));
    };
  }, []);

  // Mantener refs actualizados para el cleanup del unmount
  useEffect(() => {
    sugerenciasRef.current = sugerenciasVisibles.map((s) => s.fingerprint);
    hijoIdRef.current = hijo?.id ?? null;
  }, [fingerprintsVisibles, hijo?.id]);

  const handleToggle = () => {
    if (!expanded && sugerenciasVisibles.length > 0) {
      // Al expandir manualmente, marcar todas como vistas
      const key = `huella_sug_${hijo?.id}`;
      const vistas = JSON.parse(sessionStorage.getItem(key) || '[]');
      const merged = Array.from(new Set([...vistas, ...sugerenciasVisibles.map((s) => s.fingerprint)]));
      sessionStorage.setItem(key, JSON.stringify(merged));
      setNuevasCount(0);
    }
    setExpanded((v) => !v);
  };

  const onAceptarSugerencia = (sug) => {
    const ids = sug.episodios_detonantes.map((e) => e.id).join(',');
    navigate(`/estrategias/nuevo?habilidad=${sug.habilidad_id}&episodios=${ids}`);
  };
  // "No por ahora" descarta SOLO esa tarjeta. Al insertar el descarte,
  // debeMostrarSugerencia la saca de sugerenciasVisibles y la card
  // desaparece sola; las demás siguen visibles.
  const onCerrarSugerencia = async (sug) => {
    if (!sug) return;
    const reg = {
      hijo_id: hijo.id,
      fingerprint: sug.fingerprint,
      habilidad_id: sug.habilidad_id,
      descartada_at: new Date().toISOString(),
      episodios_count_al_rechazar: episodios.length,
    };
    setDescartes((d) => [...d, reg]);
    await supabase.from('estrategia_sugerencias_descartadas').insert(reg);
  };
  const onElegirHabilidad = (hab) => {
    navigate(`/estrategias/nuevo?habilidad=${hab.id}`);
  };

  // Link sutil en Puerta 1 → lleva el foco a Puerta 2 (sección hermana).
  // Scroll suave a la sección con id="puerta-2". No navega ni abre nada.
  const onIrPuerta2 = () => {
    setPuerta2Abierta(true); // auto-abre el cuadro dorado además de hacer scroll
    const el = document.getElementById('puerta-2');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCasoLibre = async (texto) => {
    if (generandoCasoLibreRef.current) return;
    // Gate Pro: crear un plan (caso libre) es Pro. Se corta antes del
    // llamarAPI caro (4000 tokens); no se llama a la IA. Pro/Admin siguen.
    if (!isPro()) {
      setShowUpgrade(true);
      return;
    }
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
          <SeccionColapsable titulo="Lo que estás trabajando" variant="tangerine" defaultOpen>
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
          </SeccionColapsable>
        )}

        {(!isPro() || planesActivos.length < MAX_PLANES_ACTIVOS_FREE) && (
          <SeccionColapsable
            titulo={`Lo que Huella ve en ${hijo?.nombre || 'tu hijo'}`}
            variant="lavender"
            open={expanded}
            onToggle={handleToggle}
            headerExtra={nuevasCount > 0 ? (
              <span className={styles.badgeNueva}>{nuevasCount} {nuevasCount === 1 ? 'nueva' : 'nuevas'}</span>
            ) : null}
          >
            {loadingPatrones ? (
              <PuertaUnoLoading onIrPuerta2={onIrPuerta2} />
            ) : sugerenciasVisibles.length > 0 ? (
              sugerenciasVisibles.map((sug) => (
                <PuertaUnoHallazgo
                  key={sug.fingerprint}
                  sugerencia={sug}
                  onAceptar={() => onAceptarSugerencia(sug)}
                  onDescartar={() => onCerrarSugerencia(sug)}
                  onIrPuerta2={onIrPuerta2}
                />
              ))
            ) : (
              <PuertaUnoEmpty
                totalEpisodios={episodios.length}
                onIrPuerta2={onIrPuerta2}
              />
            )}
          </SeccionColapsable>
        )}

        <SeccionColapsable
          id="puerta-2"
          titulo="¿Quieres trabajar algo más?"
          variant="gold"
          open={puerta2Abierta}
          onToggle={() => setPuerta2Abierta((v) => !v)}
        >
          <SelectorHabilidades onElegir={onElegirHabilidad} onCasoLibre={handleCasoLibre} habilidadesEnPlanActivo={habilidadesEnPlanActivo} />
        </SeccionColapsable>

        {planesPasados.length > 0 && (
          <SeccionColapsable titulo="Lo que ya trabajaste" variant="green">
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
          </SeccionColapsable>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          tituloCustom="Un plan para trabajar lo que importa"
          mensajeCustom="Con Huella Pro creas planes de 4 semanas con tareas concretas para acompañar cada habilidad de tu hijo."
        />
      )}
    </div>
  );
}
