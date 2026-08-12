import React, { useState, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronDown } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import UpgradeModal from '../../components/ui/UpgradeModal'
import { analizarEpisodio, generarAccionInmediata, extraerEpisodio } from '../../services/anthropic'
import { TAXONOMIA_EMOCIONES } from '../../constants/taxonomiaEmociones'
import { TIPOS, INTENSIDADES, CUANDO_OPCIONES } from '../../constants/catalogoEpisodio'
import RegistroConversacional from '../../components/registro/RegistroConversacional'
import AlivioHuella from '../../components/registro/AlivioHuella'
import PreparandoMas from '../../components/registro/PreparandoMas'
import Escarabajo from '../../components/ui/Escarabajo'
import { MAX_EPISODIOS_FREE } from '../estrategias/helpers'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import AccionRapida from '../../components/historial/AccionRapida'
import { renderMarkdown } from '../../utils/renderMarkdown'
import { separarAlivio } from '../../utils/seccionesIA'
import styles from './RegistroPage.module.css'
import VoiceTextarea from '../../components/ui/VoiceTextarea'


function EmocionSelector({ emocion, setEmocion }) {
  const [categoriaAbierta, setCategoriaAbierta] = useState(null)

  const categoriaSeleccionada = emocion
    ? TAXONOMIA_EMOCIONES.find((c) => c.especificas.includes(emocion))
    : null

  function handleCategoria(cat) {
    setCategoriaAbierta((prev) => prev === cat.id ? null : cat.id)
  }

  function handleEspecifica(cat, esp) {
    setEmocion(esp)
    setCategoriaAbierta(null)
  }

  function limpiar() {
    setEmocion('')
    setCategoriaAbierta(null)
  }

  if (emocion && categoriaSeleccionada) {
    return (
      <div
        className={styles.emocionSeleccionada}
        style={{ borderColor: categoriaSeleccionada.color, background: categoriaSeleccionada.colorBg }}
      >
        <span className={styles.emocionSeleccionadaEmoji}>{categoriaSeleccionada.emoji}</span>
        <span className={styles.emocionSeleccionadaTexto}>
          <span style={{ color: categoriaSeleccionada.color, fontWeight: 700 }}>{categoriaSeleccionada.label}</span>
          <span className={styles.emocionSeleccionadaArrow}>›</span>
          <span>{emocion}</span>
        </span>
        <button className={styles.emocionLimpiarBtn} onClick={limpiar} aria-label="Limpiar emoción">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className={styles.emocionSelector}>
      <div className={styles.emocionCategorias}>
        {TAXONOMIA_EMOCIONES.map((cat) => (
          <button
            key={cat.id}
            className={[
              styles.emocionCatBtn,
              categoriaAbierta === cat.id ? styles.emocionCatBtnAbierta : '',
            ].join(' ')}
            style={categoriaAbierta === cat.id
              ? { borderColor: cat.color, background: cat.colorBg, color: cat.color }
              : {}}
            onClick={() => handleCategoria(cat)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {categoriaAbierta && (() => {
        const cat = TAXONOMIA_EMOCIONES.find((c) => c.id === categoriaAbierta)
        return (
          <div className={styles.emocionEspecificas}>
            {cat.especificas.map((esp) => (
              <button
                key={esp}
                className={styles.emocionEspBtn}
                style={{ borderColor: cat.color, color: cat.color }}
                onClick={() => handleEspecifica(cat, esp)}
              >
                {esp}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}



const ESTADOS_PADRE = ['Calmado', 'Frustrado', 'Cansado', 'Ansioso', 'Triste', 'Abrumado', 'No lo vi yo']

const GATILLANTES = [
  'Hambre', 'Cansancio', 'Cambio de rutina',
  'Pelea con amigos', 'Pantallas', 'Transiciones',
  'Enfermedad', 'Tensión en casa', 'Sobreestimulación',
  'Dolor o malestar físico',
]

const TIPO_A_HABILIDAD = {
  rabieta:     'Calmarse cuando explota',
  agresividad: 'Calmarse cuando explota',
  desconexion: 'Calmarse cuando explota',
  oposicion:   'Aceptar el "no" sin crisis',
  miedo:       'Manejar el miedo y la angustia',
  llanto:      'Manejar el miedo y la angustia',
  sueño:       'Concentrarse y calmarse',
  social:      'Relacionarse mejor con otros niños',
}


function detectarBloqueRutina(fechaEpisodio, rutinas) {
  if (!rutinas || rutinas.length === 0) return null
  const d = new Date(fechaEpisodio)
  const minEpisodio = d.getHours() * 60 + d.getMinutes()
  let bloque = null
  for (const b of [...rutinas].sort((a, r) => a.hora.localeCompare(r.hora))) {
    const [h, m] = b.hora.split(':').map(Number)
    if (h * 60 + m <= minEpisodio) bloque = b
  }
  return bloque
}

function computarFecha(cuandoPaso, fechaCustom) {
  const d = new Date()
  switch (cuandoPaso) {
    case 'hora_antes': d.setHours(d.getHours() - 1); return d.toISOString()
    case 'manana':     d.setHours(9, 0, 0, 0);       return d.toISOString()
    case 'tarde':      d.setHours(15, 0, 0, 0);      return d.toISOString()
    // 'ayer' debe garantizar que bucketTiempo() lo clasifique como 'pasado' (>24h).
    // Restamos 1 día Y 1 hora al momento actual → siempre 25h atrás como mínimo.
    // Antes mapeaba a "día anterior 18:00", que para registros hechos en la
    // tarde caía en bucket 'dia' (≤24h) y la voz salía como "Hoy, con calma…"
    // en vez de "La próxima vez…".
    case 'ayer':       d.setDate(d.getDate() - 1); d.setHours(d.getHours() - 1); return d.toISOString()
    case 'custom':     return fechaCustom ? new Date(fechaCustom).toISOString() : d.toISOString()
    default:           return d.toISOString()
  }
}

function nowLocal() {
  const d = new Date(); d.setSeconds(0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const CAL_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const CAL_DIAS  = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']

function parseFechaStr(str) {
  if (!str) {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth(), day: n.getDate(), hour: n.getHours(), minute: n.getMinutes() }
  }
  const [d, t] = str.split('T')
  const [year, month, day] = d.split('-').map(Number)
  const [hour, minute] = t.split(':').map(Number)
  return { year, month: month - 1, day, hour, minute }
}

function TimeSpinner({ value, onUp, onDown }) {
  return (
    <div className={styles.timeSpinner}>
      <button type="button" className={styles.timeBtn} onClick={onUp}>▲</button>
      <span className={styles.timeVal}>{String(value).padStart(2, '0')}</span>
      <button type="button" className={styles.timeBtn} onClick={onDown}>▼</button>
    </div>
  )
}

function FechaHoraPicker({ value, onChange, max }) {
  const sel  = parseFechaStr(value)
  const maxP = max ? parseFechaStr(max) : null

  const [viewYear,  setViewYear]  = useState(sel.year)
  const [viewMonth, setViewMonth] = useState(sel.month)

  function emit(y, mo, d, h, min) {
    const p = n => String(n).padStart(2, '0')
    onChange(`${y}-${p(mo + 1)}-${p(d)}T${p(h)}:${p(min)}`)
  }

  const today   = new Date()
  const minNav  = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  const canPrev = viewYear > minNav.getFullYear() || (viewYear === minNav.getFullYear() && viewMonth > minNav.getMonth())
  const canNext = !maxP || viewYear < maxP.year   || (viewYear === maxP.year && viewMonth < maxP.month)

  function prevMonth() {
    if (!canPrev) return
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (!canNext) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function isDayDisabled(d) {
    if (!maxP) return false
    if (viewYear > maxP.year) return true
    if (viewYear === maxP.year && viewMonth > maxP.month) return true
    if (viewYear === maxP.year && viewMonth === maxP.month && d > maxP.day) return true
    return false
  }

  const offset   = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const daysInMo = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells    = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]

  return (
    <div className={styles.fechaHoraPicker}>
      <div className={styles.calNav}>
        <button type="button" className={styles.calNavBtn} onClick={prevMonth} disabled={!canPrev}>‹</button>
        <span className={styles.calMesLabel}>{CAL_MESES[viewMonth]} {viewYear}</span>
        <button type="button" className={styles.calNavBtn} onClick={nextMonth} disabled={!canNext}>›</button>
      </div>

      <div className={styles.calGrid}>
        {CAL_DIAS.map(d => <span key={d} className={styles.calDia}>{d}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`g${i}`} />
          const disabled = isDayDisabled(d)
          const selected = sel.year === viewYear && sel.month === viewMonth && sel.day === d
          const isHoy    = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              className={[
                styles.calDiaBtn,
                selected           ? styles.calDiaBtnSelected : '',
                isHoy && !selected ? styles.calDiaBtnHoy      : '',
                disabled           ? styles.calDiaBtnDisabled  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => emit(viewYear, viewMonth, d, sel.hour, sel.minute)}
            >
              {d}
            </button>
          )
        })}
      </div>

      <div className={styles.timePicker}>
        <TimeSpinner
          value={sel.hour}
          onUp={()  => emit(sel.year, sel.month, sel.day, (sel.hour + 1)  % 24, sel.minute)}
          onDown={() => emit(sel.year, sel.month, sel.day, (sel.hour + 23) % 24, sel.minute)}
        />
        <span className={styles.timeSep}>:</span>
        <TimeSpinner
          value={sel.minute}
          onUp={()  => emit(sel.year, sel.month, sel.day, sel.hour, (sel.minute + 5)  % 60)}
          onDown={() => emit(sel.year, sel.month, sel.day, sel.hour, (sel.minute + 55) % 60)}
        />
      </div>
    </div>
  )
}

function TipoSelector({ tipo, setTipo, tipoOtroTexto, setTipoOtroTexto, bigEmoji = false }) {
  return (
    <div className={styles.tipoSelectorWrap}>
      <div className={bigEmoji ? styles.tiposGridBig : styles.tiposGrid}>
        {TIPOS.map((t) => (
          <button
            key={t.id}
            className={[
              bigEmoji ? styles.tipoBtnBig : styles.tipoBtn,
              tipo === t.id ? (bigEmoji ? styles.tipoBtnBigSelected : styles.tipoSelected) : '',
            ].join(' ')}
            onClick={() => setTipo(t.id)}
          >
            <span className={bigEmoji ? styles.tipoEmojiBig : styles.tipoEmoji}>{t.emoji}</span>
            <span className={styles.tipoLabel}>{t.label}</span>
          </button>
        ))}
      </div>
      {tipo === 'otro' && (
        <textarea
          className={styles.tipoOtroInput}
          placeholder="¿Cómo describirías lo que pasó?"
          value={tipoOtroTexto}
          onChange={(e) => setTipoOtroTexto(e.target.value)}
          rows={2}
        />
      )}
    </div>
  )
}

export default function RegistroPage() {
  const { state, addEpisodio, updateEpisodio, actualizarUltimoAutorIa, isPro } = useHuella()
  const navigate = useNavigate()

  const [vista, setVista] = useState('conversacional')
  // La orientación larga arranca plegada: lo que el padre necesita al terminar
  // es el alivio y un paso, no un informe. El resto está si lo quiere.
  const [orientacionAbierta, setOrientacionAbierta] = useState(false)

  // shared fields
  const [tipo, setTipo] = useState('')
  const [intensidad, setIntensidad] = useState(null)
  const [tipoOtroTexto, setTipoOtroTexto] = useState('')
  const [descripcionLibre, setDescripcionLibre] = useState('')

  // detailed-only fields
  const [emocionSeleccionada, setEmocionSeleccionada] = useState('')
  // null hasta que el padre elija un chip. El botón Guardar queda
  // deshabilitado mientras esto sea falsy en ambos modos (rápido y
  // detallado). Esto fixea el bug de la Acción Rápida hablando en
  // presente para episodios que el padre nunca marcó como "ahora".
  const [cuandoPaso, setCuandoPaso] = useState(null)
  const [fechaCustom, setFechaCustom] = useState('')
  const [contexto, setContexto] = useState('')
  const [gatillantesSeleccionados, setGatillantesSeleccionados] = useState([])
  const [estadoPadrePicker, setEstadoPadrePicker] = useState('')
  const [estadoPadreExtra, setEstadoPadreExtra] = useState('')
  const [quienEstuvo, setQuienEstuvo] = useState('')

  // post-save
  const [respuestaIA, setRespuestaIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [errorOrientacion, setErrorOrientacion] = useState(false)
  const [accionIA, setAccionIA] = useState('')
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const [episodioId, setEpisodioId] = useState(null)
  const [reflexion, setReflexion] = useState('')
  const [guardandoReflexion, setGuardandoReflexion] = useState(false)
  const [reflexionGuardada, setReflexionGuardada] = useState(false)
  // Guardamos los args de la última llamada IA para poder reintentar sin
  // depender de los inputs del form (que el papá podría haber cambiado).
  const reintentoRef = useRef(null)

  const pageRef = useRef(null)
  const isFirstVistaRender = useRef(true)
  useLayoutEffect(() => {
    if (isFirstVistaRender.current) { isFirstVistaRender.current = false; return }
    const el = pageRef.current
    if (!el) return
    el.classList.remove(styles.vistaEntra)
    void el.offsetWidth
    el.classList.add(styles.vistaEntra)
  }, [vista])

  // Sin cupo en el plan free. Antes lo atajaba la pantalla selectora, que ya no
  // existe: ahora se entra directo a la conversación, así que el tope se
  // verifica acá mismo antes de dejar contar nada.
  const sinCupo = state.episodios.length >= MAX_EPISODIOS_FREE && !isPro()

  function handleCuando(id) {
    setCuandoPaso(id)
    if (id === 'custom' && !fechaCustom) setFechaCustom(nowLocal())
  }

  function toggleGatillante(g) {
    setGatillantesSeleccionados((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  // ── Puentes del registro conversacional ──
  // El componente maneja su propio estado; acá se vuelca a los estados de la
  // página para reusar handleGuardar tal cual, sin duplicar la lógica de
  // guardado ni el disparo de la orientación.
  function volcarConversacional(d) {
    setDescripcionLibre(d.transcripcion || '')
    setTipo(d.tipo || '')
    setEmocionSeleccionada(d.emocion || '')
    setContexto(d.contexto || '')
    // Sin "cuándo" declarado, el episodio queda con la hora actual: es lo
    // que ya hace computarFecha con un valor vacío, y evita bloquear el
    // guardado por un campo que el relato no mencionó.
    setCuandoPaso(d.cuandoPaso || 'ahora')
    setIntensidad(d.intensidad || null)
  }

  async function handleConfirmarConversacional(d) {
    volcarConversacional(d)
    await handleGuardar('conversacional', d)
  }

  // "Editar todo": lleva lo extraído al formulario completo, ya prellenado.
  function handleEditarTodo(d) {
    volcarConversacional(d)
    setVista('detallado')
  }

  // `datos` llega solo desde el flujo conversacional: los setState de
  // volcarConversacional no se ven todavía en este render, así que los
  // valores se leen del objeto en vez del estado.
  async function handleGuardar(modo, datos = null) {
    const esConv     = modo === 'conversacional'
    const tipoFinal  = esConv ? (datos?.tipo || 'otro')      : tipo
    const intenFinal = esConv ? datos?.intensidad            : intensidad
    if (!tipoFinal || !intenFinal) return

    const estadoPadre = modo === 'detallado'
      ? estadoPadrePicker === 'No lo vi yo'
        ? quienEstuvo.trim() ? `No lo vi yo — ${quienEstuvo.trim()}` : 'No lo vi yo'
        : estadoPadrePicker
          ? estadoPadreExtra ? `${estadoPadrePicker}. ${estadoPadreExtra}` : estadoPadrePicker
          : estadoPadreExtra
      : ''

    const episodio = {
      id: Date.now().toString(),
      tipo: tipoFinal,
      intensidad: intenFinal,
      contexto:    esConv ? (datos?.contexto || '') : contexto,
      gatillantes: modo === 'detallado' ? gatillantesSeleccionados : [],
      estadoPadre,
      // computarFecha se usa en los tres modos: en detallado mapea el chip
      // a un timestamp histórico, en rápido también (ahora el modo rápido
      // tiene la misma pregunta "¿Cuándo pasó?" — D2 del fix del Bug 1).
      fecha: computarFecha(esConv ? (datos?.cuandoPaso || 'ahora') : cuandoPaso, fechaCustom),
      // El conversacional sí guarda emoción: la extrae del relato y el padre
      // la valida, así que llega con la misma confianza que en el detallado.
      emocion: (modo === 'detallado' || esConv)
        ? (esConv ? (datos?.emocion || null) : (emocionSeleccionada || null))
        : null,
      // La transcripción completa es el relato del padre y va siempre, aunque
      // la extracción haya fallado. Es lo único que no se puede perder.
      descripcionLibre: esConv
        ? (datos?.transcripcion?.trim() || null)
        : tipo === 'otro' && tipoOtroTexto.trim()
          ? tipoOtroTexto.trim() + (descripcionLibre.trim() ? '. ' + descripcionLibre.trim() : '')
          : descripcionLibre.trim() || null,
    }

    const bloqueRutina = detectarBloqueRutina(episodio.fecha, state.rutinas)

    setLoadingGuardar(true)
    setErrorGuardar('')
    try {
      const episodioGuardado = await addEpisodio(episodio)
      setVista('guardado')
      setEpisodioId(episodioGuardado?.id ?? null)
      // Acción Rápida v1.2 — se dispara en paralelo a la orientación larga.
      // Resultado es objeto estructurado { texto, autor, dimension, bucket,
      // generada_en } que persistimos en columnas accion_rapida_* del
      // episodio recién creado, y además actualiza hijos.ultimo_autor_ia
      // para anti-repetición en el próximo episodio del mismo hijo.
      setLoadingAccion(true)
      setAccionIA(null)
      generarAccionInmediata({
        hijo:             state.hijo,
        episodio,
        ultimoAutorUsado: state.hijo?.ultimoAutorIa ?? null,
        ahora:            new Date(),
      })
        .then(async (resultado) => {
          setAccionIA(resultado)
          setLoadingAccion(false)
          if (episodioGuardado?.id) {
            try {
              await updateEpisodio({ id: episodioGuardado.id, accionRapida: resultado })
              if (state.hijo?.id && resultado?.autor) {
                await actualizarUltimoAutorIa(state.hijo.id, resultado.autor)
              }
            } catch (persistErr) {
              console.error('[RegistroPage] falló persistir Acción Rápida:', persistErr)
            }
          }
        })
        .catch(() => { setLoadingAccion(false) })
      // Orientación completa: lanzada via wrapper para que Reintentar
      // pueda reutilizar los mismos args.
      const historial = state.episodios.filter((e) => e.id !== episodio.id)
      reintentoRef.current = { episodio, historial, bloqueRutina, episodioId: episodioGuardado?.id }
      await solicitarOrientacion()
    } catch (e) {
      setErrorGuardar('No se pudo guardar: ' + e.message)
    } finally {
      setLoadingGuardar(false)
    }
  }

  async function solicitarOrientacion() {
    const args = reintentoRef.current
    if (!args) return
    setLoadingIA(true)
    setErrorOrientacion(false)
    setRespuestaIA('')
    try {
      const texto = await analizarEpisodio({
        hijo: state.hijo,
        episodio: args.episodio,
        historialReciente: args.historial,
        bloqueRutina: args.bloqueRutina,
        // Va llegando por pedazos: el alivio se empieza a leer a los pocos
        // segundos en vez de esperar a que se genere el texto entero.
        onTexto: setRespuestaIA,
      })

      // Un stream cortado devuelve lo que alcanzó a llegar. Si trae algo, se
      // queda: media orientación se lee, y borrarla para mostrar un error sería
      // quitarle al padre algo que ya estaba leyendo. Solo si no llegó nada se
      // cae al camino de error.
      if (!texto.trim()) {
        setErrorOrientacion(true)
        return
      }

      setRespuestaIA(texto)
      if (args.episodioId) {
        // Solo persistimos cuando la orientación fue exitosa — nunca
        // se guarda un mensaje de error como si fuera la orientación.
        updateEpisodio({ id: args.episodioId, orientacionIA: texto })
      }
    } catch {
      // El mensaje específico va a consola via console.error de
      // anthropic.js; al usuario le mostramos un estado uniforme.
      setRespuestaIA('')
      setErrorOrientacion(true)
    } finally {
      setLoadingIA(false)
    }
  }

  async function handleGuardarReflexion() {
    if (!episodioId || !reflexion.trim()) return
    setGuardandoReflexion(true)
    try {
      await updateEpisodio({ id: episodioId, reflexion: reflexion.trim() })
      setReflexionGuardada(true)
    } catch {
      // reflexion is non-critical, fail silently
    } finally {
      setGuardandoReflexion(false)
    }
  }

  // ── VISTA: GUARDADO ───────────────────────────────────────────────────────
  if (vista === 'guardado') {
    const habilidadSugerida = TIPO_A_HABILIDAD[tipo] || ''
    // El alivio va aparte del resto de la orientación: abre la pantalla como
    // burbuja y lo demás queda plegado.
    const { alivio, resto } = separarAlivio(respuestaIA)
    // La acción rápida espera aunque ya haya llegado: pintarla sobre el alivio
    // pondría el consejo antes del acompañamiento, que es exactamente el orden
    // que esta pantalla vino a corregir. Si la orientación falla, se muestra
    // igual — ahí vale más algo que nada.
    const mostrarAccion = (!loadingIA || errorOrientacion) && (loadingAccion || accionIA)

    return (
      <div ref={pageRef} className={styles.flujoRefugio}>
        <div className={styles.guardadoContainer}>
          {errorOrientacion ? (
            <Card className={styles.errorOrientacionCard}>
              <p className={styles.errorOrientacionIcon}>📡</p>
              <h4 className={styles.errorOrientacionTitulo}>
                No pudimos obtener tu orientación esta vez.
              </h4>
              <p className={styles.errorOrientacionTexto}>
                Tu episodio quedó guardado. Hubo un problema temporal con el servicio de Huella.
                Puedes intentar de nuevo en un momento.
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={solicitarOrientacion}
                loading={loadingIA}
              >
                Reintentar
              </Button>
            </Card>
          ) : (
            // Los puntitos solo hasta que empieza a llegar texto; de ahí en
            // adelante el alivio se va escribiendo solo en la burbuja.
            <AlivioHuella texto={alivio} cargando={loadingIA && !alivio} />
          )}

          {/* El alivio ya se puede leer pero abajo todavía no hay nada, y esa
              pausa muda se lee como el final. Va acá, al pie de lo visible y
              justo donde van a aparecer la acción y la orientación. */}
          {loadingIA && alivio && !errorOrientacion && <PreparandoMas />}

          {mostrarAccion && (
            loadingAccion ? (
              <div className={styles.accionCard}>
                <div className={styles.accionHeader}>
                  <span className={styles.accionEmoji}>⚡</span>
                  <span className={styles.accionLabel}>Para la próxima</span>
                </div>
                <div className={styles.accionSkeleton}>
                  <div className={styles.accionSkLine} style={{ width: '90%' }} />
                  <div className={styles.accionSkLine} style={{ width: '75%' }} />
                </div>
              </div>
            ) : (
              <AccionRapida data={accionIA} label="Para la próxima" tono="verde" />
            )
          )}

          {/* El plegable espera a que el stream termine. Mientras el texto
              fluye, `resto` va cambiando de tamaño y aparecer ahí haría saltar
              el layout justo debajo de lo que el padre está leyendo. */}
          {resto && !loadingIA && !errorOrientacion && (
            <div className={styles.orientacionPlegable}>
              <button
                className={styles.orientacionToggle}
                onClick={() => setOrientacionAbierta((v) => !v)}
                aria-expanded={orientacionAbierta}
                type="button"
              >
                <span className={styles.orientacionIcono} aria-hidden="true">
                  <Escarabajo className={styles.orientacionEscarabajo} reforzado />
                </span>
                <span className={styles.orientacionTextos}>
                  <span className={styles.orientacionTitulo}>Orientación completa</span>
                  <span className={styles.orientacionSub}>Qué está pasando · qué hacer · qué evitar</span>
                </span>
                <ChevronDown
                  size={18}
                  className={`${styles.orientacionChevron} ${orientacionAbierta ? styles.orientacionChevronAbierto : ''}`}
                />
              </button>
              {orientacionAbierta && (
                <RespuestaIA texto={resto} categoria="regulacion" />
              )}
            </div>
          )}

          <p className={styles.registroMantram}>Cada registro es una conversación contigo mismo sobre cómo quieres criar.</p>

          <div className={styles.reflexionSection}>
            <p className={styles.reflexionLabel}>
              ¿Cómo te sentiste tú? ¿Qué harías diferente?
              <span className={styles.reflexionOpcional}> — opcional</span>
            </p>
            <VoiceTextarea
              value={reflexion}
              onChange={(v) => { setReflexion(v); setReflexionGuardada(false) }}
              onVoiceResult={(updater) => { setReflexion(updater); setReflexionGuardada(false) }}
              placeholder="¿Qué harías diferente la próxima vez?"
            />
            <div className={styles.reflexionFooter}>
              {reflexionGuardada
                ? <span className={styles.reflexionGuardadaMsg}>✓ Guardado</span>
                : (
                  <button
                    className={styles.reflexionSaveBtn}
                    onClick={handleGuardarReflexion}
                    disabled={!reflexion.trim() || guardandoReflexion}
                    type="button"
                  >
                    {guardandoReflexion ? 'Guardando…' : 'Guardar reflexión'}
                  </button>
                )
              }
            </div>
          </div>

          {habilidadSugerida && (
            <button
              className={styles.estrategiaBtn}
              onClick={() => navigate('/estrategias', { state: { nueva: true, habilidad: habilidadSugerida, episodioOrigenId: episodioId } })}
            >
              <span className={styles.estrategiaBtnEmoji}>🌱</span>
              <span className={styles.estrategiaBtnTexto}>
                <strong>Crear estrategia desde esto</strong>
                <span>{habilidadSugerida}</span>
              </span>
              <span className={styles.estrategiaBtnArrow}>→</span>
            </button>
          )}
          <Button variant="primary" size="lg" fullWidth className={styles.guardarPill} onClick={() => navigate('/panel')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  // ── VISTA: ELEGIR MODO ────────────────────────────────────────────────────
  // Sin cupo no se entra a contar: se avisa y se vuelve. El modal es el mismo
  // que antes mostraba la selectora.
  if (sinCupo) {
    return (
      <UpgradeModal
        onClose={() => navigate('/nuevo')}
        tituloCustom={`Registraste ${MAX_EPISODIOS_FREE} episodios`}
        mensajeCustom="Eso es dedicación de verdad. Con Huella Pro sigues registrando sin límite y desbloqueas el análisis completo de patrones."
      />
    )
  }

  // ── VISTA: LA CONVERSACIÓN (entrada única) ────────────────────────────────
  if (vista === 'conversacional') {
    return (
      <RegistroConversacional
        hijo={state.hijo}
        padreNombre={state.padreNombre}
        guardando={loadingGuardar}
        errorGuardar={errorGuardar}
        onVolver={() => navigate('/nuevo')}
        onConfirmar={handleConfirmarConversacional}
        onEditarTodo={handleEditarTodo}
      />
    )
  }

  // ── VISTA: MODO DETALLADO ─────────────────────────────────────────────────
  return (
    <div ref={pageRef} className={styles.flujoRefugio}>
      <div className={styles.rapidoHeader}>
        <div className={styles.topRefugio}>
          <button className={styles.backDisco} onClick={() => navigate('/nuevo')} aria-label="Volver">←</button>
          <h2 className={styles.tituloRefugio}>¿Qué pasó?</h2>
        </div>
        <span className={`${styles.modoBadge} ${styles.modoBadgeCompleto} ${styles.modoBadgeCentrado}`}>análisis completo 🎯</span>
      </div>

      <VoiceTextarea value={descripcionLibre} onChange={setDescripcionLibre} onVoiceResult={setDescripcionLibre} placeholder="Cuéntame qué pasó, con tus palabras…" />

      <div className={styles.refSeccion}>
        <p className={styles.label}>Tipo de episodio</p>
        <TipoSelector tipo={tipo} setTipo={setTipo} tipoOtroTexto={tipoOtroTexto} setTipoOtroTexto={setTipoOtroTexto} bigEmoji />
      </div>

      <div className={styles.refSeccion}>
        <p className={styles.label}>¿Qué emoción crees que estaba detrás de lo que pasó? <span className={styles.labelOpcional}>(opcional)</span></p>
        <EmocionSelector emocion={emocionSeleccionada} setEmocion={setEmocionSeleccionada} />
      </div>

      <div className={styles.refSeccion}>
        <p className={styles.label}>¿Qué tan intenso fue?</p>
        <div className={styles.intensidadGridBig}>
          {INTENSIDADES.map((op) => (
            <button
              key={op.valor}
              className={`${styles.intensidadBtnBig} ${intensidad === op.valor ? styles.intensidadBtnBigSelected : ''}`}
              onClick={() => setIntensidad(op.valor)}
            >
              <span className={styles.intensidadEmojiBig}>{op.emoji}</span>
              <span className={styles.intensidadLabel}>{op.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.refSeccion}>
        <p className={styles.label}>¿Cuándo pasó?</p>
        <div className={styles.cuandoGrid}>
          {CUANDO_OPCIONES.map((op) => (
            <button
              key={op.id}
              className={`${styles.cuandoChip} ${cuandoPaso === op.id ? styles.cuandoChipActiva : ''}`}
              onClick={() => handleCuando(op.id)}
            >
              {op.label}
            </button>
          ))}
        </div>
        {cuandoPaso === 'custom' && (
          <FechaHoraPicker
            value={fechaCustom}
            onChange={setFechaCustom}
            max={nowLocal()}
          />
        )}
      </div>

      <div className={styles.refSeccion}>
        <p className={styles.label}>¿Qué estaba pasando antes?</p>
        <VoiceTextarea
          value={contexto}
          onChange={setContexto}
          onVoiceResult={setContexto}
          placeholder="Contexto breve del episodio..."
        />
      </div>

      <div className={styles.refSeccion}>
        <p className={styles.label}>Posibles gatillantes</p>
        <div className={styles.cuandoGrid}>
          {GATILLANTES.map((g) => (
            <button
              key={g}
              className={`${styles.cuandoChip} ${gatillantesSeleccionados.includes(g) ? styles.cuandoChipActiva : ''}`}
              onClick={() => toggleGatillante(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.refSeccion}>
        <p className={styles.label}>¿Cómo estabas tú en ese momento?</p>
        <div className={styles.cuandoGrid} style={{ marginBottom: estadoPadrePicker ? 10 : 0 }}>
          {ESTADOS_PADRE.map((op) => (
            <button
              key={op}
              className={`${styles.cuandoChip} ${estadoPadrePicker === op ? styles.cuandoChipActiva : ''}`}
              onClick={() => setEstadoPadrePicker((prev) => prev === op ? '' : op)}
            >
              {op}
            </button>
          ))}
        </div>
        {estadoPadrePicker === 'No lo vi yo' && (
          <div className={styles.quienEstuvoWrap}>
            <p className={styles.quienEstuvoLabel}>¿Quién estuvo presente?</p>
            <input
              className={styles.quienEstuvoInput}
              placeholder="ej: abuela, profe, otro cuidador"
              value={quienEstuvo}
              onChange={(e) => setQuienEstuvo(e.target.value)}
            />
          </div>
        )}
        {estadoPadrePicker && estadoPadrePicker !== 'No lo vi yo' && (
          <textarea
            className={styles.textarea}
            placeholder="Algo más que quieras agregar (opcional)..."
            value={estadoPadreExtra}
            onChange={(e) => setEstadoPadreExtra(e.target.value)}
            rows={2}
          />
        )}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className={styles.guardarPill}
        onClick={() => handleGuardar('detallado')}
        disabled={!tipo || !intensidad || !cuandoPaso}
        loading={loadingGuardar}
      >
        Guardar y obtener orientación
      </Button>
      {errorGuardar && <p className={styles.error}>{errorGuardar}</p>}
    </div>
  )
}
