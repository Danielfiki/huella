import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { borrarMarcaBienvenida, forzarVariante, VARIANTES } from '../../components/personaje/bienvenida'
import { palabrasGenero } from '../../utils/genero'
import Button from '../../components/ui/Button'
import AlivioHuella from '../../components/registro/AlivioHuella'
import SelloPensando from '../../components/personaje/SelloPensando'
import VoiceTextarea from '../../components/ui/VoiceTextarea'
import { usaPensando, elegirPensando, marcarPensando, precargarPensando, calentarPensando, VARIANTES_PENSANDO } from '../../components/personaje/pensando'
import { usaOrgulloso, elegirOrgulloso, VARIANTES_ORGULLOSO } from '../../components/personaje/orgulloso'
import OrgullosoEscarabajo from '../../components/personaje/OrgullosoEscarabajo'
import BienvenidaEscarabajo from '../../components/personaje/BienvenidaEscarabajo'
import layoutStyles from '../../components/layout/Layout.module.css'
import regStyles from '../registro/RegistroPage.module.css'
import styles from './PersonajePage.module.css'

// Vitrina privada del personaje (ruta /personaje, solo Daniel; el filtro vive
// en RutaPersonaje). No esta enlazada desde ningun menu y no escribe nada en
// la base: la escena del rasgo solo LEE el confirmado mas reciente de La brava.
//
// Usa los 10 videos de public/personaje/video (referencia de color:
// 02-orgulloso), cada uno dentro de un circulo crema fijo. Las WebP quietas
// de public/personaje y el SVG (components/personaje/Escarabajo.jsx) quedan
// en el repo, sin uso.

const ESTADOS = [
  { archivo: '01-saludando',   nombre: 'Saludando',   momento: 'Bienvenida' },
  { archivo: '02-orgulloso',   nombre: 'Orgulloso',   momento: 'Avance o rasgo' },
  { archivo: '03-acompanando', nombre: 'Acompañando', momento: 'Momento difícil' },
  { archivo: '04-escuchando',  nombre: 'Escuchando',  momento: 'Mientras escribe' },
  { archivo: '05-pensando',    nombre: 'Pensando',    momento: 'La IA prepara' },
  { archivo: '06-en-calma',    nombre: 'En calma',    momento: 'Calmarse juntos' },
  { archivo: '07-curioso',     nombre: 'Curioso',     momento: 'Card candidato' },
  { archivo: '08-celebrando',  nombre: 'Celebrando',  momento: 'Hitos grandes' },
  { archivo: '09-dormido',     nombre: 'Dormido',     momento: 'Vacío y 21:30' },
  { archivo: '10-buscando',    nombre: 'Buscando',    momento: 'Sin datos o error' },
]

const rutaVideo = (archivo) => `/personaje/video/${archivo}.mp4`
const rutaPoster = (archivo) => `/personaje/video/${archivo}.webp`

// El saludo no se repite: se reproduce una vez y queda en el ultimo cuadro
// (su poster es ese ultimo cuadro).
const UNA_VEZ = '01-saludando'

const RASGO_RESPALDO = 'Después de caerse o frustrarse, se repone y quiere volver a intentarlo'

function useMovimientoReducido() {
  const consulta = '(prefers-reduced-motion: reduce)'
  const [reducido, setReducido] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const alCambiar = () => setReducido(mq.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])
  return reducido
}

function duracionMs(nombre) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
  const n = parseFloat(valor)
  if (!Number.isFinite(n)) return 0
  return valor.endsWith('ms') ? n : n * 1000
}

// Video del personaje en su circulo crema. Solo corre mientras esta en
// pantalla (IntersectionObserver); con movimiento reducido queda el poster.
// Sin autoplay en la grilla: el atributo obliga a descargar el video aunque
// diga preload="none". El visor (cargar="auto") si parte solo.
function VideoPersonaje({ archivo, cargar = 'none', pausado = false, className = '' }) {
  const ref = useRef(null)
  const terminado = useRef(false)
  const reducido = useMovimientoReducido()
  const [enPantalla, setEnPantalla] = useState(false)
  // Sin movimiento reducido, nada se ve hasta que el video corre: en Modo de
  // bajo consumo iOS no deja reproducir y el poster quedaba congelado.
  const [corriendo, setCorriendo] = useState(false)
  const unaVez = archivo === UNA_VEZ

  useEffect(() => {
    const video = ref.current
    // iOS solo deja reproducir sin toque si el video esta silenciado.
    video.muted = true
    const obs = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting), { threshold: 0.25 })
    obs.observe(video)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const video = ref.current
    if (reducido || pausado || !enPantalla) {
      video.pause()
      return
    }
    if (unaVez && terminado.current) return
    video.play().catch(() => {})
  }, [enPantalla, pausado, reducido, unaVez])

  return (
    <span className={`${styles.escena} ${className}`}>
      <span className={styles.recorte}>
        <video
          ref={ref}
          className={`${styles.video} ${!reducido && !corriendo ? styles.sinCorrer : ''}`}
          src={rutaVideo(archivo)}
          poster={rutaPoster(archivo)}
          muted
          playsInline
          autoPlay={cargar === 'auto' && !reducido}
          loop={!unaVez}
          preload={reducido ? 'none' : cargar}
          onPlaying={() => setCorriendo(true)}
          onEnded={() => { terminado.current = true }}
          aria-hidden="true"
        />
      </span>
    </span>
  )
}

