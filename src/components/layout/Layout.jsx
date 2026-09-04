import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Plus, User } from 'lucide-react'
import Onboarding from '../../pages/onboarding/Onboarding'
import Logo from '../ui/Logo'
import { persistirPerfilOnboarding } from '../../services/onboardingPersistor'
import NotifBanner from '../NotifBanner'
import { useHuella } from '../../context/HuellaContext'
import { useFamily } from '../../context/FamilyContext'
import { useMedallasNuevas } from '../medallas/medallasNuevas'
import CitaLoader from '../ui/CitaLoader'
import styles from './Layout.module.css'

// B3 · la barra baja de 5 a 3.
//
// Salieron Historial, Estrategias y Logros. No desaparecieron del producto:
// Momentos (antes Historial) y Estrategias se abren desde las puertas del
// Home, y las medallas se mudaron a Perfil. La barra queda con lo único que
// se usa a diario: dónde estás, registrar, y tú.
//
// El orden de `navItems` importa para la animación de transición entre
// páginas: getNavIndex compara el índice actual con el anterior para decidir
// si la página entra por la derecha o por la izquierda.
const navItems = [
  { to: '/panel',  icon: Home, label: 'Inicio' },
  { to: '/nuevo',  icon: Plus, label: 'Registrar', destacado: true },
  { to: '/perfil', icon: User, label: 'Tú', esPerfil: true },
]

const NAV_PATHS = navItems.map((n) => n.to)

function getNavIndex(pathname) {
  return NAV_PATHS.findIndex((p) => pathname.startsWith(p))
}

