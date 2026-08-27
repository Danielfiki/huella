import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { ZONAS, AHORA, porTope } from './contenidoCerebro'
import styles from './CerebroPage.module.css'

// El chunk de three (~170 KB gzip) se descarga SOLO al entrar a esta ruta.
// Mismo patrón que PDFSection en HistorialPage: nada de esto pesa en el
// bundle inicial. Si se importa three en cualquier otro lado de forma
// estática, ese ahorro se pierde.
const EscenaCerebro = lazy(() => import('./EscenaCerebro'))

// Edad de arranque. El paso 5 la reemplaza por la edad real del hijo (función
// decimal nueva, junto a calcularEdad y sin tocarla); hasta entonces el slider
// parte donde partía el prototipo.
const EDAD_INICIAL = 4

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

// El rótulo de la edad, con los dos casos especiales de los primeros años.
const rotuloEdad = (e) => (e === 0 ? '0-1 año' : e === 1 ? '1 año' : `${e} años`)
const rotuloNota = (e) =>
  e === 0 ? 'Entre los 0 y 1 año' : e === 1 ? 'Al año' : `A los ${e} años`

// Panel de diagnóstico. Solo aparece con ?diag=1 en la URL: sirve para que un
// dispositivo real cuente qué le pasa cuando el cerebro no se ve. No cambia
// nada del render. Se saca cuando el paso 4 esté estable, o sea cuando el QA
// del bloque B esté aprobado.
function PanelDiag({ datos, soportado, vitrinaRef, medidaFila }) {
  const caja = vitrinaRef.current?.getBoundingClientRect()
  const filas = [
    ['webgl detectado', soportado ? 'si' : 'NO'],
    ['vitrina css', caja ? `${Math.round(caja.width)}x${Math.round(caja.height)}` : '—'],
    // Visible x total de la fila de chips. Si el segundo numero es mayor, la
    // fila SI es deslizable y cualquier problema es del gesto; si son iguales,
    // el problema es de ancho y el arreglo seria otro completamente.
    ['chips visible x total', medidaFila ? `${medidaFila.visible} x ${medidaFila.total}` : '—'],
    ['chips scrollLeft', medidaFila ? String(medidaFila.pos) : '—'],
    ['pantalla', datos?.pantalla ?? '—'],
    ['dpr', datos?.dpr ?? '—'],
    ['canvas css', datos?.canvasCss ?? '—'],
    ['canvas buffer', datos?.canvasBuffer ?? '—'],
    ['contexto', datos?.gl ?? '—'],
    ['gpu', datos?.gpu ?? '—'],
    ['max textura', datos?.maxTextura ?? '—'],
    ['modelo', datos?.modelo ?? '—'],
    ['mallas', datos?.mallas ?? '—'],
    ['contexto perdido', datos?.contextoPerdido ? 'SI' : 'no'],
    ['fallo', datos?.fallo || '—'],
  ]
  return (
    <div className={styles.diag}>
      {filas.map(([k, v]) => (
        <div className={styles.diagFila} key={k}>
          <span className={styles.diagClave}>{k}</span>
          <span className={styles.diagValor}>{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CerebroPage() {
  const navigate = useNavigate()
  const { state } = useHuella()
  const hijo = state.hijo
  const soportado = useMemo(hayWebGL, [])
  const [params] = useSearchParams()
  const diagOn = params.get('diag') === '1'
  const [datosDiag, setDatosDiag] = useState(null)
  const vitrinaRef = useRef(null)

  const [edad, setEdad] = useState(EDAD_INICIAL)
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
  // Medidas de la fila, SOLO para el panel de ?diag=1. Se guardan en estado y
  // no se leen del ref al pintar, porque si no el scrollLeft queda congelado
  // en el valor que tenía la última vez que la página se volvió a dibujar.
  // Con el panel encendido esto re-renderiza en cada evento de scroll; es
  // instrumentación temporal y se va junto con el panel.
  const [medidaFila, setMedidaFila] = useState(null)

  const medirFila = useCallback(() => {
    const el = filaRef.current
    if (!el) return
    // El -1 absorbe el redondeo subpíxel: sin él, en algunos zooms el final
    // del scroll queda en 1103,6 de 1104 y el fade no se apaga nunca.
    setHayMasChips(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    if (diagOn) {
      setMedidaFila({
        visible: el.clientWidth,
        total: el.scrollWidth,
        pos: Math.round(el.scrollLeft),
      })
    }
  }, [diagOn])

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
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.titulo}>
          {hijo?.nombre ? `El cerebro de ${hijo.nombre}` : 'El cerebro de tu hijo'}
        </h1>
      </div>

      <p className={styles.bajada}>Un mapa para entender lo que pasa por dentro</p>

      <div className={styles.vitrina} ref={vitrinaRef}>
        {diagOn && (
          <PanelDiag
            datos={datosDiag}
            soportado={soportado}
            vitrinaRef={vitrinaRef}
            medidaFila={medidaFila}
          />
        )}
        {soportado ? (
          <Suspense fallback={<p className={styles.estado}>Armando el cerebro…</p>}>
            <EscenaCerebro
              edad={edad}
              zonaAbierta={abierta ? zonaVista : null}
              onTapZona={abrir}
              medidores={medidores}
              onDiag={diagOn ? setDatosDiag : undefined}
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
          <span className={styles.edadVal}>{rotuloEdad(edad)}</span>
        </div>
        {/* --pos no es un color ni un tamaño: es la posición del relleno del
            riel, o sea estado que solo se conoce en tiempo de ejecución. Es el
            mismo mecanismo del prototipo (slider.style.setProperty). */}
        <input
          type="range"
          className={styles.slider}
          min="0"
          max="18"
          step="1"
          value={edad}
          onChange={(e) => setEdad(+e.target.value)}
          style={{ '--pos': `${(edad / 18) * 100}%` }}
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
