// PuertaUnoHallazgo.jsx
// Estado "con sugerencia" de Puerta 1 · Concepto C "Mosaico de evidencia".
// Reemplaza completamente al antiguo SugerenciaIACard.
//
// Path: src/components/estrategias/puerta1/PuertaUnoHallazgo.jsx
// Hermanos: PuertaUnoEmpty.jsx · PuertaUnoLoading.jsx
//
// El switch entre estados vive en EstrategiasPage.jsx (ver patch).

import React, { useMemo } from 'react';
import styles from './PuertaUnoHallazgo.module.css';

/**
 * Props
 *   sugerencia   { habilidad_nombre, narrativa: { titulo, bajada },
 *                  episodios_detonantes: Array<{ id, titulo, emoji, fecha_label,
 *                                                intensidad, categoria, created_at? }>,
 *                  fingerprint }
 *   onAceptar    () => void   navega a /estrategias/nuevo?habilidad=…&episodios=…
 *   onDescartar  () => void   inserta descarte en Supabase, hide optimistic
 *   onIrPuerta2  () => void   foco en Puerta 2 (scroll-into-view de la sección hermana)
 */
export default function PuertaUnoHallazgo({
  sugerencia,
  onAceptar,
  onDescartar,
  onIrPuerta2,
}) {
  const detonantes = sugerencia?.episodios_detonantes || [];

  // Stamp arriba: "N momentos · X días"
  // Calculado en cliente desde detonantes.length y diff (max - min) de created_at.
  const stamp = useMemo(() => {
    const n = detonantes.length;
    if (n === 0) return '';
    const fechas = detonantes
      .map((e) => e.created_at && new Date(e.created_at).getTime())
      .filter(Boolean);
    if (fechas.length < 2) {
      return `${n} ${n === 1 ? 'momento' : 'momentos'}`;
    }
    const diasSpan = Math.max(
      1,
      Math.round((Math.max(...fechas) - Math.min(...fechas)) / 86400000)
    );
    return `${n} ${n === 1 ? 'momento' : 'momentos'} · ${diasSpan} ${diasSpan === 1 ? 'día' : 'días'}`;
  }, [detonantes]);

  // Meta debajo del mosaico: intensidad media X.X/5
  const intensidadMedia = useMemo(() => {
    if (detonantes.length === 0) return null;
    const vals = detonantes
      .map((e) => Number(e.intensidad))
      .filter((x) => !Number.isNaN(x) && x > 0);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg.toFixed(1);
  }, [detonantes]);

  if (!sugerencia) return null;

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.topRow}>
          <span className={styles.dot} aria-hidden="true">h</span>
          <span className={styles.lab}>
            <b>Huella ve un patrón</b>
          </span>
          {stamp && <span className={styles.stamp}>{stamp}</span>}
        </div>
        <h3 className={styles.ttl}>{sugerencia.narrativa.titulo}</h3>
        <p className={styles.baj}>{sugerencia.narrativa.bajada}</p>
      </div>

      <div className={styles.mosaic}>
        {detonantes.map((ep) => (
          <Tile key={ep.id} ep={ep} />
        ))}
      </div>

      {intensidadMedia && (
        <div className={styles.meta}>
          Intensidad media <strong>{intensidadMedia}/5</strong>
        </div>
      )}

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          onClick={onAceptar}
        >
          Trabajemos esto
          <span className={styles.arr} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </span>
        </button>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.no}
          onClick={onDescartar}
        >
          No por ahora
        </button>
        <button
          type="button"
          className={styles.p2}
          onClick={onIrPuerta2}
        >
          ¿Prefieres elegir tú? →
        </button>
      </div>
    </article>
  );
}

function Tile({ ep }) {
  // Día corto (Lun/Mar/Mié...) desde created_at; fallback a fecha_label.
  const dy = (() => {
    if (ep.created_at) {
      const d = new Date(ep.created_at);
      const dia = d.toLocaleDateString('es', { weekday: 'short' });
      // Normaliza "lun." → "Lun"
      return dia.replace('.', '').charAt(0).toUpperCase() + dia.slice(1, 3);
    }
    return ep.fecha_label || '·';
  })();

  const pct = Math.round((Math.max(1, Math.min(5, ep.intensidad || 3)) / 5) * 100);

  return (
    <div className={styles.ep}>
      <span className={styles.emo} aria-hidden="true">
        {ep.emoji || '·'}
      </span>
      <div className={styles.ibar}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.dy}>{dy}</span>
    </div>
  );
}
