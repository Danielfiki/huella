import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/ui/Logo'
import styles from './PortadaPage.module.css'

// Portada publica de Huella (propuesta B de Claude Design, "Bloques de
// color"). Vive en "/" para quien entra sin sesion desde el navegador
// (EntradaRaiz.jsx + destinoRaiz.js). El copy es el del diseno,
// palabra por palabra; donde la version de computador dice otra cosa, van
// las dos y el CSS muestra la que corresponde (.soloMovil / .soloEscritorio).
// Las capturas son reales (cuenta de prueba, Tomás) y viven en
// public/portada/ en WebP a 930 px (3x del telefono mas grande). Desde el 6 oct
// 2026 suma El perfil único, fotos en ¿Qué avanzó? y en el cierre, y no lleva
// el escarabajo 3D (lo que se probó en /portada-prueba).

const TITULO = 'Huella — Conoce y potencia a tu hijo'

// Edades de algunos autores (src/services/anthropic.js: EDAD_MINIMA_AUTOR y
// EDAD_MAXIMA_AUTOR). `hasta`: entra hasta esa edad; `desde`: entra desde esa
// edad. Carlos González salio de la portada (4 oct 2026); no entro otro: los
// demas autores del banco no tienen limite de edad en el codigo.
const AUTORES = [
  { nombre: 'Gerber', hasta: 3 },
  { nombre: 'Lansbury', hasta: 6 },
  { nombre: 'Bowlby', hasta: 11 },
  { nombre: 'Wolfelt', desde: 3 },
  { nombre: 'Haidt', desde: 10 },
  { nombre: 'Twenge', desde: 10 },
  { nombre: 'Damour', desde: 12 },
  { nombre: 'Steinberg', desde: 12 },
]
const EDAD_MAX = 18

const DIMENSIONES = [
  'Apego', 'Autorregulación', 'Validación emocional', 'Disciplina sin castigo',
  'Desarrollo cerebral', 'Presencia respetuosa', 'Juego libre', 'Sueño con presencia',
  'Crianza consciente', 'Alta sensibilidad', 'Neurodiversidad respetuosa', 'Habilidad rezagada',
  'Duelo infantil', 'Trauma somático', 'Adolescencia', 'Pantallas y salud mental',
]

const FAMILIAS = [
  { titulo: 'Lo que lo mueve', punto: styles.puntoMueve, lentes: ['Se interesó por algo', 'Se atrevió a algo nuevo', 'Creó o inventó algo', 'Logró algo con el cuerpo'] },
  { titulo: 'Sus fortalezas', punto: styles.puntoFortalezas, lentes: ['Cuidó a alguien', 'Lo hizo solo', 'Jugó con otros', 'Dijo algo que te sorprendió'] },
  { titulo: 'Lo que lo calma', punto: styles.puntoCalma, lentes: ['Se calmó solo', 'Esperó o aceptó un no', 'Pidió ayuda', 'Se lo tomó con humor'] },
]

const FUNCIONES = [
  { titulo: 'Momentos', texto: 'Todo lo que has registrado, por día, con filtros para lo difícil y los avances. Con Pro lo exportas en PDF.' },
  { titulo: 'Preguntar a Huella', texto: 'Para la duda que te queda dando vueltas. Huella responde según la edad de tu hijo.' },
  { titulo: 'Algo que aún no cambia', texto: 'El chupete, el pañal, dormir en tu cama, comer poco. Lo que se repite tiene su propio seguimiento.' },
  { titulo: 'Huella · Esta semana', texto: 'Cada domingo te llega una lectura que conecta lo que fuiste registrando. Tres líneas para todos; el análisis completo con Pro.' },
  { titulo: 'Estrategias de 4 semanas', texto: 'Para lo que se repite, un plan con tareas concretas semana a semana.' },
  { titulo: 'Crianza compartida', texto: 'Invitas a tu pareja y registran juntos lo que vive su hijo.', pro: true },
]

// Rasgos reales de Tomás (cuenta de prueba, confirmados el 5 oct 2026)
const RASGOS_TOMAS = [
  'Cuando algo le llama la atención, observa con calma y después se lanza con ganas',
  'Con tiempo y presencia silenciosa a su lado, logra calmarse solo',
  'Cuando se frustra, puede reencuadrarse y buscar otra salida',
]

const PLAN_GRATIS = ['Hasta 15 momentos', 'Hasta 3 estrategias de 4 semanas al mismo tiempo', 'Huella · Esta semana, en tres líneas']
const PLAN_PRO = ['Momentos ilimitados', 'Estrategias de 4 semanas con tareas concretas', 'Seguimiento después de cada momento difícil', 'Análisis semanal completo', 'Informes PDF de tu historial', 'Modo familia: conecta con tu pareja']