// La animacion de entrada se QUITA cuando termina. No es cosmetico: las tres
// clases animadas usan `animation-fill-mode: both`, y Chrome trata a un
// elemento con animacion terminada-pero-rellena como si siguiera animando.
// Con `fadeIn` eso deja al wrapper con un stacking context propio aunque la
// opacidad ya sea 1; con `slideIn` queda `transform: translateX(0)`, que
// ademas lo vuelve containing block de los `position: fixed`. Resultado: todo
// bottom sheet u overlay fixed que viva dentro de una pagina (la rutina, las
// medallas, la hoja de estrategias...) queda atrapado debajo de la barra de
// navegacion, que se pinta encima y tapa el boton de guardar. Se vio en
// Android real en /hijo?tab=rutina (4 sep 2026).
//
// Al terminar la animacion, `pageLlegado` reemplaza a la clase animada: sin
// animation, sin transform, opacidad 1. La entrada se ve identica y la pagina
// queda en el contexto raiz, donde su z-index vale de verdad. Las capas que ya
// se portalean a document.body (UpgradeModal, CerrarPatronModal, el Cerebro y
// la capa post-guardado) no dependen de esto y siguen igual.
//
// El reset al cambiar de ruta es automatico: el Layout monta este componente
// con `key={location.key}`, asi que cada pantalla nueva arranca con `llegado`
// en false y vuelve a animar.
function PageTransition({ children, direction }) {
  const [ready, setReady] = useState(false)
  const [llegado, setLlegado] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  let animClass = ''
  if (llegado) {
    animClass = styles.pageLlegado
  } else if (ready) {
    if (direction === 'forward')   animClass = styles.pageSlideRight
    else if (direction === 'backward') animClass = styles.pageSlideLeft
    else                           animClass = styles.pageVisible
  }

  // `animationend` burbujea: cualquier animacion de un hijo (un loader, el
  // pulso de un chip) llegaria aca. Solo cuenta la del propio wrapper.
  const handleAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return
    setLlegado(true)
  }

  return (
    <div
      className={`${styles.pageWrap}${animClass ? ` ${animClass}` : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className={styles.skeletonPage}>
      <CitaLoader categoria="general" />
      <div className={styles.skeletonCard} style={{ height: 80 }} />
      <div className={styles.skeletonCard} style={{ height: 120 }} />
      <div className={styles.skeletonCard} style={{ height: 60 }} />
    </div>
  )
}

export default function Layout() {
  const { state, dataLoading, dataLoaded, reloadData } = useHuella()
  const { family, familyLoading } = useFamily()

  // Medalla ganada y todavía sin ver → puntito terracota en la pestaña "Tú",
  // el mismo patrón visual del puntito de la campana en el Home. Las medallas
  // viven en Perfil desde B3, así que sin este aviso ganar una no se nota:
  // hay que entrar a buscarla. Se apaga cuando el padre despliega el nivel que
  // la contiene (ver `medallasNuevas.js`).
  const { hayNuevas: hayMedallaNueva } = useMedallasNuevas()

  // Fuente de verdad del onboarding: los DATOS DE LA CUENTA, no localStorage.
  // Un usuario que ya tiene un hijo creado (el onboarding siempre crea uno) o
  // el nombre de perfil poblado NO es nuevo → nunca ve el onboarding, aunque
  // el storage del dispositivo se haya borrado (eviction de iOS, reinstalar la
  // PWA, etc.). Solo lo ve quien de verdad no tiene cuenta armada todavía.
  const yaTieneCuenta =
    state.hijos.length > 0 || (state.padreNombre || '').trim() !== ''

  // Latch local de cierre inmediato. NO decide quién es nuevo (eso lo hace
  // `yaTieneCuenta`): solo puentea el instante entre que el onboarding guarda
  // y que `reloadData` trae el hijo recién creado. Sin él, el onboarding
  // reaparecería por un frame.
  //
  // Ya no arranca leyendo sessionStorage: ese valor lo escribía el "Saltar",
  // que se eliminó. Hoy el onboarding solo se cierra completándolo, y lo que
  // lo mantiene cerrado para siempre es `yaTieneCuenta` (el hijo en la base),
  // no el storage del dispositivo.
  const [onboardingCerrado, setOnboardingCerrado] = useState(false)
  const [onboardingEnCurso, setOnboardingEnCurso] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  // ── Modo ensayo · ?onboarding=1 ───────────────────────────────────────────
  // QA visual del onboarding sin ensuciar la base. Abre el flujo completo
  // aunque la cuenta ya esté armada, y NADA de lo que se escriba se persiste:
  // el `onComplete` de más abajo corta ANTES de llamar a
  // `persistirPerfilOnboarding`, así que las cuatro escrituras del flujo (el
  // upload del avatar a Storage, el upsert a `perfiles` y los dos
  // `upsert_family_child`) nunca llegan a ocurrir. El acto B tampoco llama a
  // Anthropic, salvo en la variante con IA real de mas abajo: ver el prop
  // `ensayo` de OnboardingComposer.
  const ensayoParam =
    new URLSearchParams(location.search).get('onboarding') === '1'

  // ── Variante con IA real · ?onboarding=1&ia=1 ─────────────────────────────
  // El mismo ensayo de siempre —cero escrituras de perfil, hijo y fotos, chip
  // visible y salida limpia al Home— con UNA sola diferencia: el acto B llama
  // de verdad a Anthropic con el nombre, la edad y el genero que se acaban de
  // escribir en el acto A, en vez de pintar el fallback local. Sirve para
  // revisar la respuesta REAL del modelo antes de soltarla a los testers.
  //
  // Lo unico que si queda escrito es la fila que el backend registra en
  // `api_llamadas` (api/anthropic.js). Es solo el contador de uso, no dato de
  // la cuenta: aceptable a cambio de poder ver la respuesta de verdad.
  //
  // `ia=1` por si solo no hace nada: sin `onboarding=1` no hay ensayo.
  const iaRealParam =
    new URLSearchParams(location.search).get('ia') === '1'

  // Latch propio, separado de `onboardingCerrado` para no contaminar el flujo
  // real. Se resetea cuando el param reaparece, así volver a entrar a
  // ?onboarding=1 arranca de cero sin necesidad de recargar la página.
  const [ensayoCerrado, setEnsayoCerrado] = useState(false)
  useEffect(() => {
    if (ensayoParam) setEnsayoCerrado(false)
  }, [ensayoParam])

  const ensayo = ensayoParam && !ensayoCerrado
  const ensayoIA = ensayo && iaRealParam

  // Salida del ensayo: apaga el latch y limpia los dos params del ensayo
  // (`onboarding` e `ia`), conservando los demás. Los datos reales de la
  // cuenta nunca se tocaron.
  const salirDelEnsayo = useCallback(() => {
    setEnsayoCerrado(true)
    const params = new URLSearchParams(location.search)
    params.delete('onboarding')
    params.delete('ia')
    const qs = params.toString()
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true })
  }, [location.search, location.pathname, navigate])

  // Solo decidimos DESPUÉS de cargar la cuenta (`dataLoaded`): antes no sabemos
  // si tiene hijo y no debemos mostrarlo "por defecto". La guarda de modo
  // pareja (`role === 'owner'`) se conserva en la propia condición.
  //
  // El ensayo puentea las tres guardas (cuenta ya armada, latch de cierre y
  // rol de pareja) porque su razón de ser es justamente verse en una cuenta
  // que YA está completa. Sin el param la expresión es la de antes, carácter
  // por carácter.
  const showOnboarding =
    ensayo ||
    onboardingEnCurso ||
    (dataLoaded &&
      !yaTieneCuenta &&
      !onboardingCerrado &&
      (!family || family.role === 'owner'))

  // Latch de "ya se está mostrando". Desde el acto C el guardado corre en
  // segundo plano y su `reloadData` trae el hijo recién creado: sin este
  // latch, `yaTieneCuenta` pasaría a true y el onboarding se desmontaría
  // antes de que el padre alcance a tocar "Entrar a Huella". Se enciende la
  // primera vez que el gate de arriba decide mostrarlo y lo apaga `onEntrar`.
  useEffect(() => {
    if (showOnboarding && !ensayo) setOnboardingEnCurso(true)
  }, [showOnboarding, ensayo])

  const prevIndexRef = useRef(null)
  const currentIndex = getNavIndex(location.pathname)
  const prevIndex = prevIndexRef.current
  prevIndexRef.current = currentIndex

  let direction = 'none'
  if (prevIndex !== null && prevIndex !== -1 && currentIndex !== -1 && prevIndex !== currentIndex) {
    direction = currentIndex > prevIndex ? 'forward' : 'backward'
  }

  return (
    <div className={styles.container}>
      {dataLoading && <div className={styles.loadingBar} />}
      {!familyLoading && showOnboarding && (ensayo || !family || family.role === 'owner') && (
        <Onboarding
          ensayo={ensayo}
          ensayoIA={ensayoIA}
          onSalirEnsayo={salirDelEnsayo}
          onComplete={async (perfil) => {
            // Modo ensayo: cortamos ANTES del persistor. Ninguna escritura
            // llega a Supabase y el `perfil` muere con el desmonte del
            // componente — la cuenta real queda exactamente como estaba.
            // El acto C se muestra igual; la salida la hace `onEntrar`.
            if (ensayo) return
            try {
              await persistirPerfilOnboarding(perfil, {
                // Bloque 3: el primer episodio se afina en segundo plano
                // (extracción y luego orientación). Cada etapa que termina
                // de escribir en la base pide un reload, así el Home pasa de
                // "Otro" al tipo real y después muestra la orientación sin
                // que nadie recargue la página.
                onEpisodioActualizado: () => reloadData(),
              })
              // El perfil y el hijo ya quedaron en la base, pero el contexto
              // sigue con los datos viejos de antes del onboarding. Recargamos
              // para que el Home muestre tu nombre y el del hijo recién creados
              // sin necesidad de un refresh manual.
              reloadData()
            } catch (err) {
              // Si el guardado falla (red o RPC caída) NO cerramos: re-lanzamos
              // para que el slide final avise y deje reintentar, en vez de dejar
              // al usuario sin perfil ni hijo guardados. El hijo no quedó creado,
              // así que `yaTieneCuenta` sigue false y el onboarding persiste.
              console.error('[Layout] persistirPerfilOnboarding falló:', err)
              throw err
            }
            // Ya NO cerramos acá: el guardado corre mientras el padre lee el
            // acto C, y el cierre lo hace `onEntrar` cuando toca "Entrar a
            // Huella". Mientras tanto `onboardingEnCurso` lo mantiene montado
            // aunque el `reloadData` de arriba ya haya traído el hijo.
          }}
          onEntrar={() => {
            if (ensayo) {
              salirDelEnsayo()
              return
            }
            // Tras el reload, `hijos.length > 0` lo mantiene cerrado para
            // siempre, sin importar el storage del dispositivo. El latch de
            // cierre puentea el instante en que el reload todavía no llegó.
            setOnboardingEnCurso(false)
            setOnboardingCerrado(true)
          }}
        />
      )}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Logo className={styles.logo} height={32} />
          <NavLink to={state.hijo ? '/hijo' : '/perfil'} className={styles.profileBtn}>
            {state.hijo?.avatarUrl
              ? <img src={state.hijo.avatarUrl} alt="Avatar" className={styles.profileAvatar} />
              : <User size={20} />}
          </NavLink>
        </div>
      </header>

      <main className={styles.main}>
        <NotifBanner />
        {dataLoading ? <SkeletonLoader /> : (
          <PageTransition key={location.key} direction={direction}>
            <Outlet />
          </PageTransition>
        )}
      </main>

      <nav className={styles.bottomNav}>
        {navItems.map(({ to, icon: Icon, label, destacado, esPerfil }) =>
          destacado ? (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `${styles.navRegistrar} ${isActive ? styles.navRegistrarActive : ''}`
            }>
              <div className={styles.navRegistrarBtn}>
                <Icon size={22} />
              </div>
              <span className={styles.navRegistrarLabel}>{label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              {/* "Tú" muestra la foto real del padre cuando existe. Es el mismo
                  avatar de B1 que ya aparece en la cabecera del Home, así que
                  la pestaña se reconoce sin leer la etiqueta. */}
              {esPerfil && state.padreAvatarUrl ? (
                <img src={state.padreAvatarUrl} alt="" className={styles.navAvatar} />
              ) : (
                <Icon size={22} />
              )}
              {esPerfil && hayMedallaNueva && (
                <span className={styles.navPunto} aria-label="Tienes una medalla nueva" />
              )}
              <span>{label}</span>
            </NavLink>
          )
        )}
      </nav>
    </div>
  )
}
