import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
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
function PanelDiag({ datos, soportado, vitrinaRef }) {
  const caja = vitrinaRef.current?.getBoundingClientRect()
  const filas = [
    ['webgl detectado', soportado ? 'si' : 'NO'],
    ['vitrina css', caja ? `${Math.round(caja.width)}x${Math.round(caja.height)}` : '—'],
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
          <PanelDiag datos={datosDiag} soportado={soportado} vitrinaRef={vitrinaRef} />
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

      <div className={styles.zonas}>
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

      <p className={styles.pie}>
        Este modelo es un mapa anatómico adulto: te sirve para ubicarte, no representa
        la forma exacta del cerebro de tu hijo.
        <br />
        Modelo 3D: BodyParts3D © The Database Center for Life Science, CC BY 4.0
      </p>

      {/* El velo y la tarjeta van en 1000: la barra de navegación está
          encerrada en su propio contexto de apilado y los modales de la app
          viven en ese nivel. La tarjeta va un punto más arriba que el velo. */}
      <div
        className={`${styles.velo} ${abierta ? styles.veloOn : ''}`}
        onClick={cerrar}
        aria-hidden="true"
      />
      <section
        className={`${styles.tarjeta} ${abierta ? styles.tarjetaAbierta : ''}`}
        aria-hidden={!abierta}
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
    </div>
  )
}