// Marco de telefono. `tam` fija el ancho (y con el, bordes, isla y pie, que
// van en proporcion en el CSS). `cortado`: sin pie, recortado abajo por su
// contenedor (el del hero).
function Telefono({ tam, src, alt, alto = 1583, cortado = false, marco, pantalla, isla, conAlto, prioridad = false }) {
  return (
    <div className={`${styles.telefono} ${tam} ${marco || ''} ${cortado ? styles.cortado : ''}`}>
      <div className={`${styles.pantalla} ${pantalla || ''}`}>
        <div className={`${styles.isla} ${isla || ''}`}><span /></div>
        <div className={conAlto ? styles.altoCompleto : undefined}>
          <img
            className={styles.captura}
            src={src}
            alt={alt}
            width="930"
            height={alto}
            loading={prioridad ? 'eager' : 'lazy'}
            fetchPriority={prioridad ? 'high' : undefined}
            decoding="async"
          />
        </div>
        {!cortado && <div className={styles.pie} />}
      </div>
    </div>
  )
}

// Foto de la portada: WebP con JPG de respaldo, en varios anchos
// (public/portada/fotos/, origen en docs/portada-fotos-origen.md). `ancho` y
// `alto` son los del archivo mas chico: fijan la proporcion para que la
// pagina no salte al cargar. `escritorio`: otro recorte desde 900 px
// ({ nombre, anchos, sizes }), cuando el diseno encuadra distinto.
function Foto({ nombre, anchos, ancho, alto, sizes, alt, className, escritorio }) {
  const serie = (ext, n = nombre, lista = anchos) => lista.map((a) => `/portada/fotos/${n}-${a}.${ext} ${a}w`).join(', ')
  const ESCRITORIO = '(min-width: 900px)'
  return (
    <picture className={className}>
      {escritorio && <source media={ESCRITORIO} type="image/webp" srcSet={serie('webp', escritorio.nombre, escritorio.anchos)} sizes={escritorio.sizes} />}
      {escritorio && <source media={ESCRITORIO} type="image/jpeg" srcSet={serie('jpg', escritorio.nombre, escritorio.anchos)} sizes={escritorio.sizes} />}
      <source type="image/webp" srcSet={serie('webp')} sizes={sizes} />
      <img
        className={styles.fotoImagen}
        src={`/portada/fotos/${nombre}-${anchos[0]}.jpg`}
        srcSet={serie('jpg')}
        sizes={sizes}
        width={ancho}
        height={alto}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  )
}