// Lee La brava y su rasgo confirmado mas reciente. Solo SELECT.
function useRasgoDeLaBrava() {
  const [datos, setDatos] = useState({ hijo: null, rasgo: null })
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data: hijo } = await supabase
        .from('hijos')
        .select('id, nombre, genero')
        .ilike('nombre', '%brava%')
        .limit(1)
        .maybeSingle()
      let rasgo = null
      if (hijo) {
        const { data } = await supabase
          .from('rasgos')
          .select('titulo, evidencia_count, updated_at')
          .eq('hijo_id', hijo.id)
          .eq('estado', 'confirmado')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        rasgo = data ?? null
      }
      if (vivo) setDatos({ hijo: hijo ?? null, rasgo })
    })()
    return () => { vivo = false }
  }, [])
  return datos
}

// ── b) Visor grande ─────────────────────────────────────────────────────
function Visor({ estado, alCerrar }) {
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') alCerrar() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  return (
    <div
      className={styles.visor}
      role="dialog"
      aria-modal="true"
      aria-label={`Escarabajo ${estado.nombre.toLowerCase()}`}
      onClick={alCerrar}
    >
      <figure className={styles.visorFigura} key={estado.archivo}>
        {/* Elemento nuevo en cada apertura: el saludo vuelve a partir de cero. */}
        <div className={styles.visorEntrada}>
          <VideoPersonaje archivo={estado.archivo} cargar="auto" />
        </div>
        <figcaption className={styles.pie}>
          <span className={styles.pieNombre}>{estado.nombre}</span>
          <span className={styles.pieMomento}>{estado.momento}</span>
        </figcaption>
      </figure>
      <p className={styles.visorCerrar}>Toca para cerrar</p>
    </div>
  )
}

// ── c) Escena del rasgo confirmado ──────────────────────────────────────
function EscenaRasgo() {
  const reducido = useMovimientoReducido()
  const { hijo, rasgo } = useRasgoDeLaBrava()
  const [vuelta, setVuelta] = useState(0)
  const [listo, setListo] = useState(reducido)

  useEffect(() => {
    if (reducido) {
      setListo(true)
      return undefined
    }
    setListo(false)
    const t = setTimeout(() => setListo(true), duracionMs('--motion-lenta'))
    return () => clearTimeout(t)
  }, [vuelta, reducido])

  // El genero sale del perfil del hijo; el nombre solo se muestra.
  const nombre = hijo?.nombre || `tu ${palabrasGenero(hijo).sustantivo}`
  const titulo = rasgo?.titulo || RASGO_RESPALDO

  return (
    <section className={styles.seccion}>
      <h2 className={styles.rotulo}>Escena: rasgo confirmado</h2>

      <div className={styles.escenario} key={vuelta}>
        <VideoPersonaje
          archivo="02-orgulloso"
          className={`${styles.escenaCirculo} ${reducido ? '' : styles.rebote}`}
        />
      </div>

      {listo && (
        <div className={styles.revelado} key={`texto-${vuelta}`}>
          <p className={`${styles.volanta} ${styles.cascada}`} style={{ '--orden': 0 }}>
            Algo que descubrimos de {nombre}
          </p>
          <h3 className={`${styles.tituloRasgo} ${styles.cascada}`} style={{ '--orden': 1 }}>
            {titulo}
          </h3>
          {rasgo && (
            <p className={`${styles.linea} ${styles.cascada}`} style={{ '--orden': 2 }}>
              Apareció en {rasgo.evidencia_count} momentos que registraste.
            </p>
          )}
          <div className={styles.cascada} style={{ '--orden': 3 }}>
            <Button fullWidth onClick={() => {}}>Ver su huella</Button>
          </div>
        </div>
      )}

      <div className={styles.repetir}>
        <Button
          variant="ghost"
          onClick={() => {
            // Se esconde el texto en el mismo render que la vuelta, para que
            // la escena nueva no pinte un cuadro con el texto ya puesto.
            if (!reducido) setListo(false)
            setVuelta((v) => v + 1)
          }}
        >
          Repetir
        </Button>
      </div>
    </section>
  )
}

