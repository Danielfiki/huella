// OnboardingFormSlide.jsx
// Plantilla del slide 4 · "Sistema" · entrada al producto.
// Cabecera mocha alta + tres bloques de formulario sobre crema.
//
// Path: src/pages/onboarding/OnboardingFormSlide.jsx

import React, { useRef } from 'react';
import styles from './OnboardingFormSlide.module.css';

// Set fijo y validado. Si producto agrega/quita opciones: actualizar SOLO aquí.
const INTENCIONES = [
  'Entender berrinches',
  'Manejar pantallas',
  'Comunicarme mejor',
  'Sueño y rutinas',
  'Las rabietas del día a día',
  'Solo explorar',
];

const SEXOS = ['Niño', 'Niña', 'Otro'];

/**
 * Props
 *   perfil       objeto · forma definida en Onboarding.jsx EMPTY_PERFIL
 *   setPerfil    (patch) => void · merge superficial
 *   slideIndex   number (3)
 *   totalSlides  number (5)
 *   onTopSkip    () => void
 *   onContinue   () => void   · sólo se invoca si isValid es true
 */
export default function OnboardingFormSlide({
  perfil,
  setPerfil,
  slideIndex,
  totalSlides,
  onTopSkip,
  onContinue,
}) {
  const fileRef = useRef(null);

  const isValid =
    perfil.nombrePadre.trim().length > 0 &&
    perfil.nombreHijo.trim().length > 0 &&
    perfil.nacimiento.dia &&
    perfil.nacimiento.mes &&
    perfil.nacimiento.anio &&
    perfil.sexo != null &&
    perfil.intenciones.length > 0;

  const toggleIntencion = (label) => {
    const next = perfil.intenciones.includes(label)
      ? perfil.intenciones.filter((i) => i !== label)
      : [...perfil.intenciones, label];
    setPerfil({ intenciones: next });
  };

  const setNacimiento = (key, raw) => {
    // sólo dígitos
    const value = raw.replace(/\D/g, '');
    setPerfil({ nacimiento: { ...perfil.nacimiento, [key]: value } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) onContinue();
  };

  return (
    <section className={styles.slide}>
      {/* ── Header mocha ─────────────────────────────────────── */}
      <header className={styles.moBand}>
        <div className={styles.topbar}>
          <ProgressDots current={slideIndex} total={totalSlides} />
          <button
            type="button"
            className={styles.topSkip}
            onClick={onTopSkip}
          >
            Saltar
          </button>
        </div>
        <span className={styles.badge}>Personalicemos tu experiencia</span>
        <h1 className={styles.title}>Cuéntanos un poco de ti</h1>
        <p className={styles.sub}>Tres bloques. Toma menos de un minuto.</p>
      </header>

      {/* ── Formulario ────────────────────────────────────────── */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        {/* Bloque A · Sobre ti */}
        <fieldset className={styles.group}>
          <legend className={styles.groupLbl}>Sobre ti</legend>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nombre</span>
            <input
              type="text"
              className={styles.input}
              placeholder="Tu nombre"
              value={perfil.nombrePadre}
              onChange={(e) => setPerfil({ nombrePadre: e.target.value })}
              autoComplete="given-name"
              maxLength={60}
            />
          </label>
        </fieldset>

        {/* Bloque B · Sobre tu hijo/a */}
        <fieldset className={styles.group}>
          <legend className={styles.groupLbl}>Sobre tu hijo/a</legend>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Nombre</span>
            <input
              type="text"
              className={styles.input}
              placeholder="Nombre de tu hijo/a"
              value={perfil.nombreHijo}
              onChange={(e) => setPerfil({ nombreHijo: e.target.value })}
              maxLength={60}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Nacimiento</span>
            <div className={styles.dateRow}>
              <input
                className={`${styles.input} ${styles.dateInput}`}
                placeholder="DD"
                inputMode="numeric"
                maxLength={2}
                value={perfil.nacimiento.dia}
                onChange={(e) => setNacimiento('dia', e.target.value)}
                aria-label="Día"
              />
              <input
                className={`${styles.input} ${styles.dateInput}`}
                placeholder="MM"
                inputMode="numeric"
                maxLength={2}
                value={perfil.nacimiento.mes}
                onChange={(e) => setNacimiento('mes', e.target.value)}
                aria-label="Mes"
              />
              <input
                className={`${styles.input} ${styles.dateInput}`}
                placeholder="AAAA"
                inputMode="numeric"
                maxLength={4}
                value={perfil.nacimiento.anio}
                onChange={(e) => setNacimiento('anio', e.target.value)}
                aria-label="Año"
              />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Sexo</span>
            <div
              className={styles.chiprow}
              role="radiogroup"
              aria-label="Sexo"
            >
              {SEXOS.map((s) => {
                const selected = perfil.sexo === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`${styles.chip} ${selected ? styles.chipOn : ''}`}
                    onClick={() => setPerfil({ sexo: s })}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Foto · opcional</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className={styles.fileHidden}
              onChange={(e) =>
                setPerfil({ fotoBlob: e.target.files?.[0] || null })
              }
            />
            {perfil.fotoBlob ? (
              <button
                type="button"
                className={styles.photoChip}
                onClick={() => fileRef.current?.click()}
              >
                <span className={styles.photoIconCheck} aria-hidden="true">✓</span>
                {truncateName(perfil.fotoBlob.name)} · cambiar
              </button>
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
          </div>
        </fieldset>

        {/* Bloque C · Intenciones */}
        <fieldset className={styles.group}>
          <legend className={styles.groupLbl}>¿Qué te trae a Huella?</legend>
          <div
            className={styles.chiprow}
            role="group"
            aria-label="Intenciones"
          >
            {INTENCIONES.map((i) => {
              const selected = perfil.intenciones.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.chip} ${selected ? styles.chipOn : ''}`}
                  onClick={() => toggleIntencion(i)}
                >
                  {i}
                </button>
              );
            })}
          </div>
          <p className={styles.microcopy}>
            Esto ayuda a Huella a entenderte mejor desde el principio.
          </p>
        </fieldset>

        <button
          type="submit"
          className={styles.cta}
          disabled={!isValid}
          aria-disabled={!isValid || undefined}
        >
          Continuar
        </button>
      </form>
    </section>
  );
}

function ProgressDots({ current, total }) {
  return (
    <div
      className={styles.dots}
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
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function truncateName(name) {
  if (!name) return '';
  if (name.length <= 18) return name;
  return name.slice(0, 12) + '…' + name.slice(-4);
}
