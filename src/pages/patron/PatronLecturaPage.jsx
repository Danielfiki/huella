import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { analizarPatron } from '../../services/anthropic'
import { retryAsync, esErrorIAReintentable } from '../../utils/retryAsync'
import { useAuth } from '../../context/AuthContext'
import { canModify } from '../../utils/authorDisplay'
import CerrarPatronModal from '../../components/patron/CerrarPatronModal'
import PieCientifico from '../../components/patron/PieCientifico'
import PlanDelPatron from '../../components/patron/PlanDelPatron'
import UpgradeModal from '../../components/ui/UpgradeModal'
import LoadingDignificado from '../estrategias/components/LoadingDignificado'
import { usarPlanDesdePatron, PASOS_PLAN } from './usarPlanDesdePatron'
import { PASOS_ANALISIS } from './PatronPage'
import shared from './PatronPage.module.css'   // reusa header/bloques/cierre de Fase B
import styles from './PatronLecturaPage.module.css'
import TopeDiario, { esLimiteDiario } from '../../components/ui/TopeDiario'

// Header mocha idéntico al del formulario / salidas de Fase B.
function Header({ onBack }) {
  return (
    <header className={shared.header}>
      {onBack && (
        <button className={shared.headerBack} onClick={onBack} aria-label="Atrás" type="button">←</button>
      )}
      <h1 className={shared.headerTitulo}>Algo que aún no cambia</h1>
    </header>
  )
}

function Bloque({ variante, titulo, children }) {
  return (
    <div className={`${shared.bloque} ${shared['bloque_' + variante]}`}>
      <h3 className={shared.bloqueTitulo}>{titulo}</h3>
      <p className={shared.bloqueCuerpo}>{children}</p>
    </div>
  )
}

