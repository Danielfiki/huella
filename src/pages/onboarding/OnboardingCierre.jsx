// OnboardingCierre.jsx
// Acto C · cierre de confianza. Entre la respuesta del acto B (o su "Saltar")
// y la llegada al Home.
//
// Muestra las voces detras de Huella en la etapa del hijo: 5-6 autores del
// banco AUTORES con su lente, priorizando los que aplican a la edad del acto
// A, y la cuenta exacta del corpus completo (AUTORES_CORPUS). El titulo NO
// atribuye el texto del acto B a estos autores (son una muestra del corpus,
// no la fuente de esa respuesta). Un solo CTA: "Entrar a Huella". Sin
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
import { autoresParaCierre, TOTAL_AUTORES_CORPUS } from '../../services/anthropic';
import OnboardingMarcaAgua from './OnboardingMarcaAgua';

// "mas de 80" cuando el corpus tiene 82. Decena inferior, calculada: la frase
// sigue siendo cierta aunque el corpus crezca de a uno, y salta sola a "mas
// de 90" cuando toque.
const N_REDONDO = Math.floor(TOTAL_AUTORES_CORPUS / 10) * 10;

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

  // El titulo ya no atribuye el texto del acto B a estos 6 autores (son una
  // muestra del corpus, elegida por la edad del acto A). Nombra la etapa del
  // hijo, con su nombre. El acto A no deja avanzar sin nombre, asi que el
  // fallback solo cubre un estado imposible sin romper la frase.
  const quien = (hijo?.nombre || '').trim();
  const titulo = quien
    ? `Las voces detrás de Huella en la etapa de ${quien}`
    : 'Las voces detrás de Huella en esta etapa';

  return (
    <section className={styles.acto} aria-hidden={!active}>
      <OnboardingMarcaAgua variante="c" />
      <header className={styles.head}>
        <p className={styles.eyebrow}>Antes de entrar</p>
        <h1 className={styles.title}>{titulo}</h1>
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

        {/* Corpus completo (AUTORES_CORPUS en anthropic.js), no solo el banco
            de la Accion Rapida: 82 autores reales entre el banco, los marcos
            por edad y los temas contemporaneos, redondeados a la decena. */}
        <p className={styles.cuenta}>
          Huella se apoya en el trabajo de más de {N_REDONDO} expertos en crianza y desarrollo infantil y juvenil.
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
