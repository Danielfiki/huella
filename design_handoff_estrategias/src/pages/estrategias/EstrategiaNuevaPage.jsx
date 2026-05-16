import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHuella } from '../../context/HuellaContext';
import { generarEstrategia, generarTareas } from '../../services/anthropic';
import { supabase } from '../../services/supabase';
import Button from '../../components/ui/Button';
import HeaderMocha from './components/HeaderMocha';
import LoadingDignificado from './components/LoadingDignificado';
import { HABILIDADES_CATALOGO } from './helpers';
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
  const hijo = state.hijo;

  const habilidadId = params.get('habilidad');
  const episodiosIds = (params.get('episodios') || '').split(',').filter(Boolean);
  const episodiosDetonantes = (state.episodios || []).filter((e) => episodiosIds.includes(e.id));

  // Resolver habilidad desde catálogo
  const habilidad = (() => {
    for (const grupo of Object.values(HABILIDADES_CATALOGO)) {
      const it = grupo.items.find((x) => x.id === habilidadId);
      if (it) return { ...it, grupoNombre: grupo.nombre };
    }
    return { id: habilidadId, label: 'Habilidad personalizada', emoji: '·', grupoNombre: 'Otra' };
  })();

  const [contextoExtra, setContextoExtra] = useState('');
  const [estado, setEstado] = useState('paso-1-confirmar'); // paso-1-confirmar | generando | error
  const [pasoActual, setPasoActual] = useState(0);
  const [error, setError] = useState(null);

  const generar = async () => {
    setEstado('generando');
    setPasoActual(0);
    try {
      // Paso 1: leer episodios → ya tenemos
      setPasoActual(1);
      // Paso 2: generar estrategia
      const planBase = await generarEstrategia({
        hijo_id: hijo.id,
        hijo_edad: hijo.edad_label,
        habilidad: habilidad.label,
        episodios: episodiosDetonantes,
        contexto_extra: contextoExtra,
      });
      setPasoActual(2);
      // Paso 3: ya adaptado por el prompt
      // Paso 4: generar tareas semanales
      const semanas = await generarTareas({
        plan_base: planBase,
        total_semanas: planBase.total_semanas || 4,
      });
      setPasoActual(3);

      // Persistir
      const { data: plan } = await supabase.from('estrategias').insert({
        hijo_id: hijo.id,
        habilidad_id: habilidad.id,
        habilidad_nombre: habilidad.label,
        habilidad_grupo: habilidad.grupoNombre,
        total_semanas: semanas.length,
        semana_actual: 1,
        contenido_ia: planBase,
        episodios_detonantes_ids: episodiosIds,
      }).select().single();

      const semanasRows = semanas.map((s, i) => ({
        plan_id: plan.id,
        numero: i + 1,
        titulo: s.titulo,
        descripcion: s.descripcion,
        tareas: s.tareas,
      }));
      await supabase.from('estrategia_semanas').insert(semanasRows);

      dispatch({ type: 'ESTRATEGIA_CREADA', plan: { ...plan, semanas: semanasRows, episodios_detonantes: episodiosDetonantes } });
      navigate(`/estrategias/${plan.id}`, { replace: true });
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
            sub="Tarda menos de un minuto. Podés cerrar la app — te avisamos cuando esté listo."
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

  // paso-1-confirmar
  return (
    <div className={styles.page}>
      <HeaderMocha titulo="Empezar plan" onBack={() => navigate('/estrategias')} />
      <div className={styles.body}>
        <div className={styles.hero}>
          <div className={styles.eye}>Vamos a trabajar</div>
          <h2 className={styles.ttl}>{habilidad.label}</h2>
          <p className={styles.sub}>Para {hijo?.nombre} · {hijo?.edad_label}</p>
          {episodiosDetonantes.length > 0 && (
            <div className={styles.epList}>
              <div className={styles.epLbl}>Basado en lo que registraste</div>
              {episodiosDetonantes.slice(0, 3).map((e) => (
                <div key={e.id} className={styles.ep}>
                  <span className={styles.emo}>{e.emoji || '·'}</span>
                  <span className={styles.epTtl}>{e.titulo || e.resumen}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className={styles.lbl}>
          <span>¿Algo más que querés que tengamos en cuenta? <em>(opcional)</em></span>
          <textarea
            placeholder="Ej: 'esto pasa más a la noche', 'tiene un hermano de 6 años'…"
            value={contextoExtra}
            onChange={(e) => setContextoExtra(e.target.value)}
          />
        </label>

        <Button className={styles.cta} onClick={generar}>Generar mi plan</Button>
      </div>
    </div>
  );
}
