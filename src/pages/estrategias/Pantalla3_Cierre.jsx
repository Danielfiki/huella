// Pantalla3_Cierre.jsx · v2
// Vive dentro del Layout global de la app (header con avatar + bottom nav
// los provee el Layout; este componente no agrega su propia navegación).
// Consume snake_case desde analizarCierreCiclo().

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import styles from './Pantalla3_Cierre.module.css';

const ICONS = {
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
      <path d="M19 17l.8 2.7L22 20l-2.2.6L19 23l-.6-2.4L16 20l2.4-.6z" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
};

export default function Pantalla3_Cierre({
  plan,
  cierreAnalisis,
  hijoNombre = 'tu hijo',
  cicloNumero = 1,
  onIniciarNuevoCiclo,
  onTrabajarLibre,
  procesando = false,
}) {
  const navigate = useNavigate();

  const habilidadNombre = plan?.habilidad_nombre ?? 'Habilidad';
  const totalSemanas = plan?.total_semanas ?? 4;
  const notasCount = plan?.notas_count ?? 0;
  const episodiosCount = plan?.episodios_count ?? 0;

  const queCambio = cierreAnalisis?.que_cambio;
  const queQuedoPendiente = cierreAnalisis?.que_quedo_pendiente;
  const recomendaciones = cierreAnalisis?.recomendaciones ?? [];

  // Si el contenedor (EstrategiaCierrePage) pasa los callbacks reales,
  // se usan. En modo standalone (sin callbacks) cae a los placeholders.
  const iniciarNuevoCiclo = () => {
    if (typeof onIniciarNuevoCiclo === 'function') {
      onIniciarNuevoCiclo();
      return;
    }
    // placeholder fallback (modo standalone)
    navigate(`/estrategias/nuevo?habilidad=${plan?.habilidad_id ?? ''}`);
  };

  const trabajarLibre = () => {
    if (typeof onTrabajarLibre === 'function') {
      onTrabajarLibre();
      return;
    }
    navigate('/estrategias');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{habilidadNombre}</h1>

        <div className={styles.celebrate}>
          <div className={styles.iconGroup}>
            <span className={styles.sparkle} aria-hidden="true">{ICONS.sparkles}</span>
            <span className={styles.eyebrow}>Ciclo {cicloNumero} completado</span>
          </div>
          <h2 className={styles.celebrateTitle}>
            {totalSemanas} semanas trabajando {habilidadNombre.toLowerCase()} con {hijoNombre}.
          </h2>
          <p className={styles.celebrateSub}>
            Trabajaste {totalSemanas} semanas con {hijoNombre}. La IA leyó tus notas, los episodios vinculados y los check-ins para devolverte lo que encontró.
          </p>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statNum}>{totalSemanas}</div>
            <div className={styles.statLbl}>semanas</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>{notasCount}</div>
            <div className={styles.statLbl}>notas</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statNum}>{episodiosCount}</div>
            <div className={styles.statLbl}>episodios vinculados</div>
          </div>
        </div>

        {queCambio && (
          <Card className={styles.analisis} variant="elevated">
            <h3 className={styles.analisisTitle}>Qué cambió</h3>
            <p className={styles.analisisBody}>{queCambio}</p>
          </Card>
        )}

        {queQuedoPendiente && (
          <Card className={styles.analisis} variant="elevated">
            <h3 className={styles.analisisTitle}>Qué quedó pendiente</h3>
            <p className={styles.analisisBody}>{queQuedoPendiente}</p>
          </Card>
        )}

        {recomendaciones.length > 0 && (
          <Card className={styles.analisis} variant="elevated">
            <h3 className={styles.analisisTitle}>Recomendaciones para integrar</h3>
            <ul className={styles.analisisList}>
              {recomendaciones.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </Card>
        )}

        <div className={styles.ctaBlock}>
          <p className={styles.ctaLead}>¿Qué quieres hacer ahora?</p>
          <div className={styles.ctas}>
            <button
              type="button"
              className={`${styles.cta} ${styles.primary}`}
              onClick={iniciarNuevoCiclo}
              disabled={procesando}
            >
              <span className={styles.ctaLabelRow}>
                <span className={styles.ctaLabel}>Iniciar nuevo ciclo</span>
                {ICONS.chevron}
              </span>
              <span className={styles.ctaSub}>Arma un próximo ciclo con tareas y semanas</span>
            </button>
            <button
              type="button"
              className={`${styles.cta} ${styles.ghost}`}
              onClick={trabajarLibre}
            >
              <span className={styles.ctaLabelRow}>
                <span className={styles.ctaLabel}>Trabajar libre</span>
              </span>
              <span className={styles.ctaSub}>Sigue presente sin abrir un ciclo nuevo</span>
            </button>
          </div>
        </div>

        <p className={styles.disclaimer}>
          Este análisis es una orientación, no un diagnóstico. Si algo te preocupa, conversa con un profesional de confianza.
        </p>
      </div>
    </div>
  );
}
