// OnboardingBottomSlide.jsx
// Plantilla de slide del onboarding · concepto Susurro · slides 1, 2, 3, 5.
//
// Composición:
//   ┌──────────────────────────────┐
//   │ topbar · dots + skip         │ ← arriba
//   │                              │
//   │ top · glyph + badge          │ ← mitad superior (atmósfera)
//   │                              │
//   │ bottom · título · body · sub │ ← mitad inferior (contenido)
//   │ CTA                          │
//   └──────────────────────────────┘
//
// Path: src/pages/onboarding/OnboardingBottomSlide.jsx

import React from 'react';
import styles from './OnboardingBottomSlide.module.css';

/**
 * Props
 *   palette       'noche' | 'amanecer' | 'encuentro' | 'afirmacion'
 *   glyph         string (emoji nativo · obligatorio para Susurro)
 *   badge         string (texto de la pildora superior)
 *   title         string (Fraunces serif)
 *   body          string (opcional)
 *   sub           string (opcional · italic)
 *   ctaLabel      string (opcional · si no viene, se asume children renderea el CTA propio)
 *   ctaDisabled   bool   (default false)
 *   ctaSubmitting bool   (default false) · cuando true, el CTA queda disabled,
 *                                          muestra spinner + "Guardando…" y
 *                                          ignora clicks. Usado por el slide 5
 *                                          mientras el persistor corre.
 *   onContinue    () => void
 *   slideIndex    number (0-indexed)
 *   totalSlides   number
 *   showTopSkip   bool
 *   onTopSkip     () => void
 *   children      ReactNode · opcional · reemplaza body+sub+CTA por contenido custom
 *                  (slide 3 usa esto para inyectar <OnboardingComposer/>)
 */
export default function OnboardingBottomSlide({
  palette,
  glyph,
  badge,
  title,
  body,
  sub,
  ctaLabel,
  ctaDisabled = false,
  ctaSubmitting = false,
  onContinue,
  slideIndex,
  totalSlides,
  showTopSkip,
  onTopSkip,
  children,
}) {
  const darkText = palette === 'amanecer';

  return (
    <section className={styles.slide} data-palette={palette}>
      <div className={styles.particles} aria-hidden="true" />

      <header className={styles.topbar}>
        <ProgressDots current={slideIndex} total={totalSlides} dark={darkText} />
        {showTopSkip ? (
          <button
            type="button"
            className={styles.topSkip}
            onClick={onTopSkip}
          >
            Saltar
          </button>
        ) : (
          <span className={styles.topSkipPlaceholder} aria-hidden="true" />
        )}
      </header>

      <div className={styles.content}>
        <div className={styles.top}>
          {glyph && <div className={styles.glyph} aria-hidden="true">{glyph}</div>}
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>

        <div className={styles.bottom}>
          {title && <h1 className={styles.title}>{title}</h1>}
          {body && <p className={styles.body}>{body}</p>}
          {sub && <p className={styles.sub}>{sub}</p>}

          {children}

          {ctaLabel && (
            <button
              type="button"
              className={`${styles.cta} ${ctaSubmitting ? styles.ctaSubmitting : ''}`}
              onClick={onContinue}
              disabled={ctaDisabled || ctaSubmitting}
              aria-disabled={ctaDisabled || ctaSubmitting || undefined}
              aria-busy={ctaSubmitting || undefined}
            >
              {ctaSubmitting ? (
                <>
                  <span className={styles.ctaSpin} aria-hidden="true" />
                  Guardando…
                </>
              ) : ctaLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ProgressDots({ current, total, dark }) {
  const cls = [styles.dots, dark && styles.dotsDark].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`Paso ${current + 1} de ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            styles.dot,
            i < current && styles.dotDone,
            i === current && styles.dotOn,
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
