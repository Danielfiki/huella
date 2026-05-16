import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { interpretarPatrones } from '../../services/anthropic';
import { supabase } from '../../services/supabase';
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
  const { state, dispatch } = useHuella();
  const hijo = state.hijo;
  const planes = state.estrategias || [];
  const episodios = state.episodios || [];

  const [sugerencia, setSugerencia] = useState(null);
  const [descartes, setDescartes] = useState([]);
  const [loadingPatrones, setLoadingPatrones] = useState(false);

  // Plan activo (un solo plan activo por hijo)
  const planActivo = useMemo(
    () => planes.find((p) => estadoPlan(p) === 'activo' && p.hijo_id === hijo?.id),
    [planes, hijo]
  );
  const planesPasados = useMemo(
    () => planes.filter((p) => estadoPlan(p) !== 'activo' && p.hijo_id === hijo?.id),
    [planes, hijo]
  );

  // Cargar descartes de sugerencias
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

  // Generar sugerencia IA si no hay plan activo
  useEffect(() => {
    if (planActivo) { setSugerencia(null); return; }
    if (!hijo?.id || episodios.length < 3) { setSugerencia(null); return; }

    let cancel = false;
    (async () => {
      setLoadingPatrones(true);
      try {
        const interp = await interpretarPatrones({ hijo_id: hijo.id, episodios });
        if (cancel) return;
        const sug = buildSugerenciaFromInterpretacion(interp, episodios);
        setSugerencia(sug);
      } catch (e) {
        console.error('interpretarPatrones falló', e);
        setSugerencia(null);
      } finally {
        if (!cancel) setLoadingPatrones(false);
      }
    })();
    return () => { cancel = true; };
  }, [hijo?.id, episodios, planActivo]);

  const sugerenciaVisible = debeMostrarSugerencia(sugerencia, descartes);

  const onAceptarSugerencia = () => {
    const ids = sugerencia.episodios_detonantes.map((e) => e.id).join(',');
    navigate(`/estrategias/nuevo?habilidad=${sugerencia.habilidad_id}&episodios=${ids}`);
  };
  const onCerrarSugerencia = async () => {
    if (!sugerencia) return;
    const reg = {
      hijo_id: hijo.id,
      fingerprint: sugerencia.fingerprint,
      habilidad_id: sugerencia.habilidad_id,
      descartada_at: new Date().toISOString(),
    };
    setDescartes((d) => [...d, reg]); // optimistic
    setSugerencia(null);
    await supabase.from('estrategia_sugerencias_descartadas').insert(reg);
  };
  const onElegirHabilidad = (hab) => {
    navigate(`/estrategias/nuevo?habilidad=${hab.id}`);
  };

  return (
    <div className={styles.page}>
      <HeaderMocha
        titulo="Estrategias"
        clinical={`Basadas en ${episodios.length} ${episodios.length === 1 ? 'momento registrado' : 'momentos registrados'}`}
      />

      <div className={styles.body}>
        {planActivo ? (
          <section className={styles.section}>
            <div className={styles.sectionLbl}>Lo que estás trabajando</div>
            <EstrategiaActivaCard
              plan={planActivo}
              hijo={hijo}
              onAbrir={() => navigate(`/estrategias/${planActivo.id}`)}
            />
          </section>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionLbl}>
                <span className={styles.dotDot} /> Sugerencias para vos
              </div>
              {sugerenciaVisible ? (
                <SugerenciaIACard
                  sugerencia={sugerencia}
                  onAceptar={onAceptarSugerencia}
                  onCerrar={onCerrarSugerencia}
                />
              ) : (
                <EmptyPuerta1 totalEpisodios={episodios.length} />
              )}
            </section>

            <section className={styles.section}>
              <SelectorHabilidades onElegir={onElegirHabilidad} />
            </section>
          </>
        )}

        {planesPasados.length > 0 && (
          <DrawerPasados planes={planesPasados} />
        )}
      </div>
    </div>
  );
}
