import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { analizarPatron } from '../../services/anthropic'
import { retryAsync, esErrorIAReintentable } from '../../utils/retryAsync'
import VoiceTextarea from '../../components/ui/VoiceTextarea'
import LoadingDignificado from '../estrategias/components/LoadingDignificado'
import UpgradeModal from '../../components/ui/UpgradeModal'
import PieCientifico from '../../components/patron/PieCientifico'
import { usarPlanDesdePatron } from './usarPlanDesdePatron'
import styles from './PatronPage.module.css'

// Opciones de selección única. El value es el que va a la BD; el label es copy.
// REGLA DURA DE UI: las tres opciones de "¿Desde cuándo?" se ven EXACTAMENTE
// iguales — sin icono, sin color, sin destacar la tercera. Si se destaca, el
// papá aprende a no marcarla, y esa opción ('regresion') es la que protege al
// niño (fuerza 'derivar').
const OPCIONES_DESDE = [
  { value: 'siempre',   label: 'Siempre ha sido así, nunca lo dejó' },
  { value: 'reciente',  label: 'Empezó hace poco' },
  { value: 'regresion', label: 'Ya lo había dejado y volvió' },
]
const OPCIONES_FREC = [
  { value: 'diario',    label: 'Todos los días' },
  { value: 'semanal',   label: 'Varias veces por semana' },
  { value: 'ocasional', label: 'De vez en cuando' },
]
const OPCIONES_INTERF = [
  { value: 'alta', label: 'Nos complica la rutina' },
  { value: 'baja', label: 'Molesta pero convivimos' },
]

const PASOS_ANALISIS = [
  'Leyendo lo que registraste',
  'Considerando la edad',
  'Buscando bibliografía pediátrica',
  'Escribiendo lo que encontramos',
]
const PASOS_PLAN = [
  'Leyendo lo que registraste',
  'Buscando bibliografía pediátrica',
  'Adaptando a la edad de tu hijo',
  'Escribiendo tu plan personalizado',
]

// Header mocha idéntico en todas las fases (form, loaders y las tres salidas).
function Header({ onBack }) {
  return (
    <header className={styles.header}>
      {onBack && (
        <button className={styles.headerBack} onClick={onBack} aria-label="Atrás" type="button">←</button>
      )}
      <h1 className={styles.headerTitulo}>Algo que aún no cambia</h1>
    </header>
  )
}

// Bloque de salida. El filo lo pone el CSS por variante; el título NO toma el
// color del filo (queda en --color-text).
function Bloque({ variante, titulo, children }) {
  return (
    <div className={`${styles.bloque} ${styles['bloque_' + variante]}`}>
      <h3 className={styles.bloqueTitulo}>{titulo}</h3>
      <p className={styles.bloqueCuerpo}>{children}</p>
    </div>
  )
}

