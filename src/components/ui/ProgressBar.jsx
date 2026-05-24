// ProgressBar.jsx
// Barra de progreso reutilizable. Pensada para 3 usos:
//   - "loading"     · sube de 0 a 90% en ~14s con curva ease-out (espera de IA)
//   - "complete"    · cierra 90→100 en 200ms cuando llega la respuesta
//   - "determinate" · transición corta 280ms (pasos del onboarding, formularios)
//
// Tones:
//   - "onDark"   · track translúcido blanco (sobre fondos oscuros: mocha, encuentro)
//   - "onLight"  · track con --color-border (sobre fondos claros: crema, surface)
//
// Honra prefers-reduced-motion (sin transición, cambio abrupto).
//
// Path: src/components/ui/ProgressBar.jsx

import React from 'react';
import styles from './ProgressBar.module.css';

/**
 * Props
 *   value       number   · 0–100, ancho del fill
 *   phase       string   · 'loading' | 'complete' | 'determinate'  (default 'determinate')
 *   tone        string   · 'onDark' | 'onLight'                    (default 'onLight')
 *   color       string   · CSS color/var del fill                  (default var(--color-tangerine))
 *   label       string   · aria-label opcional para a11y
 *   className   string   · clase adicional opcional para el wrapper
 */
export default function ProgressBar({
  value = 0,
  phase = 'determinate',
  tone = 'onLight',
  color,
  label,
  className,
}) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const trackClass = `${styles.track} ${tone === 'onDark' ? styles.trackOnDark : styles.trackOnLight}`;
  const fillClass = `${styles.fill} ${
    phase === 'loading' ? styles.fillLoading
    : phase === 'complete' ? styles.fillComplete
    : styles.fillDeterminate
  }`;

  const wrapClass = [trackClass, className].filter(Boolean).join(' ');

  const fillStyle = {
    width: `${clamped}%`,
    ...(color ? { background: color } : null),
  };

  return (
    <div
      className={wrapClass}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
    >
      <div className={fillClass} style={fillStyle} aria-hidden="true" />
    </div>
  );
}