// Modo lectura de un patrón ya analizado. Repinta los tres bloques guardados en
// orientacion_ia. Si es 'derivar', conserva el cierre médico (es la única
// información que importa en ese caso). Deja cerrar el patrón, salvo que ya
// esté cerrado.
export default function PatronLecturaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dataLoaded, cerrarPatron, actualizarPatronIA } = useHuella()
  const { user } = useAuth()
  const [showCerrar, setShowCerrar] = useState(false)
  // Mismo hook que usa PatronPage al salir del análisis: los cuatro pasos del
  // armado del plan viven en un solo lugar.
  const { armarPlan, creando, pasoActual, error: planError, showUpgrade, cerrarUpgrade } = usarPlanDesdePatron()

  const patron = (state.patrones || []).find((p) => p.id === id)

  // Registro sin análisis (la IA falló al crearlo y el papá salió de la
  // pantalla): en vez de tres bloques vacíos va el mismo reintentar del flujo,
  // que genera el análisis sobre esta misma fila.
  const [analizando, setAnalizando] = useState(false)
  const [topeDiario, setTopeDiario] = useState(false)
  const [pasoAnalisis, setPasoAnalisis] = useState(0)
  useEffect(() => {
    if (!analizando) return undefined
    setPasoAnalisis(0)
    const t = setInterval(() => setPasoAnalisis((p) => Math.min(p + 1, PASOS_ANALISIS.length - 1)), 3500)
    return () => clearInterval(t)
  }, [analizando])

  async function reintentarAnalisis() {
    setAnalizando(true)
    setTopeDiario(false)
    try {
      const hijo = (state.hijos || []).find((h) => h.id === patron.hijo_id) || state.hijo
      const salida = await retryAsync(
        () => analizarPatron({
          descripcion:   patron.descripcion,
          desde_cuando:  patron.desde_cuando,
          frecuencia:    patron.frecuencia,
          interferencia: patron.interferencia,
          ya_intentado:  patron.ya_intentado,
          hijo,
        }),
        { esReintentable: esErrorIAReintentable }
      )
      await actualizarPatronIA(patron.id, salida.clasificacion, salida)
    } catch (err) {
      console.error('reintentar analisis de patron falló', err)
      setTopeDiario(esLimiteDiario(err))
    } finally {
      setAnalizando(false)
    }
  }

  // Guard: si no existe (deep-link a un id ajeno o inexistente), a Home.
  useEffect(() => {
    if (dataLoaded && !patron) navigate('/panel', { replace: true })
  }, [dataLoaded, patron, navigate])

  if (!patron) return null

  const o = patron.orientacion_ia || {}
  // El plan vinculado, si existe y si sigue estando. `estrategia_id` puede
  // apuntar a un plan borrado: la FK lo deja en NULL, pero entre que se borra y
  // que el estado global se refresca el id puede seguir acá. Si no se
  // encuentra, la pantalla vuelve a ofrecer armar uno, que es lo correcto.
  const plan = patron.estrategia_id
    ? (state.estrategias || []).find((e) => e.id === patron.estrategia_id) || null
    : null
  const esDerivar = patron.clasificacion === 'derivar'
  const cerrado = patron.estado === 'cerrado'
  // "Cerrar esto" solo para el autor (misma convención que editar/borrar en la
  // app). Si lo anotó la pareja, el botón no aparece — ni deshabilitado ni con
  // mensaje. El try/catch del cierre queda igual como red de seguridad.
  const esMio = canModify(patron.user_id, user?.id)

  async function handleCerrar(motivo) {
    try {
      await cerrarPatron(patron.id, motivo)
      navigate('/panel')
    } catch (e) {
      // Caso raro (solo el creador puede cerrar). No dejamos la promesa colgada.
      console.warn('cerrar patron falló', e)
      setShowCerrar(false)
    }
  }

  // Armando el plan: la pantalla entera pasa al loader, igual que en
  // PatronPage. Antes solo cambiaba el texto del botón, y armar un plan tarda
  // cerca de un minuto: un botón con otra etiqueta no alcanza para decir que
  // hay algo pasando.
  if (analizando) {
    return (
      <div className={shared.page}>
        <Header />
        <div className={shared.body}>
          <LoadingDignificado
            titulo="Estamos mirando esto."
            sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
            pasos={PASOS_ANALISIS}
            pasoActual={pasoAnalisis}
            hijoEdad={state.hijo?.edad}
          />
        </div>
      </div>
    )
  }

  if (creando) {
    return (
      <div className={shared.page}>
        <Header />
        <div className={shared.body}>
          <LoadingDignificado
            titulo="Estamos armando tu plan."
            sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
            pasos={PASOS_PLAN}
            pasoActual={pasoActual}
            hijoEdad={state.hijo?.edad}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={shared.page}>
      <Header onBack={() => navigate(-1)} />
      <div className={shared.body}>
        {!patron.orientacion_ia && topeDiario ? (
          <TopeDiario nombreHijo={state.hijo?.nombre} />
        ) : !patron.orientacion_ia ? (
          <div className={shared.reintentarBox}>
            <p className={shared.reintentarTexto}>No pudimos completar el análisis. Lo que escribiste quedó guardado — puedes reintentar.</p>
            <button className={shared.btnPrincipal} onClick={reintentarAnalisis} type="button">Reintentar</button>
          </div>
        ) : (<>
        <div className={shared.bloques}>
          <Bloque variante="pasando" titulo="Qué está pasando">{o.que_esta_pasando}</Bloque>
          <Bloque variante="ayuda"   titulo="Qué ayuda">{o.que_ayuda}</Bloque>
          <Bloque variante="empeora" titulo="Qué lo empeora">{o.que_lo_empeora}</Bloque>
        </div>

        {esDerivar && (
          <div className={shared.cierreDerivar}>
            <h3 className={shared.cierreTitulo}>Esto conviene verlo con alguien</h3>
            <p className={shared.cierreCuerpo}>
              Huella no diagnostica. Esto se sale de lo que yo puedo acompañar, y conversarlo con el pediatra es lo que más ayuda.
            </p>
          </div>
        )}

        {/* En 'derivar' el cierre médico de arriba ya dice que Huella no
            diagnostica: el descargo sobra y le resta peso. */}
        <PieCientifico marco={o.marco_aplicado} sinDescargo={esDerivar} />

        {/* El plan: la invitación si no hay ninguno, o dónde va el que hay.
            En 'derivar' NO se ofrece plan — el cierre médico de arriba dice
            que esto se ve con un profesional, y ofrecer un plan de la app
            justo debajo lo contradiría. */}
        {!esDerivar && (
          <PlanDelPatron
            plan={plan}
            creando={creando}
            error={planError}
            onCrear={() => armarPlan(patron)}
            onVer={() => navigate(`/estrategias/${plan.id}`)}
          />
        )}
        </>)}

        <div className={styles.footer}>
          {!cerrado && esMio && (
            <button type="button" className={shared.btnSecundario} onClick={() => setShowCerrar(true)}>
              Cerrar esto
            </button>
          )}
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={cerrarUpgrade}
          tituloCustom="Un plan para trabajar lo que importa"
          mensajeCustom="Con Huella Pro creas planes de 4 semanas con tareas concretas para acompañar a tu hijo en esto."
        />
      )}

      {showCerrar && (
        <CerrarPatronModal
          onClose={() => setShowCerrar(false)}
          onConfirm={handleCerrar}
        />
      )}
    </div>
  )
}
