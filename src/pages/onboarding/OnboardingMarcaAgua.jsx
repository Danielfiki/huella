// OnboardingMarcaAgua.jsx
// El escarabajo mono detras de cada pantalla del onboarding.
//
// Una por pantalla, siempre detras del contenido (z-index 0; el contenido va
// en 1) y nunca bajo el bloque de texto principal: por eso la posicion rota
// por paso y la caja (430x494) sangra fuera del encuadre. Tinte mocha, con la
// opacidad de --opacity-watermark (7% claro / 8% oscuro); el acto B usa las
// dos variantes suaves porque tiene mas texto encima.
//
// Path: src/pages/onboarding/OnboardingMarcaAgua.jsx

import React from 'react';
import Logo from '../../components/ui/Logo';
import styles from './OnboardingMarcaAgua.module.css';

/**
 * Props
 *   variante  'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'b1' | 'b2' | 'c'
 *             · define posicion, rotacion y opacidad (ver el .module.css)
 */
export default function OnboardingMarcaAgua({ variante = 'a1' }) {
  const claseVariante = styles[variante] || styles.a1;
  return (
    <div className={`${styles.marca} ${claseVariante}`} aria-hidden="true">
      <Logo soloSimbolo className={styles.svg} />
    </div>
  );
}