// Prueba del estado "pensando": el mismo AlivioHuella y la misma tarjeta de la
// pantalla de guardado del episodio (con sus clases), 8 s de carga simulada y
// después un texto, para ver la salida con fundido. No llama a la IA.
const CARGA_SIMULADA = 8000

function PruebaPensando({ userId }) {
  const [prueba, setPrueba] = useState(null) // { n, texto, variante }
  const zonaRef = useRef(null)
  useEffect(() => {
    if (!usaPensando(userId)) return undefined
    VARIANTES_PENSANDO.forEach(precargarPensando)
    const limpiar = VARIANTES_PENSANDO.map(calentarPensando)
    return () => limpiar.forEach((f) => f())
  }, [userId])
  // Sin `v`: sigue la alternancia (al azar sin repetir la ultima). Con `v`: fuerza esa.
  const probar = (v) => {
    const variante = usaPensando(userId) ? (v || elegirPensando(userId)) : null
    setPrueba((p) => ({ n: (p?.n || 0) + 1, texto: '', variante }))
  }
  // La prueba queda bajo el botón: se trae a la vista, porque WebKit no pinta
  // los cuadros de un video fuera de pantalla y el vigilante lo daría por caído.
  useEffect(() => {
    if (prueba?.n) zonaRef.current?.scrollIntoView({ block: 'center' })
  }, [prueba?.n])
  useEffect(() => {
    if (!prueba || prueba.texto) return undefined
    const id = setTimeout(() => setPrueba((p) => ({ ...p, texto: 'Esto es solo una prueba: aquí aparece lo primero que Huella te responde.' })), CARGA_SIMULADA)
    return () => clearTimeout(id)
  }, [prueba])

  return (
    <>
      <div className={styles.repetir}>
        <Button variant="ghost" onClick={() => probar()}>
          Ver pensando
        </Button>
      </div>
      <div className={styles.repetir}>
        {VARIANTES_PENSANDO.map((v, i) => (
          <Button key={v.id} variant="ghost" size="sm" onClick={() => probar(v)}>
            {i + 1}
          </Button>
        ))}
      </div>
      {prueba && (
        <div ref={zonaRef} className={styles.pruebaPensando}>
          <div className={regStyles.gSello}>
            <SelloPensando key={prueba.n} pensando={prueba.variante} activo={!prueba.texto} alMostrar={() => marcarPensando(userId, prueba.variante.id)} className={regStyles.gSelloBicho} />
            <p className={regStyles.gEyebrowVoz}>huella te lee</p>
          </div>
          <div className={regStyles.gAlivio}>
            <AlivioHuella key={prueba.n} texto={prueba.texto} cargando={!prueba.texto} />
          </div>
          <div className={regStyles.gCards}>
            <section className={regStyles.gWell}>
              <div className={regStyles.gWellHead}>
                <h4 className={regStyles.gWellTitulo}>¿Cómo te sentiste tú?</h4>
                <span className={regStyles.gWellTag}>Opcional</span>
              </div>
              <VoiceTextarea value="" onChange={() => {}} onVoiceResult={() => {}} placeholder="Escribe si quieres — esto es solo para ti." />
            </section>
          </div>
        </div>
      )}
    </>
  )
}

// La vitrina vive fuera del Layout: no tiene la barra inferior a la que se
// engancha la capa del escarabajo, ni el <main> que desplaza la app. Esta
// escena los arma con las MISMAS clases del Layout (container, main que
// desplaza, bottomNav con data-nav-inferior), a pantalla completa, con
// contenido de sobra para desplazar y botones que cuentan toques. La escena
// se cierra sola cuando la animacion termina o no puede correr.
function EscenaApp({ titulo, alCerrar, children }) {
  const [toques, setToques] = useState(0)
  // la animacion busca la barra al montarse: se monta recien cuando la
  // escena (y su barra) ya estan en el DOM
  const [lista, setLista] = useState(false)
  useEffect(() => { setLista(true) }, [])
  return createPortal(
    <div className={styles.escena}>
      <div className={layoutStyles.container}>
        <header className={layoutStyles.header} />
        <main className={layoutStyles.main}>
          <p className={styles.escenaTitulo}>{titulo}</p>
          <p className={styles.escenaAyuda}>Mientras corre, desliza hacia abajo y toca los botones de abajo. Toques: {toques}</p>
          <div className={styles.repetir}>
            <Button variant="ghost" size="sm" onClick={alCerrar}>Cerrar prueba</Button>
          </div>
          {Array.from({ length: 14 }, (_, i) => (
            <button key={i} type="button" className={styles.escenaFila} onClick={() => setToques((n) => n + 1)}>
              Fila de prueba {i + 1}
            </button>
          ))}
        </main>
        <nav className={layoutStyles.bottomNav} data-nav-inferior="">
          {['Inicio', 'Historial', '+', 'Patrones', 'Ideas'].map((t) => (
            <span key={t} className={layoutStyles.navItem}>{t}</span>
          ))}
        </nav>
        {lista && children}
      </div>
    </div>,
    document.body
  )
}

