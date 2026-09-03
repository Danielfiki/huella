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
//   C · CIERRE   — OnboardingCierre. Los autores detras de lo leido y el
//                  unico CTA "Entrar a Huella". Tapa la espera del guardado,
//                  que arranca en segundo plano al salir del acto B.
//
// Path: src/pages/onboarding/Onboarding.jsx
//
// El parent (Layout) llama:
//   <Onboarding onComplete={(perfil) => …} onEntrar={() => …} />
// `onComplete` persiste el `perfil` (Supabase, reload) y `onEntrar` cierra el
// onboarding cuando el padre toca "Entrar a Huella".

import React, { useState, useCallback, useRef, useMemo } from 'react';
import styles from './Onboarding.module.css';
import OnboardingFormSlide from './OnboardingFormSlide';
import OnboardingComposer from './OnboardingComposer';
import OnboardingCierre from './OnboardingCierre';

const ACTO_COUNT = 3;

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
  // Texto del acto B. Es el PRIMER EPISODIO real del hijo: el persistor lo
  // inserta en `episodios` con origen 'onboarding' y dispara la orientacion
  // en segundo plano (bloque 3). null si el padre toco "Saltar este paso".
  textoMomento: null,
};

/**
 * Props
 *   onComplete     (perfil) => Promise<void>  · se llama al salir del acto B,
 *                          en segundo plano, mientras se muestra el acto C.
 *                          Solo persiste: NO cierra el onboarding.
 *   onEntrar       () => void  · cierra el onboarding. Lo dispara el CTA del
 *                          acto C una vez que `onComplete` resolvio.
 *   ensayo         bool  · modo ensayo (?onboarding=1): QA visual sin escribir
 *                          NADA en la base. Lo decide el Layout, que ademas es
 *                          quien no llama al persistor. Aca solo se usa para
 *                          pintar el chip y para apagar la llamada a Anthropic
 *                          del acto B.
 *   ensayoIA       bool  · variante ?onboarding=1&ia=1: ensayo igual de seco,
 *                          pero el acto B SI llama a Anthropic con los datos
 *                          del acto A. Solo cambia eso y el texto del chip.
 *   onSalirEnsayo  () => void  · salida del ensayo desde el chip. Existe porque
 *                          el acto A no tiene "Saltar": sin esto, para salir
 *                          habria que completar los 5 pasos.
 */
export default function Onboarding({
  onComplete,
  onEntrar,
  ensayo = false,
  ensayoIA = false,
  onSalirEnsayo,
}) {
  const [index, setIndex] = useState(0);
  const [perfil, setPerfil] = useState(EMPTY_PERFIL);
  // Bloqueo del cierre mientras `onComplete` corre (sube foto + upsert perfil +
  // upsert hijo). El ref captura el estado sincronicamente — sin el, dos toques
  // muy rapidos entrarian antes de que React batchee el setState.
  const submittingRef = useRef(false);
  // Estado del guardado, que el acto C refleja en su CTA:
  //   'idle'    → todavia no se lanzo (actos A y B)
  //   'pending' → onComplete corriendo en segundo plano
  //   'ok'      → guardado; "Entrar a Huella" cierra
  //   'error'   → fallo; el acto C avisa y deja reintentar
  const [persistStatus, setPersistStatus] = useState('idle');
  // Texto del acto B, guardado aca para poder reintentar el cierre desde el
  // acto C sin volver atras. null si el padre salto el acto B.
  const [textoMomento, setTextoMomento] = useState(null);

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

  // Guardado en segundo plano. Se lanza al ENTRAR al acto C, no al salir de
  // el: el acto C existe justamente para tapar esta espera. `onComplete` ya no
  // cierra el onboarding (eso lo hace `onEntrar`), solo persiste.
  const lanzarGuardado = useCallback(async (texto) => {
    if (submittingRef.current) return; // anti doble-toque
    submittingRef.current = true;
    setPersistStatus('pending');
    try {
      await onComplete({ ...perfil, textoMomento: texto });
      setPersistStatus('ok');
    } catch (err) {
      // Si el guardado falla, `onComplete` re-lanza: el acto C avisa y deja
      // reintentar, en vez de entrar sin haber guardado nada.
      console.error('[Onboarding] onComplete tiro:', err);
      setPersistStatus('error');
    } finally {
      submittingRef.current = false;
    }
  }, [onComplete, perfil]);

  // Salida del acto B, con texto o con null (salto). Avanza al acto C y
  // arranca el guardado en el mismo instante.
  const irAlCierre = useCallback((texto) => {
    const limpio = texto && texto.trim() ? texto.trim() : null;
    setTextoMomento(limpio);
    setIndex(2);
    lanzarGuardado(limpio);
  }, [lanzarGuardado]);

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
          title={
            ensayoIA
              ? 'Modo ensayo con IA real: la respuesta viene de Anthropic, pero nada se guarda. Toca para salir.'
              : 'Modo ensayo: nada se guarda. Toca para salir.'
          }
        >
          {ensayoIA ? 'modo ensayo · IA real · salir' : 'modo ensayo · salir'}
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
            ensayoIA={ensayoIA}
            onSubmit={irAlCierre}
            onSkipInline={() => irAlCierre(null)}
          />
        </div>

        {/* ── Acto C · Cierre de confianza ───────────────────────
            Tapa la espera del guardado con los autores detras de lo que el
            padre acaba de leer. Sin "Saltar": el unico CTA es entrar. */}
        <div className={styles.acto} aria-hidden={index !== 2}>
          <OnboardingCierre
            active={index === 2}
            hijo={hijoDelActoA}
            saltoActoB={textoMomento == null}
            persistStatus={persistStatus === 'idle' ? 'pending' : persistStatus}
            onEntrar={onEntrar}
            onReintentar={() => lanzarGuardado(textoMomento)}
          />
        </div>
      </div>
    </div>
  );
}
