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
import SelectorFechaNacimiento from '../../components/ui/SelectorFechaNacimiento';
import OnboardingMarcaAgua from './OnboardingMarcaAgua';
// La copia local que tenian PerfilPage y NuevoPage no se replica aca: el
// propio archivo de utils pide que quien lo toque importe esta.
import comprimirImagen from '../../utils/comprimirImagen';

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

// Lado maximo de las fotos que se suben. 400px es lo que ya usaba Perfil para
// los avatares: son circulos chicos, no vale la pena subir la foto cruda de la
// camara (varios MB) para mostrarla a 120px.
const FOTO_MAX_PX = 400;

// Object URL de un blob, revocado al cambiar o al desmontar. Vive aca y no en
// utils porque solo el paso de las fotos lo necesita, y lo necesita dos veces.
function usePreviewUrl(blob) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return undefined;
    }
    const nuevo = URL.createObjectURL(blob);
    setUrl(nuevo);
    return () => URL.revokeObjectURL(nuevo);
  }, [blob]);
  return url;
}

/**
 * Un slot de foto: circulo tocable que abre camara o galeria y muestra la
 * miniatura una vez elegida. Los dos slots del paso 5 son el mismo componente,
 * asi que la foto del hijo y la del adulto no se pueden desalinear.
 */
function SlotFoto({ inputRef, previewUrl, etiqueta, onArchivo }) {
  const abrir = () => inputRef.current?.click();
  return (
    <div className={styles.photoSlot}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.fileHidden}
        onChange={(e) => onArchivo(e.target.files?.[0] || null)}
      />
      <button
        type="button"
        className={previewUrl ? styles.photoPreviewBtn : styles.photoEmptyBtn}
        onClick={abrir}
        aria-label={previewUrl ? `Cambiar la foto de ${etiqueta}` : `Agregar la foto de ${etiqueta}`}
      >
        {previewUrl
          ? <img src={previewUrl} alt="" className={styles.photoPreviewImg} />
          : <span className={styles.photoIconPlus} aria-hidden="true">+</span>}
      </button>
      <span className={styles.photoLabel}>{etiqueta}</span>
    </div>
  );
}

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
  const fileRefPadre = useRef(null);
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

  // Preview local de cada foto. Generamos un object URL del blob (sin subir
  // nada — el upload real lo hace el persistor al cerrar el onboarding) para
  // mostrar el avatar circular en vez del nombre del archivo. Revocamos el URL
  // anterior cada vez que cambia el blob y al desmontar, para no filtrar
  // memoria. Un solo hook para los dos slots: antes esto existia una vez y
  // duplicarlo era la via facil.
  const fotoPreviewUrl      = usePreviewUrl(perfil.fotoBlob);
  const fotoPadrePreviewUrl = usePreviewUrl(perfil.fotoPadreBlob);

  // Comprime a 400px ANTES de guardar el blob en el estado, asi lo que se ve
  // en el slot es exactamente lo que se va a subir. Si la imagen no se puede
  // decodificar, comprimirImagen devuelve null y dejamos el slot vacio: la
  // foto es opcional y no debe trabar el paso.
  const elegirFoto = useCallback(async (clave, file) => {
    if (!file) {
      setPerfil({ [clave]: null });
      return;
    }
    const blob = await comprimirImagen(file, FOTO_MAX_PX);
    setPerfil({ [clave]: blob || null });
  }, [setPerfil]);

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
      // El "opcional" del eyebrow ahora es una pill strawberry al lado de
      // la palabra, en vez de ir separado por " · ": mismas palabras, otra
      // forma. Es el unico paso con pill.
      eyebrow: 'Fotos',
      pill: 'Opcional',
      title: 'Pongámosle cara a Huella',
      hint: 'Las dos son opcionales y las puedes cambiar cuando quieras desde tu perfil.',
      content: (
        /* Se elimino el "Saltar este paso": hacia exactamente lo mismo que
           "Continuar" (los dos llamaban a goNext en el ultimo paso), y con dos
           slots opcionales dos botones que hacen lo mismo solo confunden. */
        <div className={styles.photoRow}>
          <SlotFoto
            inputRef={fileRef}
            previewUrl={fotoPreviewUrl}
            etiqueta={nombreHijoLimpio || 'Tu hijo o hija'}
            onArchivo={(f) => elegirFoto('fotoBlob', f)}
          />
          <SlotFoto
            inputRef={fileRefPadre}
            previewUrl={fotoPadrePreviewUrl}
            etiqueta="Tu foto"
            onArchivo={(f) => elegirFoto('fotoPadreBlob', f)}
          />
        </div>
      ),
    },
  ];

  const current = STEPS[step];
  const ctaLabel = step === TOTAL_STEPS - 1 ? 'Continuar' : 'Continuar';

  return (
    <section className={styles.slide}>
      {/* Escarabajo de fondo. La esquina rota con el paso (a1…a5). */}
      <OnboardingMarcaAgua variante={`a${step + 1}`} />

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
          {/* Progreso en 5 segmentos, uno por paso. Los completados y el
              actual van en tangerine; los pendientes en --color-border. Es
              local a proposito: ProgressBar (continua) sigue sirviendo a las
              otras tres pantallas que la usan. */}
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={step + 1}
            aria-label={`Paso ${step + 1} de ${TOTAL_STEPS}`}
          >
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`${styles.segmento} ${i <= step ? styles.segmentoOn : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>
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
          <span className={styles.eyebrow}>
            {current.eyebrow}
            {current.pill && <span className={styles.pill}>{current.pill}</span>}
          </span>
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