// Visita de orgulloso dentro de la escena. Sin numero sigue la alternancia
// (sin repetir la ultima); con numero fuerza esa variante.
// Bienvenida A / B / C: diagnostico TEMPORAL del Home que no se desplaza en el
// iPhone (ver `prueba` en BienvenidaEscarabajo). Usa la variante Centro y no
// marca el dia, asi no gasta la bienvenida del Home.
const CENTRO = VARIANTES.find((v) => v.id === 'centro')
const PRUEBAS_SCROLL = [
  { id: 'A', rotulo: 'Bienvenida A (como hoy)' },
  { id: 'B', rotulo: 'Bienvenida B (video en la barra)' },
  { id: 'C', rotulo: 'Bienvenida C (video chico)' },
]

function PruebasEscena({ userId }) {
  const [prueba, setPrueba] = useState(null) // { n, tipo, variante, modo }
  const cerrar = () => setPrueba(null)
  const abrir = (tipo, variante, modo) => setPrueba((p) => ({ n: (p?.n || 0) + 1, tipo, variante, modo }))
  const verOrgulloso = (v) => { if (usaOrgulloso(userId)) abrir('orgulloso', v || elegirOrgulloso(userId)) }
  return (
    <>
      <div className={styles.repetir}>
        <Button variant="ghost" onClick={() => verOrgulloso()}>
          Ver orgulloso
        </Button>
      </div>
      <div className={styles.repetir}>
        {VARIANTES_ORGULLOSO.map((v, i) => (
          <Button key={v.id} variant="ghost" size="sm" onClick={() => verOrgulloso(v)}>
            {i + 1}
          </Button>
        ))}
      </div>
      {PRUEBAS_SCROLL.map((m) => (
        <div key={m.id} className={styles.repetir}>
          <Button variant="ghost" size="sm" onClick={() => abrir('bienvenida', CENTRO, m.id)}>
            {m.rotulo}
          </Button>
        </div>
      ))}
      {prueba && (
        <EscenaApp
          key={prueba.n}
          titulo={prueba.tipo === 'orgulloso' ? `Orgulloso: ${prueba.variante.id}` : `Bienvenida ${prueba.modo}`}
          alCerrar={cerrar}
        >
          {prueba.tipo === 'orgulloso'
            ? <OrgullosoEscarabajo userId={userId} variante={prueba.variante} alTerminar={cerrar} />
            : <BienvenidaEscarabajo userId={userId} variante={prueba.variante} prueba={prueba.modo} alPrimerCuadro={() => {}} alTerminar={cerrar} />}
        </EscenaApp>
      )}
    </>
  )
}

export default function PersonajePage() {
  const { user } = useAuth()
  const verBienvenida = (forzada) => {
    if (forzada) forzarVariante(forzada)
    borrarMarcaBienvenida(user.id)
    window.location.assign('/panel')
  }
  const [abierto, setAbierto] = useState(null)
  const cerrar = React.useCallback(() => setAbierto(null), [])

  return (
    <main className={styles.pagina}>
      <section className={styles.seccion}>
        <h2 className={styles.rotulo}>Los 10 estados</h2>
        <div className={styles.grilla}>
          {ESTADOS.map((e) => (
            <button
              key={e.archivo}
              type="button"
              className={styles.celda}
              onClick={() => setAbierto(e)}
              aria-label={`Ver en grande: ${e.nombre}`}
            >
              <VideoPersonaje archivo={e.archivo} pausado={abierto !== null} />
              <span className={styles.pie}>
                <span className={styles.pieNombre}>{e.nombre}</span>
                <span className={styles.pieMomento}>{e.momento}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <EscenaRasgo />

      {/* Prueba de la bienvenida del Home: borra la marca de hoy y va al Home.
          Carga completa y no navigate: asi el celular siempre prueba el codigo
          recien desplegado, aunque la pestaña estuviera abierta de antes.
          El boton grande sigue la alternancia (sale la que no se vio la ultima
          vez); los chicos fuerzan una variante, para QA. */}
      <div className={styles.repetir}>
        <Button variant="ghost" onClick={() => verBienvenida()}>
          Ver bienvenida otra vez
        </Button>
      </div>
      <div className={styles.repetir}>
        {VARIANTES.map((v) => (
          <Button
            key={v.id}
            variant="ghost"
            size="sm"
            onClick={() => verBienvenida(v.id)}
          >
            {v.nombre}
          </Button>
        ))}
      </div>

      <PruebaPensando userId={user.id} />

      <PruebasEscena userId={user.id} />

      {abierto && <Visor estado={abierto} alCerrar={cerrar} />}
    </main>
  )
}
