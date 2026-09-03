// OnboardingCierre.jsx
// Acto C · cierre de confianza. Entre la respuesta del acto B (o su "Saltar")
// y la llegada al Home.
//
// Muestra de donde viene lo que el padre acaba de leer: 5-6 autores del banco
// AUTORES con su lente, priorizando los que aplican a la edad del hijo del
// acto A, y la cuenta real del banco. Un solo CTA: "Entrar a Huella". Sin
// "Saltar": esta pantalla no pide nada, solo tapa la espera del guardado.
//
// El persistor ya esta corriendo cuando este acto aparece (lo dispara
// Onboarding.jsx al salir del acto B). Aca solo se refleja su estado:
//   pending → el CTA entra apenas termine (si el padre ya toco, espera solo)
//   ok      → el CTA cierra el onboarding
//   error   → aviso + "Reintentar", igual que hacia el acto B
//
// Path: src/pages/onboarding/OnboardingCierre.jsx

import React, { useState, useEffect, useMemo } from 'react';
import styles from './OnboardingCierre.module.css';
import { autoresParaCierre, TOTAL_AUTORES } from '../../services/anthropic';

// "mas de 20" cuando el banco tiene 23. Redondea hacia abajo a la decena para
// que la frase siga siendo cierta aunque el banco crezca de a uno.
const N_REDONDO = Math.floor(TOTAL_AUTORES / 10) * 10;

/**
 * Props
 *   active         bool   · el acto esta visible en el track
 *   hijo           object · { nombre, edad, genero } del acto A
 *   saltoActoB     bool   · el padre no escribio nada en el acto B → autores
 *                           transversales en vez de los de la edad
 *   persistStatus  'pending' | 'ok' | 'error'
 *   onEntrar       () => void · cierra el onboarding (solo con status ok)
 *   onReintentar   () => void · vuelve a lanzar el guardado (status error)
 */
export default function OnboardingCierre({
  active,
  hijo,
  saltoActoB = false,
  persistStatus = 'pending',
  onEntrar,
  onReintentar,
}) {
  // El padre toco "Entrar" mientras el guardado seguia corriendo: entramos
  // solos apenas termine, sin pedirle un segundo toque.
  const [quiereEntrar, setQuiereEntrar] = useState(false);

  const autores = useMemo(
    () => autoresParaCierre(saltoActoB ? null : hijo?.edad, 6),
    [saltoActoB, hijo?.edad]
  );

  useEffect(() => {
    if (quiereEntrar && persistStatus === 'ok') onEntrar?.();
  }, [quiereEntrar, persistStatus, onEntrar]);

  // Si el reintento vuelve a fallar, el toque previo no debe quedar armado.
  useEffect(() => {
    if (persistStatus === 'error') setQuiereEntrar(false);
  }, [persistStatus]);

  const handleCta = () => {
    if (persistStatus === 'error') {
      onReintentar?.();
      return;
    }
    if (persistStatus === 'ok') {
      onEntrar?.();
      return;
    }
    setQuiereEntrar(true);
  };

  const esperando = persistStatus === 'pending' && quiereEntrar;
  const ctaLabel =
    persistStatus === 'error' ? 'Reintentar'
    : esperando ? 'Guardando…'
    : 'Entrar a Huella';

  return (
    <section className={styles.acto} aria-hidden={!active}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Antes de entrar</p>
        <h1 className={styles.title}>Lo que acabas de leer viene de acá</h1>
      </header>

      <div className={styles.wrap}>
        <ul className={styles.lista} aria-label="Autores en los que se apoya Huella">
          {autores.map(({ autor, lente }) => (
            <li key={autor} className={styles.fila}>
              <span className={styles.autor}>{autor}</span>
              <span className={styles.sep} aria-hidden="true"> · </span>
              <span className={styles.lente}>{lente}</span>
            </li>
          ))}
        </ul>

        <p className={styles.cuenta}>
          Huella trabaja con más de {N_REDONDO} autores de ciencia del desarrollo.
        </p>

        {persistStatus === 'error' && (
          <p role="alert" className={styles.error}>
            No pudimos guardar tus datos. Revisa tu conexión y vuelve a intentar.
          </p>
        )}

        <button
          type="button"
          className={styles.cta}
          onClick={handleCta}
          disabled={esperando}
          aria-disabled={esperando || undefined}
        >
          {esperando && <span className={styles.spin} aria-hidden="true" />}
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}
