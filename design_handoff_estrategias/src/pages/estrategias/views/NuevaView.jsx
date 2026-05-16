// NuevaView.jsx — flujo de creación. Acepta entrada por Puerta 1 (con habilidad
// preseleccionada y episodios anclados) o Puerta 2 (selección manual).
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import HeaderMocha from '../components/HeaderMocha';
import SelectorHabilidades from '../components/SelectorHabilidades';
import LoadingDignificado from '../components/LoadingDignificado';
import styles from './NuevaView.module.css';

const PASOS_LOADING = [
  'Leyendo episodios detonantes',
  'Diseñando 4 semanas progresivas',
  'Adaptando tareas al ritmo familiar',
];

export default function NuevaView({ hijo, onGenerar }) {
  const { state } = useLocation();
  const habilidadInicial = state?.habilidad || null;
  const epsIniciales = state?.episodios_detonantes || [];

  const [habilidad, setHabilidad] = useState(habilidadInicial);
  const [contexto, setContexto] = useState('');
  const [generando, setGenerando] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);

  const desdeP1 = !!habilidadInicial;

  const submit = async () => {
    if (!habilidad) return;
    setGenerando(true);
    // Animar pasos del loading mientras esperamos. Si el endpoint resuelve antes,
    // saltamos al final; si tarda más, mantenemos el último activo.
    const t = setInterval(() => setPasoActual((n) => Math.min(n + 1, PASOS_LOADING.length - 1)), 6000);
    try {
      await onGenerar({ habilidad, contexto, episodios_detonantes: epsIniciales });
    } finally {
      clearInterval(t);
    }
  };

  return (
    <>
      <HeaderMocha
        titulo="Nuevo plan"
        onBack={() => window.history.back()}
        clinical={generando ? 'Generando…' : (desdeP1 ? 'Paso 2 de 3 · Confirmar y generar' : 'Paso 1 de 2 · Elegí habilidad')}
      />

      <div className={styles.body}>
        {desdeP1 && habilidad ? (
          <div className={styles.heroBlock}>
            <div className={styles.lab}>Habilidad · preseleccionada</div>
            <div className={styles.heroTtl}>{habilidad.label}</div>
            {epsIniciales.length > 0 && (
              <div className={styles.epRow}>
                {epsIniciales.map((e) => (
                  <span key={e.id} className={styles.heroEp}>
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{e.emoji || '·'}</span>
                    {e.titulo}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <SelectorHabilidades
            seleccionada={habilidad?.id}
            onElegir={(h) => setHabilidad(h)}
          />
        )}

        {habilidad && !generando && (
          <div className={styles.formField}>
            <label>Algo más que Huella debería saber</label>
            <textarea
              placeholder="Opcional · una o dos frases"
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
            />
          </div>
        )}

        {generando && (
          <LoadingDignificado
            titulo={`Construyendo el plan de ${hijo?.nombre || 'tu hijo'}`}
            sub="Esto toma unos 20 segundos. Estamos leyendo los momentos para ajustar el lenguaje a lo que vives."
            pasos={PASOS_LOADING}
            pasoActual={pasoActual}
          />
        )}

        {habilidad && !generando && (
          <button className={styles.cta} onClick={submit}>
            ⚡ Generar plan de 4 semanas
          </button>
        )}
      </div>
    </>
  );
}
