// Onboarding.jsx
// Shell del onboarding · 5 slides · concepto Susurro.
//
// Maneja: state machine, swipe lateral, transición horizontal entre slides,
// y el objeto `perfil` que se completa en slide 4 y se persiste en `onComplete`.
//
// Path: src/pages/onboarding/Onboarding.jsx
//
// El parent (Router u OnboardingGate) llama:
//   <Onboarding onComplete={(perfil) => …} onSkip={() => …} />
// y decide qué hacer con el `perfil` (persistir en Supabase, navegar a Home, etc).

import React, { useState, useCallback, useRef } from 'react';
import styles from './Onboarding.module.css';
import OnboardingBottomSlide from './OnboardingBottomSlide';
import OnboardingFormSlide from './OnboardingFormSlide';
import OnboardingComposer from './OnboardingComposer';

const SLIDE_COUNT = 5;
const SWIPE_THRESHOLD_PX = 60;

const EMPTY_PERFIL = {
  nombrePadre: '',
  nombreHijo: '',
  nacimiento: { dia: '', mes: '', anio: '' },
  sexo: null,        // 'Niño' | 'Niña' | 'Otro' · key local; el persistor lo mapea a hijos.genero
  fotoBlob: null,    // File · opcional · el persistor lo sube a Storage y guarda hijos.avatar_url
  intenciones: [],   // string[] del set fijo (ver OnboardingFormSlide) · perfiles.intenciones text[]
  contextoInicial: null, // texto del slide 3 si lo escribió · opcional · perfiles.contexto_inicial
};

/**
 * Props
 *   onComplete  (perfil) => void   · slide 5 "Empezar ahora"
 *   onSkip      ()       => void   · botón "Saltar" arriba en slides 1, 2, 4
 */
export default function Onboarding({ onComplete, onSkip }) {
  const [index, setIndex] = useState(0);
  const [perfil, setPerfil] = useState(EMPTY_PERFIL);

  const goNext = useCallback(() => {
    setIndex(i => Math.min(i + 1, SLIDE_COUNT - 1));
  }, []);

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(i - 1, 0));
  }, []);

  const finish = useCallback(() => onComplete(perfil), [onComplete, perfil]);

  // patchPerfil({ nombrePadre: 'Camila' }) → merge superficial
  const patchPerfil = useCallback((patch) => {
    setPerfil(p => ({ ...p, ...patch }));
  }, []);

  // Slide 3 termina con contexto opcional. Si vino texto, persistirlo.
  const onSubmitContexto = useCallback((texto) => {
    if (texto && texto.trim()) {
      setPerfil(p => ({ ...p, contextoInicial: texto.trim() }));
    }
    goNext();
  }, [goNext]);

  // ── Swipe ─────────────────────────────────────────────────────────
  // Permitido en cualquier dirección. NO bloqueamos swipe-forward del slide 4
  // aunque el form esté incompleto: el CTA "Continuar" sí lo valida. Esta es la
  // decisión de no obstruir el gesto natural.
  const touchStartX = useRef(null);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  // Badge personalizado del slide 5 — forma corta para evitar overflow.
  // Si nombrePadre viene vacío (caso usuario que saltó slide 4 sin completar),
  // el badge degrada a "Bienvenido/a a Huella" sin nombre.
  const badgeAfirmacion = perfil.nombrePadre.trim().length > 0
    ? `Bienvenido/a, ${perfil.nombrePadre.trim()}`
    : 'Bienvenido/a a Huella';

  return (
    <div
      className={styles.shell}
      role="region"
      aria-label="Bienvenida a Huella"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {/* ── Slide 1 · Gancho ────────────────────────────────── */}
        <div className={styles.slide} aria-hidden={index !== 0}>
          <OnboardingBottomSlide
            palette="noche"
            glyph="🌙"
            badge="Te entendemos"
            title="Son las 11pm y no sabes qué hacer"
            body="Tu hijo llora, explota, o simplemente se desconecta. Estás agotado/a, te sientes solo/a, y nadie te enseñó cómo manejar esto."
            sub="Estás haciendo lo mejor que puedes. Huella te ayuda a hacer más."
            ctaLabel="Continuar"
            slideIndex={0}
            totalSlides={SLIDE_COUNT}
            showTopSkip
            onTopSkip={onSkip}
            onContinue={goNext}
          />
        </div>

        {/* ── Slide 2 · Promesa ───────────────────────────────── */}
        <div className={styles.slide} aria-hidden={index !== 1}>
          <OnboardingBottomSlide
            palette="amanecer"
            glyph="📖"
            badge="Ciencia real · Lenguaje humano"
            title="No estás adivinando. Estás aprendiendo."
            body="Huella integra el trabajo de Daniel Siegel, Bessel van der Kolk y decenas de los referentes más reconocidos en desarrollo infantil para darte orientación concreta, sin tecnicismos ni juicios."
            sub="Orientación real para lo que está pasando hoy con tu hijo/a."
            ctaLabel="Continuar"
            slideIndex={1}
            totalSlides={SLIDE_COUNT}
            showTopSkip
            onTopSkip={onSkip}
            onContinue={goNext}
          />
        </div>

        {/* ── Slide 3 · Corazón (composer) ────────────────────── */}
        <div className={styles.slide} aria-hidden={index !== 2}>
          <OnboardingBottomSlide
            palette="encuentro"
            glyph="💬"
            badge="Pruébalo ahora"
            title="Cuéntale a Huella algo que te haya pasado"
            slideIndex={2}
            totalSlides={SLIDE_COUNT}
            showTopSkip={false}
            // Sin body/sub/ctaLabel — el contenido vive en OnboardingComposer
          >
            <OnboardingComposer
              active={index === 2}
              onSubmit={onSubmitContexto}
              onSkipInline={goNext}
            />
          </OnboardingBottomSlide>
        </div>

        {/* ── Slide 4 · Sistema (formulario) ──────────────────── */}
        <div className={styles.slide} aria-hidden={index !== 3}>
          <OnboardingFormSlide
            active={index === 3}
            perfil={perfil}
            setPerfil={patchPerfil}
            slideIndex={3}
            totalSlides={SLIDE_COUNT}
            onTopSkip={onSkip}
            onContinue={goNext}
          />
        </div>

        {/* ── Slide 5 · Afirmación ────────────────────────────── */}
        <div className={styles.slide} aria-hidden={index !== 4}>
          <OnboardingBottomSlide
            palette="afirmacion"
            glyph="✨"
            badge={badgeAfirmacion}
            title="Tu hijo tiene suerte de tenerte aquí"
            body="El solo hecho de que estés buscando entender mejor a tu hijo/a ya dice todo de ti como padre o madre."
            sub="Empieza registrando tu primer episodio. El primer paso es el más importante."
            ctaLabel="Empezar ahora →"
            slideIndex={4}
            totalSlides={SLIDE_COUNT}
            showTopSkip={false}
            onContinue={finish}
          />
        </div>
      </div>
    </div>
  );
}
