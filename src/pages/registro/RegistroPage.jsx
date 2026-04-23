import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, X, Mic, Send } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { analizarEpisodio, generarAccionInmediata, extraerCamposDeVoz } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import styles from './RegistroPage.module.css'

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

const TIPOS_PRINCIPALES = TIPOS.slice(0, 6)
const TIPOS_EXTRAS = TIPOS.slice(6)

const INTENSIDADES = [
  { valor: 1, emoji: '😌', label: 'Muy leve' },
  { valor: 2, emoji: '🙁', label: 'Leve' },
  { valor: 3, emoji: '😟', label: 'Moderado' },
  { valor: 4, emoji: '😣', label: 'Intenso' },
  { valor: 5, emoji: '😱', label: 'Muy intenso' },
]

const ESTADOS_PADRE = ['Calmado', 'Frustrado', 'Cansado', 'Ansioso', 'Triste', 'Abrumado']

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

function TipoSelector({ tipo, setTipo, bigEmoji = false }) {
  const [verMas, setVerMas] = useState(false)
  const mostrar = verMas ? TIPOS : TIPOS_PRINCIPALES
  return (
    <div>
      <div className={bigEmoji ? styles.tiposGridBig : styles.tiposGrid}>
        {mostrar.map((t) => (
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
      <button className={styles.verMasBtn} onClick={() => setVerMas((v) => !v)}>
        {verMas
          ? <><ChevronUp size={13} /> Ver menos</>
          : <><ChevronDown size={13} /> Ver más tipos</>}
      </button>
    </div>
  )
}

function NarrativaBar({ onExtracted, hijo }) {
  const [texto, setTexto] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [ok, setOk] = useState(false)
  const recRef = useRef(null)

  const disponibleVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  function toggleMic() {
    if (escuchando) {
      recRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'es-CL'
    rec.continuous = false
    rec.interimResults = false
    recRef.current = rec

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setTexto((prev) => (prev ? prev + ' ' + transcript : transcript))
    }
    rec.onerror = () => setEscuchando(false)
    rec.onend = () => setEscuchando(false)

    rec.start()
    setEscuchando(true)
  }

  async function confirmar() {
    if (!texto.trim() || procesando) return
    setProcesando(true)
    setOk(false)
    try {
      const campos = await extraerCamposDeVoz({ transcripcion: texto.trim(), hijo })
      if (campos) {
        onExtracted(campos)
        setOk(true)
        setTimeout(() => setOk(false), 3000)
      }
    } catch {}
    finally { setProcesando(false) }
  }

  return (
    <div className={styles.narrativaWrap}>
      <div className={styles.narrativaBar}>
        <textarea
          className={styles.narrativaTextarea}
          placeholder="Describe lo que pasó o usa el micrófono…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
        />
        <div className={styles.narrativaBtns}>
          {disponibleVoz && (
            <button
              className={`${styles.narrativaMicBtn} ${escuchando ? styles.narrativaMicBtnActivo : ''}`}
              onClick={toggleMic}
              type="button"
              aria-label={escuchando ? 'Detener grabación' : 'Dictar por voz'}
            >
              <Mic size={17} />
            </button>
          )}
          <button
            className={styles.narrativaEnviarBtn}
            onClick={confirmar}
            disabled={!texto.trim() || procesando}
            type="button"
            aria-label="Analizar y rellenar campos"
          >
            {procesando
              ? <span className={styles.narrativaSpinner} />
              : <Send size={15} />}
          </button>
        </div>
      </div>
      {ok && <p className={styles.narrativaOk}>✓ Campos rellenados automáticamente</p>}
    </div>
  )
}

export default function RegistroPage() {
  const { state, addEpisodio, updateEpisodio } = useHuella()
  const navigate = useNavigate()

  const [vista, setVista] = useState('elegir')

  // shared fields
  const [tipo, setTipo] = useState('')
  const [intensidad, setIntensidad] = useState(null)

  // detailed-only fields
  const [emocionSeleccionada, setEmocionSeleccionada] = useState('')
  const [cuandoPaso, setCuandoPaso] = useState('ahora')
  const [fechaCustom, setFechaCustom] = useState('')
  const [contexto, setContexto] = useState('')
  const [gatillantesSeleccionados, setGatillantesSeleccionados] = useState([])
  const [estadoPadrePicker, setEstadoPadrePicker] = useState('')
  const [estadoPadreExtra, setEstadoPadreExtra] = useState('')

  // post-save
  const [respuestaIA, setRespuestaIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [accionIA, setAccionIA] = useState('')
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  function handleVozExtracted(campos) {
    if (campos.tipo && TIPOS.find((t) => t.id === campos.tipo)) setTipo(campos.tipo)
    if (campos.intensidad) setIntensidad(campos.intensidad)
    if (campos.contexto) setContexto(campos.contexto)
    if (campos.gatillantes?.length) setGatillantesSeleccionados(campos.gatillantes.filter((g) => GATILLANTES.includes(g)))
    if (campos.estadoPadre && ESTADOS_PADRE.includes(campos.estadoPadre)) setEstadoPadrePicker(campos.estadoPadre)
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
      ? estadoPadrePicker
        ? estadoPadreExtra ? `${estadoPadrePicker}. ${estadoPadreExtra}` : estadoPadrePicker
        : estadoPadreExtra
      : ''

    const episodio = {
      id: Date.now().toString(),
      tipo,
      intensidad,
      contexto:    modo === 'detallado' ? contexto : '',
      gatillantes: modo === 'detallado' ? gatillantesSeleccionados : [],
      estadoPadre,
      fecha: modo === 'detallado' ? computarFecha(cuandoPaso, fechaCustom) : new Date().toISOString(),
      emocion:     modo === 'detallado' ? (emocionSeleccionada || null) : null,
    }

    setLoadingGuardar(true)
    setErrorGuardar('')
    try {
      const episodioGuardado = await addEpisodio(episodio)
      setVista('guardado')
      setLoadingIA(true)
      setLoadingAccion(true)
      setAccionIA('')
      const [texto] = await Promise.all([
        analizarEpisodio({ hijo: state.hijo, episodio, historialReciente: state.episodios })
          .catch((e) => 'No se pudo obtener orientación: ' + e.message),
        generarAccionInmediata({ hijo: state.hijo, episodio })
          .then((a) => { setAccionIA(a); setLoadingAccion(false) })
          .catch(() => { setLoadingAccion(false) }),
      ])
      setRespuestaIA(texto)
      setLoadingIA(false)
      if (episodioGuardado?.id) {
        updateEpisodio({ id: episodioGuardado.id, orientacionIA: texto })
      }
    } catch (e) {
      setErrorGuardar('No se pudo guardar: ' + e.message)
    } finally {
      setLoadingGuardar(false)
    }
  }

  // ── VISTA: GUARDADO ───────────────────────────────────────────────────────
  if (vista === 'guardado') {
    const tipoObj = TIPOS.find((t) => t.id === tipo)
    const habilidadSugerida = TIPO_A_HABILIDAD[tipo] || ''
    return (
      <div className={styles.page}>
        <div className={styles.guardadoContainer}>
          <Card className={styles.guardadoCard}>
            <p className={styles.guardadoIcon}>✅</p>
            <h3>Episodio registrado</h3>
            <p className={styles.guardadoSub}>
              {tipoObj?.emoji} {tipoObj?.label} — Intensidad {intensidad}/5
            </p>
          </Card>
          {(loadingAccion || accionIA) && (
            <div className={styles.accionCard}>
              <div className={styles.accionHeader}>
                <span className={styles.accionEmoji}>⚡</span>
                <span className={styles.accionLabel}>Acción inmediata</span>
              </div>
              {loadingAccion ? (
                <div className={styles.accionSkeleton}>
                  <div className={styles.accionSkLine} style={{ width: '90%' }} />
                  <div className={styles.accionSkLine} style={{ width: '75%' }} />
                </div>
              ) : (
                <p className={styles.accionTexto}>{accionIA}</p>
              )}
            </div>
          )}
          <RespuestaIA
            texto={respuestaIA}
            loading={loadingIA}
            mensajeCarga="Analizando lo que pasó con tu hijo..."
            categoria="regulacion"
          />
          {habilidadSugerida && (
            <button
              className={styles.estrategiaBtn}
              onClick={() => navigate('/estrategias', { state: { nueva: true, habilidad: habilidadSugerida } })}
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
      <div className={styles.page}>
        <div className={styles.elegirHeader}>
          <h2 className={styles.titulo}>¿Cómo registrar?</h2>
          <p className={styles.elegirSub}>
            Más contexto = análisis más preciso para {nombreHijo}
          </p>
        </div>

        <button className={styles.modoCard} onClick={() => setVista('rapido')}>
          <div className={styles.modoCardTop}>
            <span className={styles.modoIcono}>⚡</span>
            <span className={`${styles.modoBadge} ${styles.modoBadgeBasico}`}>análisis básico</span>
          </div>
          <h3 className={styles.modoTitulo}>Registro rápido</h3>
          <p className={styles.modoDesc}>Solo tipo e intensidad. Máximo 3 taps y listo.</p>
        </button>

        <button className={`${styles.modoCard} ${styles.modoCardDestacado}`} onClick={() => setVista('detallado')}>
          <div className={styles.modoCardTop}>
            <span className={styles.modoIcono}>📊</span>
            <span className={`${styles.modoBadge} ${styles.modoBadgeCompleto}`}>análisis completo 🎯</span>
          </div>
          <h3 className={styles.modoTitulo}>Registro detallado</h3>
          <p className={styles.modoDesc}>Agrega contexto, gatillantes y cómo estabas. La IA identifica patrones con más precisión.</p>
        </button>
      </div>
    )
  }

  // ── VISTA: MODO RÁPIDO ────────────────────────────────────────────────────
  if (vista === 'rapido') {
    return (
      <div className={styles.page}>
        <div className={styles.vistaHeader}>
          <button className={styles.backBtn} onClick={() => setVista('elegir')}>← Volver</button>
          <span className={`${styles.modoBadge} ${styles.modoBadgeBasico}`}>análisis básico</span>
        </div>
        <h2 className={styles.titulo}>¿Qué pasó?</h2>

        <NarrativaBar onExtracted={handleVozExtracted} hijo={state.hijo} />

        <Card>
          <p className={styles.label}>Tipo de episodio</p>
          <TipoSelector tipo={tipo} setTipo={setTipo} bigEmoji />
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
    <div className={styles.page}>
      <div className={styles.vistaHeader}>
        <button className={styles.backBtn} onClick={() => setVista('elegir')}>← Volver</button>
        <span className={`${styles.modoBadge} ${styles.modoBadgeCompleto}`}>análisis completo 🎯</span>
      </div>
      <h2 className={styles.titulo}>¿Qué pasó?</h2>

      <NarrativaBar onExtracted={handleVozExtracted} hijo={state.hijo} />

      <Card>
        <p className={styles.label}>Tipo de episodio</p>
        <TipoSelector tipo={tipo} setTipo={setTipo} />
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
          <input
            type="datetime-local"
            className={styles.fechaInput}
            value={fechaCustom}
            max={nowLocal()}
            onChange={(e) => setFechaCustom(e.target.value)}
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
        {estadoPadrePicker && (
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
