// OnboardingFormSlide.jsx
// Slide 4 · entrada al producto.
// Flujo conversacional: una pregunta visible a la vez, fade entre pasos,
// barra de progreso tangerine arriba, botón Atrás sutil, "Saltar" global,
// "Continuar" abajo activo solo cuando la respuesta del paso es válida.
//
// Mantiene el shape del objeto `perfil` definido en Onboarding.jsx (EMPTY_PERFIL),
// para no tocar `onboardingPersistor.js`. Esto incluye seguir guardando
// `nacimiento` como { dia, mes, anio } en strings con padding, aunque el input
// ahora sea un date picker nativo único.
//
// Path: src/pages/onboarding/OnboardingFormSlide.jsx

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './OnboardingFormSlide.module.css';
import ProgressBar from '../../components/ui/ProgressBar';
import SelectorFechaNacimiento from '../../components/ui/SelectorFechaNacimiento';

// Codigos de genero. Son los MISMOS que guardan HijoPage.jsx y PerfilPage.jsx,
// y los mismos que lee analizarEpisodio para elegir pronombres.
//
// 🪤 Antes aca vivian las etiquetas sueltas ('Niño'/'Niña'/'Otro') y viajaban
// crudas hasta hijos.genero. La IA compara contra 'm'/'f'/'nb', asi que nunca
// matcheaban: toda cuenta creada por el onboarding recibia orientacion en
// generico ("niño/a", "él/ella") aunque el padre hubiera respondido la pregunta.
const SEXOS = [
  { valor: 'm',  label: 'Niño' },
  { valor: 'f',  label: 'Niña' },
  { valor: 'nb', label: 'Otro' },
];

// Duración del fade entre pasos. Debe coincidir con la transition del CSS
// (.stepWrap → opacity 200ms ease-out + transform 200ms ease-out).
const STEP_FADE_MS = 200;

// 5 pasos: nombre del cuidador, nombre del hijo, nacimiento, genero y foto.
// Se elimino el sexto ("¿Que te trae a Huella?"): era obligatorio para avanzar
// y su respuesta se escribia en perfiles.intenciones, columna que ninguna
// pantalla ni prompt lee jamas. Pedia un dato para no usarlo.
const TOTAL_STEPS = 5;

/**
 * Props
 *   active       bool   · true cuando este slide está en el viewport del shell.
 *                          Sin esto, montar el componente con autoFocus en sus
 *                          inputs dispara scrollIntoView del browser y rompe
 *                          el track horizontal del Onboarding (los slides
 *                          previos quedan invisibles aunque estén montados).
 *   perfil       objeto · forma definida en Onboarding.jsx EMPTY_PERFIL
 *   setPerfil    (patch) => void · merge superficial
 *   onContinue   () => void · avanza al acto B
 *
 * Sin `onTopSkip`: el acto A dejó de ser saltable (los datos del hijo son
 * lo que hace funcionar la app).
 */
