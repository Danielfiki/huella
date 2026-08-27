import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHuella, calcularEdadDecimal } from '../../context/HuellaContext'
import { ZONAS, AHORA, porTope } from './contenidoCerebro'
import styles from './CerebroPage.module.css'

// El Cerebro Huella sin cáscara de página: vitrina, franja, slider, chips y
// tarjeta de zona. Tiene DOS casas, y por eso vive separado de la página:
//   · la ruta /cerebro, a través de CerebroPage, que le pone la barra mocha
//   · el tab "Su cerebro" de HijoPage, que lo monta pelado bajo el retrato
// Es el mismo patrón que ya usan los otros tabs de HijoPage, donde el
// contenido de cada uno es un componente (RutinaDiaria).
//
// `compacto` es para el tab: ahí arriba ya viven el retrato y la fila de
// tabs, así que la vitrina cede un poco de alto para que la pieza entera
// quepa de una sola mirada. Ver .vitrinaCompacta en el CSS.

// El chunk de three (~170 KB gzip) se descarga SOLO cuando este componente se
// monta. Mismo patrón que PDFSection en HistorialPage: nada de esto pesa en el
// bundle inicial. Si se importa three en cualquier otro lado de forma
// estática, ese ahorro se pierde.
const EscenaCerebro = lazy(() => import('./EscenaCerebro'))

// Edad de respaldo, para cuando no hay forma de saber la del hijo. Es donde
// partía el prototipo.
const EDAD_POR_DEFECTO = 4

// El slider cubre 0-18, que es el rango de la matriz de contenido.
const EDAD_MIN = 0
const EDAD_MAX = 18
const acotar = (e) => Math.min(EDAD_MAX, Math.max(EDAD_MIN, e))

// Desde esta edad se dejan de decir los meses. Bajo los 6 los meses son
// información real —hay mundo entre 2 años y 2 años y 10 meses— y los papás
// los dicen; de la edad escolar en adelante nadie dice "9 años y 4 meses".
const EDAD_SIN_MESES = 6

// Se pregunta ANTES de cargar el chunk: si el dispositivo no puede dibujar,
// no tiene sentido bajarle 600 KB de librería 3D.
function hayWebGL() {
  try {
    const cv = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (cv.getContext('webgl2') || cv.getContext('webgl'))
    )
  } catch {
    return false
  }
}

// El rótulo de la edad. `real` distingue la edad verdadera del hijo del valor
// que dejó el usuario al arrastrar: la primera se dice con meses, como la
// diría un papá; la segunda usa el formato de siempre.
//
// La bandera es necesaria y no se puede deducir del número: un recién nacido
// da 0 y un hijo que cumplió años justo hoy da un entero exacto, así que por
// valor serían indistinguibles de un slider arrastrado.
function rotuloEdad(e, real) {
  if (!real) {
    return e === 0 ? '0-1 año' : e === 1 ? '1 año' : `${e} años`
  }
  const meses = Math.round(e * 12)
  if (meses <= 0) return 'recién nacido'
  if (meses < 12) return meses === 1 ? '1 mes' : `${meses} meses`

  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  const enAnios = `${anios} ${anios === 1 ? 'año' : 'años'}`
  if (anios >= EDAD_SIN_MESES || resto === 0) return enAnios
  return `${enAnios} y ${resto === 1 ? '1 mes' : `${resto} meses`}`
}

// El rótulo de la tarjeta. Va contra la edad en años cumplidos: con la edad
// real sin redondear escribiría "A los 4.58 años".
function rotuloNota(e) {
  const a = Math.floor(e)
  return a === 0 ? 'Entre los 0 y 1 año' : a === 1 ? 'Al año' : `A los ${a} años`
}

