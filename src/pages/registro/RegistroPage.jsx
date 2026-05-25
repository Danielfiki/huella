import React, { useState, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import UpgradeModal from '../../components/ui/UpgradeModal'
import { analizarEpisodio, generarAccionInmediata } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import AccionRapida from '../../components/historial/AccionRapida'
import { renderMarkdown } from '../../utils/renderMarkdown'
import styles from './RegistroPage.module.css'
import VoiceTextarea from '../../components/ui/VoiceTextarea'

const TAXONOMIA_EMOCIONES = [
  {
    id: 'miedo',
    label: 'Miedo / Angustia',
    emoji: '😨',
    color: '#7C8FD4',
    colorBg: '#EEF0FB',
    especificas: [
      'Miedo al abandono',
      'Miedo a lo desconocido',
      'Miedo a fracasar',
      'Miedo a hacerse daño',
      'Miedo a la oscuridad',
    ],
  },
  {
    id: 'rabia',
    label: 'Rabia / Frustración',
    emoji: '😠',
    color: '#C4714A',
    colorBg: '#FAEDE6',
    especificas: [
      'Rabia por injusticia',
      'Rabia por no conseguir algo',
      'Rabia por ser interrumpido',
      'Rabia por perder el control',
      'Frustración acumulada',
    ],
  },
  {
    id: 'tristeza',
    label: 'Tristeza / Pena',
    emoji: '😢',
    color: '#5B8DB8',
    colorBg: '#E8F1F8',
    especificas: [
      'Tristeza por un cambio o pérdida',
      'Tristeza por sentirse solo',
      'Tristeza por decepción',
      'Añoranza de alguien',
      'Tristeza sin causa clara',
    ],
  },
  {
    id: 'alegria',
    label: 'Alegría / Desborde',
    emoji: '🤩',
    color: '#C49A28',
    colorBg: '#FDF5DC',
    especificas: [
      'Euforia que se desbordó',
      'Alegría que terminó en llanto',
      'Excitación extrema',
      'Emoción por anticipación',
    ],
  },
  {
    id: 'asco',
    label: 'Asco / Rechazo',
    emoji: '🤢',
    color: '#7A9E6A',
    colorBg: '#EBF3E8',
    especificas: [
      'Rechazo a comida o textura',
      'Rechazo a una actividad',
      'Disgusto sensorial',
      'Vergüenza',
    ],
  },
  {
    id: 'confusion',
    label: 'Confusión / Sorpresa',
    emoji: '😵',
    color: '#C4874A',
    colorBg: '#FAF0E6',
    especificas: [
      'Confusión por cambio de reglas',
      'Sorpresa que asustó',
      'No entendió lo que pasó',
      'Se sintió ignorado',
    ],
  },
]

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

const TIPOS = [
  { id: 'rabieta',     label: 'Rabieta / explosión',              emoji: '💥' },
  { id: 'llanto',      label: 'Llanto intenso',                   emoji: '😭' },
  { id: 'agresividad', label: 'Golpes / agresividad',             emoji: '👊' },
  { id: 'miedo',       label: 'Miedo / angustia',                 emoji: '🫣' },
  { id: 'sueño',       label: 'No quiere dormir',                 emoji: '🛏️' },
  { id: 'oposicion',   label: 'Oposición / no coopera',           emoji: '🚫' },
  { id: 'social',      label: 'Se aisló / no quiso relacionarse', emoji: '🫥' },
  { id: 'desconexion', label: 'Se cerró / no respondía',          emoji: '🔇' },
  { id: 'otro',        label: 'Otro',                             emoji: '📝' },
]

const INTENSIDADES = [
  { valor: 1, emoji: '😌', label: 'Muy leve' },
  { valor: 2, emoji: '🙁', label: 'Leve' },
  { valor: 3, emoji: '😟', label: 'Moderado' },
  { valor: 4, emoji: '😣', label: 'Intenso' },
  { valor: 5, emoji: '😱', label: 'Muy intenso' },
]

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

const CUANDO_OPCIONES = [
  { id: 'ahora',      label: 'Ahora' },
  { id: 'hora_antes', label: 'Hace ~1 hora' },
  { id: 'manana',     label: 'Esta mañana' },
  { id: 'tarde',      label: 'Esta tarde' },
  { id: 'ayer',       label: 'Ayer' },
  { id: 'custom',     label: 'Otro momento…' },
]

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
    case 'ayer':       d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); return d.toISOString()
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
              tipo === t.id ? styles.tipoSelected : '',
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

  const [vista, setVista] = useState('elegir')
  const [showUpgrade, setShowUpgrade] = useState(false)

  // shared fields
  const [tipo, setTipo] = useState('')
  const [intensidad, setIntensidad] = useState(null)
  const [tipoOtroTexto, setTipoOtroTexto] = useState('')
  const [descripcionLibre, setDescripcionLibre] = useState('')

  // detailed-only fields
  const [emocionSeleccionada, setEmocionSeleccionada] = useState('')
  const [cuandoPaso, setCuandoPaso] = useState('ahora')
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

  function trySetVista(v) {
    if (state.episodios.length >= 15 && !isPro()) { setShowUpgrade(true); return }
    setVista(v)
  }

  function handleCuando(id) {
    setCuandoPaso(id)
    if (id === 'custom' && !fechaCustom) setFechaCustom(nowLocal())
  }

  function toggleGatillante(g) {
    setGatillantesSeleccionados((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  async function handleGuardar(modo) {
    if (!tipo || !intensidad) return

    const estadoPadre = modo === 'detallado'
      ? estadoPadrePicker === 'No lo vi yo'
        ? quienEstuvo.trim() ? `No lo vi yo — ${quienEstuvo.trim()}` : 'No lo vi yo'
        : estadoPadrePicker
          ? estadoPadreExtra ? `${estadoPadrePicker}. ${estadoPadreExtra}` : estadoPadrePicker
          : estadoPadreExtra
      : ''

    const episodio = {
      id: Date.now().toString(),
      tipo,
      intensidad,
      contexto:    contexto,
      gatillantes: modo === 'detallado' ? gatillantesSeleccionados : [],
      estadoPadre,
      fecha: modo === 'detallado' ? computarFecha(cuandoPaso, fechaCustom) : new Date().toISOString(),
      emocion:          modo === 'detallado' ? (emocionSeleccionada || null) : null,
      descripcionLibre: tipo === 'otro' && tipoOtroTexto.trim()
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
    try {
      const texto = await analizarEpisodio({
        hijo: state.hijo,
        episodio: args.episodio,
        historialReciente: args.historial,
        bloqueRutina: args.bloqueRutina,
      })
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
    const tipoObj = TIPOS.find((t) => t.id === tipo)
    const habilidadSugerida = TIPO_A_HABILIDAD[tipo] || ''
    return (
      <div ref={pageRef} className={styles.page}>
        <div className={styles.guardadoContainer}>
          <Card className={styles.guardadoCard}>
            <p className={styles.guardadoIcon}>✅</p>
            <h3>Episodio registrado</h3>
            <p className={styles.guardadoSub}>
              {tipoObj?.emoji} {tipoObj?.label} — Intensidad {intensidad}/5
            </p>
          </Card>
          {(loadingAccion || accionIA) && (
            loadingAccion ? (
              <div className={styles.accionCard}>
                <div className={styles.accionHeader}>
                  <span className={styles.accionEmoji}>⚡</span>
                  <span className={styles.accionLabel}>Acción rápida</span>
                </div>
                <div className={styles.accionSkeleton}>
                  <div className={styles.accionSkLine} style={{ width: '90%' }} />
                  <div className={styles.accionSkLine} style={{ width: '75%' }} />
                </div>
              </div>
            ) : (
              <AccionRapida data={accionIA} />
            )
          )}
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
            <RespuestaIA
              texto={respuestaIA}
              loading={loadingIA}
              mensajeCarga="Analizando lo que pasó con tu hijo..."
              categoria="regulacion"
            />
          )}
          <p className={styles.registroMantram}>Cada registro es una conversación contigo mismo sobre cómo quieres criar.</p>

          <div className={styles.reflexionSection}>
            <p className={styles.reflexionLabel}>
              ¿Cómo te sentiste tú? ¿Qué harías diferente?
              <span className={styles.reflexionOpcional}> — opcional</span>
            </p>
            <textarea
              className={styles.textarea}
              placeholder="¿Qué harías diferente la próxima vez?"
              value={reflexion}
              onChange={(e) => { setReflexion(e.target.value); setReflexionGuardada(false) }}
              rows={3}
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
          <Button variant="secondary" fullWidth onClick={() => navigate('/panel')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  // ── VISTA: ELEGIR MODO ────────────────────────────────────────────────────
  if (vista === 'elegir') {
    const nombreHijo = state.hijo?.nombre || 'tu hijo/a'
    return (
      <div ref={pageRef} className={styles.page}>
        <div className={styles.elegirHeader}>
          <h2 className={styles.titulo}>¿Cómo registrar?</h2>
          <p className={styles.elegirSub}>
            Más contexto = análisis más preciso para {nombreHijo}
          </p>
        </div>

        <button className={styles.modoCard} onClick={() => trySetVista('rapido')}>
          <div className={styles.modoCardTop}>
            <span className={styles.modoIcono}>⚡</span>
            <span className={`${styles.modoBadge} ${styles.modoBadgeBasico}`}>orientación inmediata</span>
          </div>
          <h3 className={styles.modoTitulo}>Registro rápido</h3>
          <p className={styles.modoDesc}>Solo tipo e intensidad. Máximo 3 taps y listo.</p>
        </button>

        <button className={`${styles.modoCard} ${styles.modoCardDestacado}`} onClick={() => trySetVista('detallado')}>
          <div className={styles.modoCardTop}>
            <span className={styles.modoIcono}>📊</span>
            <span className={`${styles.modoBadge} ${styles.modoBadgeCompleto}`}>análisis completo 🎯</span>
          </div>
          <h3 className={styles.modoTitulo}>Registro detallado</h3>
          <p className={styles.modoDesc}>Agrega contexto, gatillantes y cómo estabas. La IA identifica patrones con más precisión.</p>
        </button>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </div>
    )
  }

  // ── VISTA: MODO RÁPIDO ────────────────────────────────────────────────────
  if (vista === 'rapido') {
    return (
      <div ref={pageRef} className={styles.page}>
        <div className={styles.vistaHeader}>
          <button className={styles.backBtn} onClick={() => setVista('elegir')}>← Volver</button>
          <span className={`${styles.modoBadge} ${styles.modoBadgeBasico}`}>orientación inmediata</span>
        </div>
        <h2 className={styles.titulo}>¿Qué pasó?</h2>

        <VoiceTextarea value={descripcionLibre} onChange={setDescripcionLibre} onVoiceResult={setDescripcionLibre} />

        <Card>
          <p className={styles.label}>Tipo de episodio</p>
          <TipoSelector tipo={tipo} setTipo={setTipo} tipoOtroTexto={tipoOtroTexto} setTipoOtroTexto={setTipoOtroTexto} bigEmoji />
        </Card>

        <Card>
          <p className={styles.label}>¿Qué tan intenso fue?</p>
          <div className={styles.intensidadGridBig}>
              {INTENSIDADES.map((op) => (
                <button
                  key={op.valor}
                  className={`${styles.intensidadBtnBig} ${intensidad === op.valor ? styles.intensidadSelected : ''}`}
                  onClick={() => setIntensidad(op.valor)}
                >
                  <span className={styles.intensidadEmojiBig}>{op.emoji}</span>
                  <span className={styles.intensidadLabel}>{op.label}</span>
                </button>
              ))}
          </div>
        </Card>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => handleGuardar('rapido')}
          disabled={!tipo || !intensidad}
          loading={loadingGuardar}
        >
          Guardar
        </Button>
        {errorGuardar && <p className={styles.error}>{errorGuardar}</p>}

        <button className={styles.cambiarModoBtn} onClick={() => setVista('detallado')}>
          ¿Quieres agregar más detalle? → Registro detallado
        </button>
      </div>
    )
  }

  // ── VISTA: MODO DETALLADO ─────────────────────────────────────────────────
  return (
    <div ref={pageRef} className={styles.page}>
      <div className={styles.vistaHeader}>
        <button className={styles.backBtn} onClick={() => setVista('elegir')}>← Volver</button>
        <span className={`${styles.modoBadge} ${styles.modoBadgeCompleto}`}>análisis completo 🎯</span>
      </div>
      <h2 className={styles.titulo}>¿Qué pasó?</h2>

      <VoiceTextarea value={descripcionLibre} onChange={setDescripcionLibre} onVoiceResult={setDescripcionLibre} />

      <Card>
        <p className={styles.label}>Tipo de episodio</p>
        <TipoSelector tipo={tipo} setTipo={setTipo} tipoOtroTexto={tipoOtroTexto} setTipoOtroTexto={setTipoOtroTexto} />
      </Card>

      <Card>
        <p className={styles.label}>¿Qué emoción crees que estaba detrás de lo que pasó? <span className={styles.labelOpcional}>(opcional)</span></p>
        <EmocionSelector emocion={emocionSeleccionada} setEmocion={setEmocionSeleccionada} />
      </Card>

      <Card>
        <p className={styles.label}>¿Qué tan intenso fue?</p>
        <div className={styles.intensidadGrid}>
          {INTENSIDADES.map((op) => (
            <button
              key={op.valor}
              className={`${styles.intensidadBtn} ${intensidad === op.valor ? styles.intensidadSelected : ''}`}
              onClick={() => setIntensidad(op.valor)}
            >
              <span className={styles.intensidadEmoji}>{op.emoji}</span>
              <span className={styles.intensidadLabel}>{op.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className={styles.label}>¿Cuándo pasó?</p>
        <div className={styles.tagsGrid}>
          {CUANDO_OPCIONES.map((op) => (
            <button
              key={op.id}
              className={`${styles.tag} ${cuandoPaso === op.id ? styles.tagSelected : ''}`}
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
      </Card>

      <Card>
        <p className={styles.label}>¿Qué estaba pasando antes?</p>
        <textarea
          className={styles.textarea}
          placeholder="Contexto breve del episodio..."
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          rows={3}
        />
      </Card>

      <Card>
        <p className={styles.label}>Posibles gatillantes</p>
        <div className={styles.tagsGrid}>
          {GATILLANTES.map((g) => (
            <button
              key={g}
              className={`${styles.tag} ${gatillantesSeleccionados.includes(g) ? styles.tagSelected : ''}`}
              onClick={() => toggleGatillante(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className={styles.label}>¿Cómo estabas tú en ese momento?</p>
        <div className={styles.tagsGrid} style={{ marginBottom: estadoPadrePicker ? 10 : 0 }}>
          {ESTADOS_PADRE.map((op) => (
            <button
              key={op}
              className={`${styles.tag} ${estadoPadrePicker === op ? styles.tagSelected : ''}`}
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
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => handleGuardar('detallado')}
        disabled={!tipo || !intensidad}
        loading={loadingGuardar}
      >
        Guardar y obtener orientación
      </Button>
      {errorGuardar && <p className={styles.error}>{errorGuardar}</p>}
    </div>
  )
}
