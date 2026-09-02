// Onboarding.jsx
// Shell del onboarding · el primer dia DENTRO de Huella.
//
// Estructura (rediseño 31 ago 2026): el onboarding no vende, recibe. Los tres
// slides de marketing (gancho, promesa, afirmacion) se eliminaron: la venta ya
// ocurrio antes de que la persona descargara la app, asi que repetirla despues
// del registro era pura friccion.
//
// Actos:
//   A · DATOS    — OnboardingFormSlide, 5 pasos. Obligatorio, sin salida.
//   B · MOMENTO  — OnboardingComposer. Saltable.
//   (C · CIERRE  — pendiente, bloque 4)
//
// Path: src/pages/onboarding/Onboarding.jsx
//
// El parent (Layout) llama:
//   <Onboarding onComplete={(perfil) => …} />
// y decide que hacer con el `perfil` (persistir en Supabase, recargar, etc).

import React, { useState, useCallback, useRef, useMemo } from 'react';
import styles from './Onboarding.module.css';
import OnboardingFormSlide from './OnboardingFormSlide';
import OnboardingComposer from './OnboardingComposer';

const ACTO_COUNT = 2;

// Anios cumplidos a partir de { dia, mes, anio }. Devuelve null si la fecha
// esta incompleta o es invalida; `marcoEdad` ya cae a su marco de 4 anios
// cuando recibe null, asi que el acto B nunca queda sin marco.
function edadDesdeNacimiento(nacimiento) {
  const { dia, mes, anio } = nacimiento || {};
  if (!dia || !mes || !anio) return null;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  if (isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--;
  return edad >= 0 && edad < 130 ? edad : null;
}

const EMPTY_PERFIL = {
  nombrePadre: '',
  nombreHijo: '',
  nacimiento: { dia: '', mes: '', anio: '' },
  // 'm' | 'f' | 'nb' — los MISMOS codigos que guardan HijoPage y PerfilPage.
  // Antes aca viajaban las etiquetas ('Niño'/'Niña'/'Otro') y llegaban crudas a
  // hijos.genero, donde la IA nunca las reconocia: analizarEpisodio compara
  // contra 'm'/'f'/'nb' y caia siempre al generico "niño/a".
  sexo: null,
  // Blobs ya COMPRIMIDOS (400px) por el paso 5. Se comprimen al elegirlos, no
  // al subirlos, para que la miniatura del slot muestre exactamente lo que va
  // a quedar guardado. Los dos son opcionales.
  fotoBlob:      null,  // el hijo   → avatares/{userId}/{hijoId}.jpg → hijos.avatar_url
  fotoPadreBlob: null,  // el adulto → avatares/{userId}/cuidador.jpg → perfiles.avatar_url
  // Texto del acto B. Ya NO se persiste en perfiles.contexto_inicial (campo que
  // nadie leia nunca). En el bloque 3 pasa a ser el primer episodio real.
  textoMomento: null,
};

/**
 * Props
 *   onComplete     (perfil) => Promise<void>  · se llama al cerrar el acto B
 *   ensayo         bool  · modo ensayo (?onboarding=1): QA visual sin escribir
 *                          NADA en la base. Lo decide el Layout, que ademas es
 *                          quien no llama al persistor. Aca solo se usa para
 *                          pintar el chip y para apagar la llamada a Anthropic
 *                          del acto B.
 *   onSalirEnsayo  () => void  · salida del ensayo desde el chip. Existe porque
 *                          el acto A no tiene "Saltar": sin esto, para salir
 *                          habria que completar los 5 pasos.
 */
export default function Onboarding({ onComplete, ensayo = false, onSalirEnsayo }) {
  const [index, setIndex] = useState(0);
  const [perfil, setPerfil] = useState(EMPTY_PERFIL);
  // Bloqueo del cierre mientras `onComplete` corre (sube foto + upsert perfil +
  // upsert hijo). El ref captura el estado sincronicamente — sin el, dos toques
  // muy rapidos entrarian antes de que React batchee el setState.
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  // Aviso si el guardado falla. Deja reintentar en vez de quedar atascado.
  const [saveError, setSaveError] = useState(false);

  const goNext = useCallback(() => {
    setIndex(i => Math.min(i + 1, ACTO_COUNT - 1));
  }, []);

  // Datos del hijo para el acto B. El hijo TODAVIA no existe en la base (se
  // crea recien al cerrar el onboarding), asi que la edad se calcula aca desde
  // el nacimiento que el acto A acaba de recolectar. Sin esto el primer
  // encuentro respondia sin saber a quien le hablaba.
  const hijoDelActoA = useMemo(() => ({
    nombre: perfil.nombreHijo.trim() || null,
    edad:   edadDesdeNacimiento(perfil.nacimiento),
    genero: perfil.sexo,
  }), [perfil.nombreHijo, perfil.nacimiento, perfil.sexo]);

  // Cierre del onboarding. Recibe el texto del acto B (o null si lo salto).
  const finish = useCallback(async (texto) => {
    if (submittingRef.current) return; // anti doble-toque
    submittingRef.current = true;
    setSubmitting(true);
    setSaveError(false);
    const limpio = texto && texto.trim() ? texto.trim() : null;
    try {
      await onComplete({ ...perfil, textoMomento: limpio });
      // El Layout apaga `showOnboarding` y desmonta este componente. No
      // reseteamos `submitting`: el desmonte limpia el estado y el boton
      // queda en "Guardando…" mientras corre la transicion, sin parpadeo.
    } catch (err) {
      // Si el guardado falla, `onComplete` re-lanza: dejamos reintentar y
      // mostramos el aviso, en vez de cerrar sin haber guardado nada.
      console.error('[Onboarding] onComplete tiro:', err);
      submittingRef.current = false;
      setSubmitting(false);
      setSaveError(true);
    }
  }, [onComplete, perfil]);

  // patchPerfil({ nombrePadre: 'Camila' }) → merge superficial
  const patchPerfil = useCallback((patch) => {
    setPerfil(p => ({ ...p, ...patch }));
  }, []);

  return (
    <div className={styles.shell} role="region" aria-label="Bienvenida a Huella">
      {/* Chip de ensayo. Discreto pero siempre visible, para no dudar nunca en
          que modo se esta. Toca para salir sin completar el flujo. */}
      {ensayo && (
        <button
          type="button"
          className={styles.chipEnsayo}
          onClick={onSalirEnsayo}
          title="Modo ensayo: nada se guarda. Toca para salir."
        >
          modo ensayo · salir
        </button>
      )}
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {/* ── Acto A · Datos ─────────────────────────────────────
            Sin "Saltar": el nombre y la fecha de nacimiento del hijo no son
            un tramite, son lo que hace funcionar la app (la edad alimenta el
            Cerebro Huella y todos los marcos por edad). Saltarlos dejaba una
            cuenta a medias y el onboarding reapareciendo cada sesion. */}
        <div className={styles.acto} aria-hidden={index !== 0}>
          <OnboardingFormSlide
            active={index === 0}
            perfil={perfil}
            setPerfil={patchPerfil}
            onContinue={goNext}
          />
        </div>

        {/* ── Acto B · El momento real ───────────────────────── */}
        <div className={styles.acto} aria-hidden={index !== 1}>
          <OnboardingComposer
            active={index === 1}
            hijo={hijoDelActoA}
            ensayo={ensayo}
            submitting={submitting}
            saveError={saveError}
            onSubmit={finish}
            onSkipInline={() => finish(null)}
          />
        </div>
      </div>
    </div>
  );
}