export default function PortadaPage() {
  useEffect(() => {
    const antes = document.title
    document.title = TITULO
    window.scrollTo(0, 0)
    return () => { document.title = antes }
  }, [])

  return (
    <div className={styles.pagina}>

      {/* Hero */}
      <section className={styles.hero}>
        <Logo soloSimbolo className={styles.marcaAgua} height={300} />
        <div className={styles.contenedor}>
          <header className={styles.cabecera}>
            <Link to="/" aria-label="Huella, inicio" className={styles.logoEnlace}>
              <Logo className={styles.logo} height={39} />
            </Link>
            <nav className={styles.navCabecera}>
              <Link to="/login" className={styles.enlaceEntrar}>Entrar</Link>
              <Link to="/signup" className={`${styles.botonCabecera} ${styles.soloEscritorio}`}>Crear cuenta</Link>
            </nav>
          </header>
          <div className={styles.heroGrilla}>
            <div className={styles.heroTexto}>
              <h1 className={styles.heroTitulo}>¿Qué pasó hoy con tu hijo?</h1>
              <p className={styles.heroBajada}>Cuéntaselo a Huella como se lo contarías a una amiga, sin orden y sin filtro. Huella lo lee y te orienta según su edad, de 0 a 18 años.</p>
              <div className={styles.heroAcciones}>
                <Link to="/signup" className={styles.botonCrema}>Crear cuenta</Link>
                <Link to="/login" className={styles.botonBorde}>Entrar</Link>
                <p className={styles.heroGratis}>Gratis hasta 15 momentos.</p>
              </div>
            </div>
            <div className={styles.heroTelefono}>
              <Telefono
                tam={styles.tamHero}
                cortado
                prioridad
                src="/portada/registrar.webp"
                alt="Pantalla Registrar de Huella: ¿Qué pasó con Tomás? Cuéntamelo como se lo contarías a una amiga."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Lema */}
      <section className={styles.lema}>
        <p className={styles.lemaTexto}>Conoce y potencia a tu hijo</p>
      </section>

      {/* El perfil único */}
      <section className={styles.perfil}>
        <div className={`${styles.contenedor} ${styles.perfilInterior}`}>
          <div className={styles.perfilEncabezado}>
            <div className={styles.encabezado}>
              <p className={styles.antetitulo}>Su huella</p>
              <h2 className={styles.titulo}>
                <span className={styles.linea}>Con cada</span> <span className={styles.linea}>momento,</span> <span className={styles.linea}>lo conoces</span> <span className={styles.linea}>un poco más</span>
              </h2>
            </div>
            <p className={styles.perfilBajada}>Cada vez que registras algo, Huella va notando qué lo mueve y qué lo calma. Lo que descubre queda guardado en su perfil, rasgo a rasgo.</p>
          </div>
          <div className={styles.perfilGrilla}>
            <div className={styles.perfilEscena}>
              <Foto
                className={styles.perfilFoto}
                nombre="manos"
                anchos={[480, 800, 1240]}
                ancho="480"
                alto="571"
                sizes="(min-width: 900px) 620px, 100vw"
                alt="Manos de un adulto y una niña chocando las palmas"
              />
              <div className={styles.perfilTelefono}>
                <Telefono tam={styles.tamPerfil} marco={styles.marcoSombra} src="/portada/su-huella.webp" alt="Pantalla Su huella, con el camino de rasgos que Huella fue encontrando en un niño." />
              </div>
            </div>
            <div className={styles.rasgos}>
              <p className={styles.antetitulo}>Así lo ve Huella: rasgos que fue encontrando en Tomás</p>
              <ol className={styles.camino}>
                {RASGOS_TOMAS.map((r) => <li key={r} className={styles.rasgo}>{r}</li>)}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className={styles.comoFunciona}>
        <div className={`${styles.contenedor} ${styles.comoFuncionaInterior}`}>
          <div className={styles.encabezado}>
            <p className={styles.antetitulo}>Paso a paso</p>
            <h2 className={styles.titulo}>Cómo funciona</h2>
          </div>
          <ol className={styles.pasos}>
            <li className={styles.paso}>
              <span className={styles.pasoNumero}>1</span>
              <div className={styles.pasoTexto}>
                <h3 className={styles.pasoTitulo}>Cuentas lo que pasó</h3>
                <p className={styles.pasoDescripcion}>Hablando o escribiendo, con tus palabras. Apenas pasa o cuando puedas.</p>
              </div>
            </li>
            <li className={styles.paso}>
              <span className={styles.pasoNumero}>2</span>
              <div className={styles.pasoTexto}>
                <h3 className={styles.pasoTitulo}>Huella te lee</h3>
                <p className={styles.pasoDescripcion}>Te devuelve lo que contaste y te explica qué le está pasando a tu hijo a su edad.</p>
              </div>
            </li>
            <li className={styles.paso}>
              <span className={styles.pasoNumero}>3</span>
              <div className={styles.pasoTexto}>
                <h3 className={styles.pasoTitulo}>Te orienta según su edad</h3>
                <p className={styles.pasoDescripcion}>Qué hacer en los próximos minutos, incluso en plena crisis. Si algo se repite, una estrategia de 4 semanas.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Huella te lee */}
      <section className={styles.teLee}>
        <div className={`${styles.contenedor} ${styles.teLeeGrilla}`}>
          <div className={styles.teLeeTexto}>
            <Logo soloSimbolo className={styles.escarabajoChico} height={38} />
            <h2 className={styles.titulo}>Huella te lee</h2>
            <p className={styles.bajadaOscura}>Después de cada momento, Huella te devuelve lo que contaste y lo pone en contexto según la edad de tu hijo. Y te dice qué hacer en los próximos minutos.</p>
          </div>
          <div className={styles.teLeeTelefonos}>
            <div className={styles.soloEscritorio}>
              <Telefono tam={styles.tamTeLee} marco={styles.marcoSuave} src="/portada/ficha.webp" alt="Momento guardado con la orientación de Huella." />
            </div>
            <div className={styles.teLeeSegundo}>
              <Telefono tam={styles.tamTeLee} marco={styles.marcoSuave} pantalla={styles.pantallaCrema} src="/portada/respuesta.webp" alt="Pantalla Huella te lee, con la explicación según la edad del niño." />
            </div>
          </div>
        </div>
      </section>

      {/* Avances */}
      <section className={styles.avances}>
        <div className={`${styles.contenedor} ${styles.avancesGrilla}`}>
          <div className={`${styles.avancesTelefono} ${styles.avancesEscena}`}>
            <Foto
              className={styles.avancesFoto}
              nombre="arenero"
              anchos={[360, 720]}
              ancho="360"
              alto="522"
              sizes="(min-width: 900px) 360px, 67vw"
              alt="Una niña de espaldas jugando en un arenero"
            />
            <div className={styles.avancesTelefonoSobre}>
              <Telefono tam={styles.tamAvanceSobre} marco={styles.marcoSombra} src="/portada/avance.webp" alt="Pantalla ¿Qué avanzó?, con las opciones de lo que asomó." />
            </div>
          </div>
          <div className={styles.avancesTexto}>
            <p className={styles.antetituloTinta}>Avances</p>
            <h2 className={styles.titulo}>¿Qué avanzó?</h2>
            <p className={styles.bajadaAvances}>También anotas lo que avanza. Lo cuentas con tus palabras, agregas una foto si quieres y marcas qué asomó ahí.</p>
            <div className={styles.familias}>
              {FAMILIAS.map((f) => (
                <div key={f.titulo} className={styles.familia}>
                  <h3 className={styles.familiaTitulo}><span className={`${styles.punto} ${f.punto}`} />{f.titulo}</h3>
                  <ul className={styles.lentes}>
                    {f.lentes.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Lo demás que hay en Huella */}
      <section className={styles.demas}>
        <div className={`${styles.contenedor} ${styles.demasInterior}`}>
          <div className={styles.encabezado}>
            <p className={styles.antetitulo}>Qué encuentras</p>
            <h2 className={styles.titulo}>Lo demás que hay en Huella</h2>
          </div>
          <div className={styles.demasGrilla}>
            <div className={styles.demasTelefonos}>
              <figure className={styles.figura}>
                <Telefono tam={styles.tamDemas} marco={styles.marcoLeve} src="/portada/momentos.webp" alt="Pantalla Momentos, con la lista de lo registrado." />
                <figcaption className={styles.figuraTexto}>Momentos</figcaption>
              </figure>
              <figure className={`${styles.figura} ${styles.figuraBaja}`}>
                <Telefono tam={styles.tamDemas} marco={styles.marcoLeve} pantalla={styles.pantallaCrema} isla={styles.islaMocha} conAlto alto={1057} src="/portada/preguntar.webp" alt="Pantalla Preguntar a Huella: ¿Es normal que a esta edad tenga pataletas tan largas?" />
                <figcaption className={styles.figuraTexto}>Preguntar a Huella</figcaption>
              </figure>
            </div>
            <div className={styles.funciones}>
              {FUNCIONES.map((f) => (
                <article key={f.titulo} className={styles.funcion}>
                  <h3 className={styles.funcionTitulo}>{f.titulo}{f.pro && <span className={styles.etiquetaPro}>Pro</span>}</h3>
                  <p className={styles.funcionTexto}>{f.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* El banco teórico */}
      <section className={`${styles.contenedor} ${styles.banco}`}>
        <div className={styles.bancoTextos}>
          <div className={styles.encabezado}>
            <p className={styles.antetitulo}>Detrás de Huella</p>
            <h2 className={styles.titulo}>El banco teórico</h2>
          </div>
          <p className={styles.bajadaBanco}>Huella usa inteligencia artificial apoyada en el trabajo de más de 80 expertos en crianza y desarrollo. Cada autor entra solo en las edades que le corresponden.</p>
        </div>
        <figure className={styles.grafico}>
          <figcaption className={styles.graficoTitulo}>Algunos autores y sus edades</figcaption>
          <div className={styles.graficoGrilla}>
            {AUTORES.map((a) => {
              const desde = a.desde ?? 0
              const hasta = a.hasta ?? EDAD_MAX
              return (
                <React.Fragment key={a.nombre}>
                  <span className={styles.autor}>{a.nombre}</span>
                  <div className={styles.carril}>
                    <div
                      className={`${styles.barra} ${a.hasta ? styles.barraHasta : styles.barraDesde}`}
                      style={{ '--desde': `${(desde / EDAD_MAX) * 100}%`, '--largo': `${((hasta - desde) / EDAD_MAX) * 100}%` }}
                    />
                  </div>
                </React.Fragment>
              )
            })}
            <span />
            <div className={styles.eje}>
              <span className={styles.marcaInicio}>0</span>
              <span className={styles.marca} style={{ '--en': '16.67%' }}>3</span>
              <span className={styles.marca} style={{ '--en': '33.33%' }}>6</span>
              <span className={`${styles.marca} ${styles.soloEscritorio}`} style={{ '--en': '55.56%' }}>10</span>
              <span className={styles.marca} style={{ '--en': '66.67%' }}>12</span>
              <span className={styles.marcaFin}>18 años</span>
            </div>
          </div>
          <div className={styles.leyenda}>
            <span className={styles.leyendaItem}><span className={`${styles.leyendaMuestra} ${styles.barraHasta}`} />Hasta cierta edad</span>
            <span className={styles.leyendaItem}><span className={`${styles.leyendaMuestra} ${styles.barraDesde}`} />Desde cierta edad</span>
          </div>
          <p className={styles.graficoNota}>Huella no está afiliada a estos autores: se apoya en su trabajo publicado.</p>
        </figure>
        <div className={styles.dimensiones}>
          <h3 className={styles.antetitulo}>16 dimensiones</h3>
          <div className={styles.chips}>
            {DIMENSIONES.map((d) => <span key={d} className={styles.chip}>{d}</span>)}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section className={styles.planes}>
        <div className={`${styles.contenedor} ${styles.planesGrilla}`}>
          <div className={styles.planesEncabezado}>
            <p className={styles.antetituloTerracota}>Planes</p>
            <h2 className={styles.titulo}>Empieza gratis</h2>
            <p className={`${styles.planesNota} ${styles.soloEscritorio}`}>Cuando llegues a los 15 momentos, decides si pasar a Pro.</p>
          </div>
          <div className={styles.planGratis}>
            <div className={styles.planGratisCabeza}>
              <h3 className={styles.planNombre}>Gratis</h3>
              <p className={styles.planGratisPrecio}>CLP 0</p>
            </div>
            <ul className={styles.planLista}>
              {PLAN_GRATIS.map((x) => <li key={x}><span className={styles.guion}>—</span>{x}</li>)}
            </ul>
            <Link to="/signup" className={styles.botonPlanGratis}>Crear cuenta</Link>
          </div>
          <div className={styles.planPro}>
            <div className={styles.planProCabeza}>
              <h3 className={styles.planNombre}>Pro</h3>
              <p className={styles.planProPrecio}>CLP 7.990 <span className={styles.planProPeriodo}>al mes</span></p>
              <p className={styles.planProAnual}>o CLP 59.990 al año: ahorras 37%</p>
            </div>
            <ul className={styles.planLista}>
              {PLAN_PRO.map((x) => <li key={x}><span className={styles.guionClaro}>—</span>{x}</li>)}
            </ul>
            <Link to="/signup" className={styles.botonPlanPro}>Crear cuenta</Link>
            <p className={styles.planProPago}>El pago se hace con Mercado Pago.</p>
          </div>
        </div>
      </section>

      {/* Cierre: foto a sangre en una mitad y texto en la otra */}
      <section className={styles.cierreNuevo}>
        <Foto
          className={styles.cierreFoto}
          nombre="sillon"
          anchos={[480, 800, 1440]}
          ancho="480"
          alto="356"
          sizes="100vw"
          escritorio={{ nombre: 'sillon-cerca', anchos: [720, 1440], sizes: '50vw' }}
          alt="Una mamá besa la cabeza de su hijo, abrazados en un sillón"
        />
        <div className={styles.cierreTexto}>
          <h2 className={styles.titulo}>
            <span className={styles.linea}>Empieza con lo</span> <span className={styles.linea}>que pasó hoy</span>
          </h2>
          <p className={styles.cierreBajada}>Cuéntale a Huella el primer momento, como te salga. Desde ahí, lo van conociendo juntos.</p>
          <div className={styles.cierreBotones}>
            <Link to="/signup" className={styles.botonCrema}>Crear cuenta</Link>
            <Link to="/login" className={styles.botonBorde}>Entrar</Link>
          </div>
          <p className={styles.cierreGratis}>Gratis hasta 15 momentos.</p>
        </div>
      </section>

      {/* Pie. El espacio del boton de Google Play se agrega al publicar. */}
      <footer className={styles.pie_}>
        <div className={`${styles.contenedor} ${styles.pieInterior}`}>
          <Logo className={styles.logoPie} height={41} />
          <nav aria-label="Legal" className={styles.legal}>
            <Link to="/privacidad" className={styles.enlaceLegal}>Política de privacidad</Link>
            <Link to="/terminos" className={styles.enlaceLegal}>Términos de uso</Link>
            <Link to="/eliminar-cuenta" className={styles.enlaceLegal}>Eliminar cuenta</Link>
          </nav>
          <a href="mailto:contacto@huella.lat" className={styles.correo}>contacto@huella.lat</a>
          <p className={styles.copyright}>© 2026 Huella</p>
        </div>
      </footer>
    </div>
  )
}