export default function CerebroContenido({ compacto = false }) {
  const { state } = useHuella()
  const hijo = state.hijo
  const soportado = useMemo(hayWebGL, [])

  // La edad real del hijo activo, con la misma fuente que el nombre del
  // header: state.hijo. Baja por escalones — fecha de nacimiento, la edad
  // entera que algunos hijos tienen guardada sin fecha, y recién ahí el
  // respaldo.
  const edadDelHijo = useMemo(() => {
    const decimal = calcularEdadDecimal(hijo?.fechaNacimiento)
    if (decimal != null) return acotar(decimal)
    if (typeof hijo?.edad === 'number') return acotar(hijo.edad)
    return EDAD_POR_DEFECTO
  }, [hijo?.fechaNacimiento, hijo?.edad])

  const [edad, setEdad] = useState(edadDelHijo)

  // `state.hijo` es null en el primer render mientras cargan los datos, así
  // que la edad real llega DESPUÉS. Sin esto el slider se quedaría pegado en
  // el respaldo, y el bug sería intermitente según lo que demore la carga: de
  // los que no aparecen en el QA.
  // Solo se adopta mientras el usuario no haya tocado el slider. Si ya lo
  // movió, mandan sus manos y no se le pisa.
  const tocado = useRef(false)
  useEffect(() => {
    if (!tocado.current) setEdad(edadDelHijo)
  }, [edadDelHijo])
  // `zonaVista` NO se limpia al cerrar: la tarjeta se va deslizando hacia
  // abajo y si le borráramos el contenido se vaciaría a mitad de camino.
  // `abierta` es lo que manda la animación.
  const [zonaVista, setZonaVista] = useState(null)
  const [abierta, setAbierta] = useState(false)

  // Los porcentajes los escribe el loop de la escena directo en estos nodos.
  // Van por ref y no por estado porque cambian 60 veces por segundo: como
  // estado, cada dígito volvería a renderizar la página entera.
  const chipsRef = useRef({})
  const fichaPctRef = useRef(null)
  const fichaBarRef = useRef(null)
  const medidores = useMemo(
    () => ({ chips: chipsRef, fichaPct: fichaPctRef, fichaBar: fichaBarRef }),
    []
  )

  // La fila de chips y su desvanecido. El fade se apaga al llegar al final:
  // deja de ser una insinuación cuando ya no hay nada que insinuar.
  const filaRef = useRef(null)
  const [hayMasChips, setHayMasChips] = useState(false)

  const medirFila = useCallback(() => {
    const el = filaRef.current
    if (!el) return
    // El -1 absorbe el redondeo subpíxel: sin él, en algunos zooms el final
    // del scroll queda en 1103,6 de 1104 y el fade no se apaga nunca.
    setHayMasChips(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    medirFila()
    window.addEventListener('resize', medirFila)
    return () => window.removeEventListener('resize', medirFila)
  }, [medirFila])

  const abrir = useCallback((slug) => {
    if (!ZONAS[slug]) return
    setZonaVista(slug)
    setAbierta(true)
  }, [])
  const cerrar = useCallback(() => setAbierta(false), [])

  const zona = zonaVista ? ZONAS[zonaVista] : null

  return (
    <div className={styles.contenido}>
      <p className={styles.bajada}>Un mapa para entender lo que pasa por dentro</p>

      <div className={`${styles.vitrina} ${compacto ? styles.vitrinaCompacta : ''}`}>
        {soportado ? (
          <Suspense fallback={<p className={styles.estado}>Armando el cerebro…</p>}>
            <EscenaCerebro
              edad={edad}
              zonaAbierta={abierta ? zonaVista : null}
              onTapZona={abrir}
              medidores={medidores}
            />
          </Suspense>
        ) : (
          // Fallback sereno: esto no es un error del que haya que disculparse,
          // es un dispositivo que no puede dibujar en 3D.
          <div className={styles.sinWebgl}>
            <p className={styles.sinWebglTitulo}>Este cerebro necesita más pantalla</p>
            <p className={styles.sinWebglTexto}>
              Tu dispositivo no puede dibujar en 3D todavía. Todo lo demás de Huella
              funciona igual, y puedes volver a esta pantalla desde otro teléfono
              cuando quieras.
            </p>
          </div>
        )}
      </div>

      <div className={styles.ahora}>
        <div className={styles.ahoraRotulo}>
          <i className={styles.ahoraPunto} /> Ahora mismo en su cerebro
        </div>
        <div className={styles.ahoraTexto}>{porTope(AHORA, edad)}</div>
      </div>

      <div className={styles.controles}>
        <div className={styles.edadFila}>
          <span className={styles.edadLbl}>Edad</span>
          <span className={styles.edadVal}>{rotuloEdad(edad, !tocado.current)}</span>
        </div>
        {/* --pos no es un color ni un tamaño: es la posición del relleno del
            riel, o sea estado que solo se conoce en tiempo de ejecución. Es el
            mismo mecanismo del prototipo (slider.style.setProperty).

            El slider y el relleno van con la edad REDONDEADA, no con la real.
            Un input de rango con step=1 sanitiza su valor a la grilla de
            pasos: si le pasáramos 4,58 el navegador pondría el pulgar en 5 y
            el relleno quedaría ~8px antes que el pulgar, que sí se nota. Con
            los dos redondeados quedan siempre alineados, y como el riel no
            tiene números el redondeo del pulgar es invisible. El cerebro y el
            rótulo siguen usando la edad exacta, que es el punto del paso 5. */}
        <input
          type="range"
          className={styles.slider}
          min={EDAD_MIN}
          max={EDAD_MAX}
          step="1"
          value={Math.round(edad)}
          onChange={(e) => {
            tocado.current = true
            setEdad(+e.target.value)
          }}
          style={{ '--pos': `${(Math.round(edad) / EDAD_MAX) * 100}%` }}
          aria-label="Edad del hijo"
        />
      </div>

      <div className={styles.zonasWrap}>
        <div className={styles.zonas} ref={filaRef} onScroll={medirFila}>
          {Object.entries(ZONAS).map(([slug, z]) => (
            <button
              key={slug}
              type="button"
              className={`${styles.chip} ${abierta && zonaVista === slug ? styles.chipOn : ''}`}
              onClick={() => abrir(slug)}
            >
              {/* El color de zona entra como referencia al token gemelo, nunca
                  como hex suelto en el JSX. */}
              <b
                className={styles.chipPunto}
                style={{ '--zona-color': `var(--cerebro-zona-${slug})` }}
              />
              {z.nombre}{' '}
              <em
                className={styles.chipPct}
                ref={(el) => { chipsRef.current[slug] = el }}
              >
                —
              </em>
            </button>
          ))}
        </div>
        <div className={`${styles.zonasFade} ${hayMasChips ? styles.zonasFadeOn : ''}`} />
      </div>

      <p className={styles.pie}>
        Este modelo es un mapa anatómico adulto: te sirve para ubicarte, no representa
        la forma exacta del cerebro de tu hijo.
        <br />
        Modelo 3D: BodyParts3D © The Database Center for Life Science, CC BY 4.0
      </p>

      {/* Portal a document.body, mismo patrón que UpgradeModal y
          CerrarPatronModal. NO es opcional: `.pageWrap` del Layout anima la
          entrada de cada página con `animation-fill-mode: both`, así que se
          queda con el transform aplicado para siempre. Un ancestro con
          transform (a) crea un contexto de apilado, y ahí el z-index 1000 de
          la tarjeta se mide DENTRO de .pageWrap en vez de contra la raíz, así
          que la barra de navegación le gana; y (b) se vuelve el bloque
          contenedor del position:fixed, así que la tarjeta se movía con el
          scroll en vez de quedarse pegada al viewport. Los dos síntomas que
          Daniel vio en el QA salen del mismo transform heredado.
          El velo va en el MISMO portal: si se quedara atrás, seguiría sin
          cubrir la barra. */}
      {createPortal(
        <>
          <div
            className={`${styles.velo} ${abierta ? styles.veloOn : ''}`}
            onClick={cerrar}
            aria-hidden="true"
          />
          <section
            className={`${styles.tarjeta} ${abierta ? styles.tarjetaAbierta : ''}`}
            aria-hidden={!abierta}
            /* El color de los rótulos se declara UNA vez acá y lo heredan los
               tres (el apodo, "A los N años" y "En la práctica"), porque las
               custom properties se heredan. Va la variante legible del tono,
               no el color puro: ninguno de los seis puros llega a 4,5:1 como
               texto. Sin zona abierta no se declara, así no queda apuntando a
               un token que no existe. */
            style={
              zonaVista
                ? { '--zona-rotulo': `var(--cerebro-rotulo-${zonaVista})` }
                : undefined
            }
          >
            <div className={styles.asa} />
            <button type="button" className={styles.tCerrar} onClick={cerrar} aria-label="Cerrar">
              ×
            </button>
            {zona && (
              <>
                <div className={styles.tApodo}>{zona.apodo}</div>
                <h2 className={styles.tNombre}>{zona.nombre}</h2>
                <div className={styles.tMadurez}>
                  <div className={styles.tFila}>
                    <span>Qué tan formada está a esta edad</span>
                    <b ref={fichaPctRef}>—</b>
                  </div>
                  <div className={styles.barra}>
                    <span
                      ref={fichaBarRef}
                      style={{ '--zona-color': `var(--cerebro-zona-${zonaVista})` }}
                    />
                  </div>
                </div>
                <p className={styles.tBase}>{zona.base}</p>
                <div className={styles.bloque}>
                  <span className={styles.rot}>{rotuloNota(edad)}</span>
                  <p>{porTope(zona.notas, edad)}</p>
                </div>
                <div className={styles.tConsejo}>
                  <span className={styles.rot}>En la práctica</span>
                  <p>{zona.consejo}</p>
                </div>
              </>
            )}
          </section>
        </>,
        document.body
      )}
    </div>
  )
}