export default function PatronPage() {
  const navigate = useNavigate()
  const {
    state, dataLoaded,
    crearPatron, actualizarPatronIA,
  } = useHuella()
  const hijo = state.hijo
  const nombre = hijo?.nombre || 'tu hijo/a'

  // form | generando | resultado | error | plan
  const [fase, setFase] = useState('form')

  const [descripcion, setDescripcion]     = useState('')
  const [desde, setDesde]                 = useState('')
  const [frecuencia, setFrecuencia]       = useState('')
  const [interferencia, setInterferencia] = useState('')
  const [yaIntentado, setYaIntentado]     = useState('')

  const [patronRow, setPatronRow] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [error, setError]         = useState('')
  const [pasoActual, setPasoActual] = useState(0)

  // El armado del plan vive en un hook compartido con PatronLecturaPage: son
  // los mismos cuatro pasos en el mismo orden, y duplicarlos era la forma
  // segura de que un dia se desincronizaran.
  const {
    armarPlan,
    error: planError,
    showUpgrade,
    cerrarUpgrade,
  } = usarPlanDesdePatron()

  // Guard: sin hijo activo no hay contexto para el patrón.
  useEffect(() => {
    if (dataLoaded && !hijo) navigate('/panel', { replace: true })
  }, [dataLoaded, hijo, navigate])

  // Guard del tope de 3 ante deep-link directo a /patron (el selector de /nuevo
  // ya lo bloquea, pero la URL se puede escribir a mano). Solo redirige en el
  // formulario, nunca mid-flujo.
  useEffect(() => {
    if (!dataLoaded || fase !== 'form') return
    const abiertos = (state.patrones || []).filter(
      (p) => p.estado === 'abierto' && p.hijo_id === state.hijoActivoId
    ).length
    if (abiertos >= 3) navigate('/nuevo', { replace: true })
    // Solo al montar: mid-flujo el propio patrón recién creado no debe expulsar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded])

  // Avance suave de los pasos del loader mientras corre la IA.
  useEffect(() => {
    if (fase !== 'generando' && fase !== 'plan') return
    const pasos = fase === 'plan' ? PASOS_PLAN : PASOS_ANALISIS
    setPasoActual(0)
    const id = setInterval(() => setPasoActual((p) => Math.min(p + 1, pasos.length - 1)), 3500)
    return () => clearInterval(id)
  }, [fase])

  const formCompleto = descripcion.trim() && desde && frecuencia && interferencia

  const respuestas = () => ({
    descripcion:   descripcion.trim(),
    desde_cuando:  desde,
    frecuencia,
    interferencia,
    ya_intentado:  yaIntentado.trim() || null,
  })

  // Orden de guardado: 1) INSERT fila abierta, 2) IA, 3) UPDATE misma fila,
  // 4) mostrar. Nunca al revés. Si la IA falla, la fila ya está guardada y se
  // muestra un estado de reintentar (no se pierde lo escrito).
  async function handleAnalizar() {
    setFase('generando')
    setError('')
    try {
      const r = respuestas()
      // 1. INSERT — en reintento reusamos la fila ya creada, no duplicamos.
      let row = patronRow
      if (!row) {
        row = await crearPatron(r)
        setPatronRow(row)
      }
      // 2. IA (retry silencioso solo para errores transitorios de red).
      const salida = await retryAsync(
        () => analizarPatron({ ...r, hijo }),
        { esReintentable: esErrorIAReintentable }
      )
      // 3. UPDATE de la misma fila con clasificación + orientación.
      await actualizarPatronIA(row.id, salida.clasificacion, salida)
      // 4. Mostrar.
      setResultado(salida)
      setFase('resultado')
    } catch (err) {
      console.error('analizar patron falló', err)
      setError('No pudimos completar el análisis. Lo que escribiste quedó guardado — puedes reintentar.')
      setFase('error')
    }
  }

  // El plan es Pro → el UpgradeModal aparece solo, sin candado visual en el
  // botón. La fila del patrón ya existe acá, así que se le pasa entera: de ahí
  // salen las 5 respuestas que arman el contexto del plan.
  async function handleArmarPlan() {
    const ok = await armarPlan(patronRow ?? respuestas(), { onAntes: () => setFase('plan') })
    if (ok === false) setFase('resultado')
  }

  // ── Loaders ────────────────────────────────────────────────────────────
  if (fase === 'generando' || fase === 'plan') {
    const esPlan = fase === 'plan'
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.body}>
          <LoadingDignificado
            titulo={esPlan ? 'Estamos armando tu plan.' : 'Estamos mirando esto.'}
            sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
            pasos={esPlan ? PASOS_PLAN : PASOS_ANALISIS}
            pasoActual={pasoActual}
            hijoEdad={hijo?.edad}
          />
        </div>
      </div>
    )
  }

  // ── Reintentar (falló la IA del análisis; la fila ya está guardada) ──────
  if (fase === 'error') {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate('/panel')} />
        <div className={styles.body}>
          <div className={styles.reintentarBox}>
            <p className={styles.reintentarTexto}>{error}</p>
            <button className={styles.btnPrincipal} onClick={handleAnalizar} type="button">Reintentar</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Salidas (las tres clasificaciones) ───────────────────────────────────
  if (fase === 'resultado' && resultado) {
    const clas = resultado.clasificacion
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate('/panel')} />
        <div className={styles.body}>
          <div className={styles.bloques}>
            <Bloque variante="pasando" titulo="Qué está pasando">{resultado.que_esta_pasando}</Bloque>
            <Bloque variante="ayuda"   titulo="Qué ayuda">{resultado.que_ayuda}</Bloque>
            <Bloque variante="empeora" titulo="Qué lo empeora">{resultado.que_lo_empeora}</Bloque>
          </div>

          {clas === 'derivar' && (
            <div className={styles.cierreDerivar}>
              <h3 className={styles.cierreTitulo}>Esto conviene verlo con alguien</h3>
              <p className={styles.cierreCuerpo}>
                Huella no diagnostica. Esto se sale de lo que yo puedo acompañar, y conversarlo con el pediatra es lo que más ayuda.
              </p>
            </div>
          )}

          {/* Cierra la orientación (bloques + derivar) y va ANTES de los botones,
              igual que en el modo lectura. En 'derivar' el cierre médico de
              arriba ya dice que Huella no diagnostica: el descargo sobra y le
              resta peso. */}
          <PieCientifico marco={resultado.marco_aplicado} sinDescargo={clas === 'derivar'} />

          {clas === 'esperable' && (
            <div className={styles.pie}>
              <p className={styles.pieTexto}>Si quieres acompañar a {nombre} en esto, puedo armarte un plan.</p>
              {planError && <p className={styles.pieError}>{planError}</p>}
              <button className={styles.btnSecundario} onClick={handleArmarPlan} type="button">Armar un plan</button>
              <button className={styles.linkAhoraNo} onClick={() => navigate('/panel')} type="button">Ahora no</button>
            </div>
          )}

          {clas === 'instalado' && (
            <div className={styles.pie}>
              <p className={styles.pieTexto}>Esto se puede trabajar.</p>
              {planError && <p className={styles.pieError}>{planError}</p>}
              <button className={styles.btnPrincipal} onClick={handleArmarPlan} type="button">Empecemos con un plan</button>
              <button className={styles.linkAhoraNo} onClick={() => navigate('/panel')} type="button">Ahora no</button>
            </div>
          )}

          {clas === 'derivar' && (
            <div className={styles.pie}>
              <button className={styles.btnSecundario} onClick={() => navigate('/panel')} type="button">Entendido</button>
            </div>
          )}
        </div>

        {showUpgrade && (
          <UpgradeModal
            onClose={cerrarUpgrade}
            tituloCustom="Un plan para trabajar lo que importa"
            mensajeCustom="Con Huella Pro creas planes de 4 semanas con tareas concretas para acompañar a tu hijo en esto."
          />
        )}
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <Header onBack={() => navigate('/nuevo')} />
      <div className={styles.body}>
        {/* 1 — relato libre (voz) */}
        <div className={styles.pregunta}>
          <p className={styles.label}>¿Qué pasa?</p>
          <VoiceTextarea
            value={descripcion}
            onChange={setDescripcion}
            onVoiceResult={setDescripcion}
            placeholder="No deja el chupete y ya tiene 4 años"
          />
        </div>

        {/* 2 — desde cuándo */}
        <div className={styles.pregunta}>
          <p className={styles.label}>¿Desde cuándo?</p>
          <div className={styles.opciones}>
            {OPCIONES_DESDE.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.opcion} ${desde === o.value ? styles.opcionSel : ''}`}
                onClick={() => setDesde(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 — frecuencia */}
        <div className={styles.pregunta}>
          <p className={styles.label}>¿Qué tan seguido?</p>
          <div className={styles.opciones}>
            {OPCIONES_FREC.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.opcion} ${frecuencia === o.value ? styles.opcionSel : ''}`}
                onClick={() => setFrecuencia(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 — interferencia */}
        <div className={styles.pregunta}>
          <p className={styles.label}>¿Cuánto les complica?</p>
          <div className={styles.opciones}>
            {OPCIONES_INTERF.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.opcion} ${interferencia === o.value ? styles.opcionSel : ''}`}
                onClick={() => setInterferencia(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5 — qué ya intentaste (opcional, con voz) */}
        <div className={styles.pregunta}>
          <div className={styles.labelRow}>
            <p className={styles.label}>¿Qué ya intentaste?</p>
            <span className={styles.chipOpcional}>OPCIONAL</span>
          </div>
          <VoiceTextarea
            value={yaIntentado}
            onChange={setYaIntentado}
            onVoiceResult={setYaIntentado}
            placeholder="Le escondimos el chupete una semana y lloró todas las noches"
          />
        </div>

        <button className={styles.cta} onClick={handleAnalizar} disabled={!formCompleto} type="button">
          Entender qué pasa
        </button>
      </div>
    </div>
  )
}
