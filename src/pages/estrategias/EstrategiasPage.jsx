import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { detectarPatronesEstructurado } from '../../services/anthropic';
import { supabase } from '../../lib/supabase';
import HeaderMocha from './components/HeaderMocha';
import EstrategiaActivaCard from './components/EstrategiaActivaCard';
import SugerenciaIACard from './components/SugerenciaIACard';
import SelectorHabilidades from './components/SelectorHabilidades';
import EmptyPuerta1 from './components/EmptyPuerta1';
import DrawerPasados from './components/DrawerPasados';
import {
  buildSugerenciaFromInterpretacion,
  debeMostrarSugerencia,
  estadoPlan,
} from './helpers';
import styles from './EstrategiasPage.module.css';

export default function EstrategiasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sugerenciaPrecocida = location.state?.sugerencia_precocida ?? null;
  const { state, deleteEstrategia } = useHuella();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
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

  const planActivo = useMemo(
    () => planes.find((p) => estadoPlan(p) === 'activo' && p.hijo_id === hijo?.id),
    [planes, hijo]
  );
  const planesPasados = useMemo(
    () => planes.filter((p) => estadoPlan(p) !== 'activo' && p.hijo_id === hijo?.id),
    [planes, hijo]
  );

  // Enriquecer plan activo con episodios_detonantes computados desde IDs
  const planActivoEnriquecido = useMemo(() => {
    if (!planActivo) return null;
    if (planActivo.episodios_detonantes?.length) return planActivo;
    const ids = planActivo.episodios_detonantes_ids || [];
    const detonantes = ids
      .map((id) => episodios.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => ({
        id: e.id,
        titulo: e.descripcionLibre?.slice(0, 40) || e.tipo || 'Momento',
        emoji: '·',
        categoria: 'rutina',
      }));
    return { ...planActivo, episodios_detonantes: detonantes };
  }, [planActivo, episodios]);

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
    if (planActivo) { setSugerencia(null); return; }
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
  }, [hijo?.id, episodios, planActivo, sugerenciaPrecocida]);

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

  const handleEliminar = async (id) => {
    await deleteEstrategia(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className={styles.page}>
      <HeaderMocha
        titulo="Estrategias"
        clinical={`Basadas en ${episodios.length} ${episodios.length === 1 ? 'momento registrado' : 'momentos registrados'}`}
      />

      <div className={styles.body}>
        {planActivoEnriquecido && (
          <section className={styles.section}>
            <div className={styles.sectionLbl}>Lo que estás trabajando</div>
            <EstrategiaActivaCard
              plan={planActivoEnriquecido}
              hijo={hijo}
              onAbrir={() => navigate(`/estrategias/${planActivoEnriquecido.id}`)}
              onEliminar={setConfirmDeleteId}
            />
          </section>
        )}

        {!planActivoEnriquecido && (
          <section className={styles.section}>
            <button className={styles.sectionHeader} onClick={handleToggle} aria-expanded={expanded}>
              <span className={styles.sectionLblText}>🌱 Sugerencias de Huella</span>
              {esNueva && sugerenciaVisible && (
                <span className={styles.badgeNueva}>1 nueva</span>
              )}
              <span className={styles.sectionChev}>{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
              loadingPatrones ? (
                <div className={styles.loadingPuerta1}>Analizando tus registros…</div>
              ) : sugerenciaVisible ? (
                <SugerenciaIACard
                  sugerencia={sugerenciaFiltrada}
                  onAceptar={onAceptarSugerencia}
                  onCerrar={onCerrarSugerencia}
                />
              ) : (
                <EmptyPuerta1 totalEpisodios={episodios.length} postRechazo={esPostRechazo} />
              )
            )}
          </section>
        )}

        <section className={styles.section}>
          <SelectorHabilidades onElegir={onElegirHabilidad} />
        </section>

        {planesPasados.length > 0 && (
          <DrawerPasados planes={planesPasados} onEliminar={setConfirmDeleteId} />
        )}
      </div>

      {confirmDeleteId && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTtl}>¿Eliminar este plan?</p>
            <p className={styles.modalSub}>Esta acción no se puede deshacer.</p>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
              <button className={styles.modalDanger} onClick={() => handleEliminar(confirmDeleteId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
