import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { analizarEpisodio } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import styles from './RegistroPage.module.css'

const TIPOS = [
  { id: 'rabieta',     label: 'Rabieta / explosión',              emoji: '😤' },
  { id: 'llanto',      label: 'Llanto intenso',                   emoji: '😢' },
  { id: 'agresividad', label: 'Golpes / agresividad',             emoji: '😠' },
  { id: 'miedo',       label: 'Miedo / angustia',                 emoji: '😨' },
  { id: 'sueño',       label: 'No quiere dormir',                 emoji: '😴' },
  { id: 'oposicion',   label: 'Oposición / no coopera',           emoji: '🙅' },
  { id: 'social',      label: 'Se aisló / no quiso relacionarse', emoji: '🙈' },
  { id: 'desconexion', label: 'Se cerró / no respondía',          emoji: '😶' },
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

export default function RegistroPage() {
  const { state, addEpisodio, updateEpisodio } = useHuella()
  const navigate = useNavigate()

  const [vista, setVista] = useState('elegir')

  // shared fields
  const [tipo, setTipo] = useState('')
  const [intensidad, setIntensidad] = useState(null)

  // detailed-only fields
  const [cuandoPaso, setCuandoPaso] = useState('ahora')
  const [fechaCustom, setFechaCustom] = useState('')
  const [contexto, setContexto] = useState('')
  const [gatillantesSeleccionados, setGatillantesSeleccionados] = useState([])
  const [estadoPadrePicker, setEstadoPadrePicker] = useState('')
  const [estadoPadreExtra, setEstadoPadreExtra] = useState('')

  // post-save
  const [respuestaIA, setRespuestaIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

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
    }

    setLoadingGuardar(true)
    setErrorGuardar('')
    try {
      const episodioGuardado = await addEpisodio(episodio)
      setVista('guardado')
      setLoadingIA(true)
      try {
        const texto = await analizarEpisodio({
          hijo: state.hijo,
          episodio,
          historialReciente: state.episodios,
        })
        setRespuestaIA(texto)
        if (episodioGuardado?.id) {
          updateEpisodio({ id: episodioGuardado.id, orientacionIA: texto })
        }
      } catch (e) {
        setRespuestaIA('No se pudo obtener orientación: ' + e.message)
      } finally {
        setLoadingIA(false)
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
          <RespuestaIA
            texto={respuestaIA}
            loading={loadingIA}
            mensajeCarga="Analizando lo que pasó con tu hijo..."
          />
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

      <Card>
        <p className={styles.label}>Tipo de episodio</p>
        <TipoSelector tipo={tipo} setTipo={setTipo} />
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