export default function OnboardingFormSlide({
  active,
  perfil,
  setPerfil,
  onContinue,
}) {
  const [step, setStep] = useState(0);
  // 'in' = visible, 'out' = saliendo (fade-out antes de cambiar step)
  const [phase, setPhase] = useState('in');
  const pendingStepRef = useRef(null);
  const fileRef = useRef(null);
  // Ref para el input/control del paso actual. Lo enfocamos manualmente
  // (no con autoFocus) y solo cuando el slide está activo en el shell —
  // si no, el browser hace scrollIntoView al input oculto fuera del
  // viewport del track horizontal y rompe el flujo de slides previos.
  const stepFieldRef = useRef(null);

  // ─── Validación por paso ────────────────────────────────────────
  const isStepValid = (() => {
    switch (step) {
      case 0: return perfil.nombrePadre.trim().length > 0;
      case 1: return perfil.nombreHijo.trim().length > 0;
      case 2: return (
        perfil.nacimiento.dia &&
        perfil.nacimiento.mes &&
        perfil.nacimiento.anio
      );
      case 3: return perfil.sexo != null;
      case 4: return true; // foto opcional
      default: return false;
    }
  })();

  // ─── Navegación con fade ────────────────────────────────────────
  const goToStep = useCallback((nextStep) => {
    if (nextStep < 0 || nextStep >= TOTAL_STEPS) return;
    pendingStepRef.current = nextStep;
    setPhase('out');
  }, []);

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const id = setTimeout(() => {
      if (pendingStepRef.current != null) {
        setStep(pendingStepRef.current);
        pendingStepRef.current = null;
      }
      setPhase('in');
    }, STEP_FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  // Focus condicional: solo cuando el slide está activo en el shell y el
  // paso terminó el fade-in. preventScroll evita que algún ancestor con
  // overflow oculto intente scrollear al recibir foco.
  useEffect(() => {
    if (!active) return;
    if (phase !== 'in') return;
    const el = stepFieldRef.current;
    if (!el || typeof el.focus !== 'function') return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, [active, phase, step]);

  const goNext = useCallback(() => {
    if (!isStepValid) return;
    if (step >= TOTAL_STEPS - 1) {
      onContinue();
      return;
    }
    goToStep(step + 1);
  }, [step, isStepValid, goToStep, onContinue]);

  const goPrev = useCallback(() => {
    if (step === 0) return;
    goToStep(step - 1);
  }, [step, goToStep]);

  const handleSubmit = (e) => {
    e.preventDefault();
    goNext();
  };

  // ─── Helpers de campos ──────────────────────────────────────────
  // Parsea 'YYYY-MM-DD' del <input type="date"> al shape { dia, mes, anio }
  // que el persistor espera. Si viene vacío, limpiamos los 3 campos.
  const onFechaChange = (raw) => {
    if (!raw) {
      setPerfil({ nacimiento: { dia: '', mes: '', anio: '' } });
      return;
    }
    const [anio, mes, dia] = raw.split('-');
    setPerfil({ nacimiento: { dia, mes, anio } });
  };

  // Valor en 'YYYY-MM-DD' para el input controlado (o '' si falta algo).
  const fechaValor = (() => {
    const { dia, mes, anio } = perfil.nacimiento;
    if (!dia || !mes || !anio) return '';
    return `${anio}-${mes}-${dia}`;
  })();

  // Saludo personalizado en el paso 1 si el padre/madre ya dejó su nombre.
  const nombrePadreLimpio = perfil.nombrePadre.trim();
  const nombreHijoLimpio = perfil.nombreHijo.trim();

  // Preview de la foto del hijo. Generamos un object URL local del File
  // (sin subir nada — el upload real lo hace el persistor al cerrar el
  // onboarding) para mostrar avatar circular en vez del nombre del archivo.
  // Revocamos el URL anterior cada vez que cambia el blob o al desmontar
  // para no filtrar memoria.
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState(null);
  useEffect(() => {
    if (!perfil.fotoBlob) {
      setFotoPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(perfil.fotoBlob);
    setFotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [perfil.fotoBlob]);

  const STEPS = [
    {
      eyebrow: 'Sobre ti',
      title: '¿Cómo te llamas?',
      hint: 'Para que Huella te hable por tu nombre.',
      content: (
        <input
          key="step-0"
          ref={stepFieldRef}
          type="text"
          className={styles.input}
          placeholder="Tu nombre"
          value={perfil.nombrePadre}
          onChange={(e) => setPerfil({ nombrePadre: e.target.value })}
          autoComplete="given-name"
          maxLength={60}
          aria-label="Tu nombre"
        />
      ),
    },
    {
      eyebrow: 'Sobre tu hijo o hija',
      title: nombrePadreLimpio
        ? `Un gusto, ${nombrePadreLimpio}. ¿Y cómo se llama tu hijo o hija?`
        : '¿Cómo se llama tu hijo o hija?',
      hint: null,
      content: (
        <input
          key="step-1"
          ref={stepFieldRef}
          type="text"
          className={styles.input}
          placeholder="Su nombre"
          value={perfil.nombreHijo}
          onChange={(e) => setPerfil({ nombreHijo: e.target.value })}
          maxLength={60}
          aria-label="Nombre de tu hijo o hija"
        />
      ),
    },
    {
      eyebrow: 'Cuándo nació',
      title: nombreHijoLimpio
        ? `¿Cuándo nació ${nombreHijoLimpio}?`
        : '¿Cuándo nació tu hijo o hija?',
      hint: null,
      content: (
        // Tres <select> en vez del <input type="date"> nativo: el calendario
        // de Chrome Android abria en el mes actual y para un hijo de 3 anios
        // eran ~36 toques al boton de mes anterior (QA del 2 sep 2026). El
        // tope de "no futuro" que daba `max` ahora lo hace el componente
        // filtrando meses y dias del anio en curso.
        <SelectorFechaNacimiento
          key="step-2"
          ref={stepFieldRef}
          value={fechaValor}
          onChange={onFechaChange}
        />
      ),
    },
    {
      eyebrow: 'Sexo',
      title: nombreHijoLimpio
        ? `¿${nombreHijoLimpio} es niño, niña u otro?`
        : '¿Es niño, niña u otro?',
      hint: null,
      content: (
        <div
          className={styles.bigChiprow}
          role="radiogroup"
          aria-label="Sexo de tu hijo o hija"
        >
          {SEXOS.map(({ valor, label }) => {
            const selected = perfil.sexo === valor;
            return (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.bigChip} ${selected ? styles.bigChipOn : ''}`}
                onClick={() => setPerfil({ sexo: valor })}
              >
                {label}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      eyebrow: 'Foto · opcional',
      title: nombreHijoLimpio
        ? `¿Quieres agregar una foto de ${nombreHijoLimpio}?`
        : '¿Quieres agregar una foto?',
      hint: 'Te ayuda a sentir más cercana la app. Puedes saltarlo y agregarla después.',
      content: (
        <div className={styles.photoStack}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className={styles.fileHidden}
            onChange={(e) =>
              setPerfil({ fotoBlob: e.target.files?.[0] || null })
            }
          />
          {fotoPreviewUrl ? (
            <>
              <button
                type="button"
                className={styles.photoPreviewBtn}
                onClick={() => fileRef.current?.click()}
                aria-label="Cambiar foto"
              >
                <img
                  src={fotoPreviewUrl}
                  alt=""
                  className={styles.photoPreviewImg}
                />
              </button>
              <button
                type="button"
                className={styles.photoChangeBtn}
                onClick={() => fileRef.current?.click()}
              >
                Cambiar foto
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => fileRef.current?.click()}
            >
              <span className={styles.photoIconPlus} aria-hidden="true">+</span>
              Agregar foto
            </button>
          )}
          <button
            type="button"
            className={styles.skipStep}
            onClick={goNext}
          >
            Saltar este paso
          </button>
        </div>
      ),
    },
  ];

  const current = STEPS[step];
  const progressValue = ((step + 1) / TOTAL_STEPS) * 100;
  const ctaLabel = step === TOTAL_STEPS - 1 ? 'Continuar' : 'Continuar';

  return (
    <section className={styles.slide}>
      {/* ── Barra superior ─────────────────────────────────────── */}
      <header className={styles.topband}>
        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={goPrev}
            disabled={step === 0}
            aria-label="Volver al paso anterior"
            aria-disabled={step === 0 || undefined}
          >
            <span aria-hidden="true">←</span>
          </button>
          <ProgressBar
            value={progressValue}
            phase="determinate"
            tone="onLight"
            color="var(--color-tangerine)"
            label={`Paso ${step + 1} de ${TOTAL_STEPS}`}
            className={styles.progress}
          />
          {/* Sin "Saltar". El nombre y la fecha de nacimiento del hijo no son
              un tramite: la edad alimenta el Cerebro Huella y todos los marcos
              por edad. Saltarlos dejaba una cuenta a medias y el onboarding
              reapareciendo cada sesion, porque `yaTieneCuenta` seguia en false.
              El espaciador conserva el centrado de la barra de progreso. */}
          <span className={styles.topSpacer} aria-hidden="true" />
        </div>
      </header>

      {/* ── Cuerpo conversacional ──────────────────────────────── */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div
          className={`${styles.stepWrap} ${phase === 'out' ? styles.stepOut : styles.stepIn}`}
          key={step}
        >
          <span className={styles.eyebrow}>{current.eyebrow}</span>
          <h1 className={styles.title}>{current.title}</h1>
          {current.hint && <p className={styles.hint}>{current.hint}</p>}
          <div className={styles.fieldWrap}>{current.content}</div>
        </div>

        <div className={styles.ctaBar}>
          <button
            type="submit"
            className={styles.cta}
            disabled={!isStepValid}
            aria-disabled={!isStepValid || undefined}
          >
            {ctaLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

