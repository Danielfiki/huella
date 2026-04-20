import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import { interpretarPatrones } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import GraficoFrecuenciaSemanal from '../../modules/panel/GraficoFrecuenciaSemanal'
import GraficoIntensidad from '../../modules/panel/GraficoIntensidad'
import GraficoGatillantes from '../../modules/panel/GraficoGatillantes'
import styles from './PanelPage.module.css'

const CONTEXTOS_ESTRATEGIA = {
  'Calmarse cuando explota':            { emoji: '🌊' },
  'Aceptar el "no" sin crisis':         { emoji: '💪' },
  'Manejar los cambios de rutina':      { emoji: '🔄' },
  'Relacionarse mejor con otros niños': { emoji: '🤝' },
  'Manejar el miedo y la angustia':     { emoji: '🛡️' },
  'Concentrarse y calmarse':            { emoji: '🧘' },
}

function getPadreNombre(userId) {
  try { return localStorage.getItem(`huella_padre_v1_${userId || 'anon'}`) || '' } catch { return '' }
}

function buildGreeting(hora, padreNombre, nombreHijo) {
  const saludoHora = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const preguntaHora = hora < 12
    ? `¿Cómo empezó el día con ${nombreHijo}?`
    : hora < 20
    ? `¿Cómo va la tarde con ${nombreHijo}?`
    : `¿Cómo estuvo hoy con ${nombreHijo}?`

  if (padreNombre) {
    return { titulo: `Hola, ${padreNombre} 👋`, subtitulo: preguntaHora }
  }
  return { titulo: `${saludoHora} 👋`, subtitulo: preguntaHora }
}

function buildResumenEmocional(episodios, hitos) {
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const semana = episodios.filter((e) => new Date(e.fecha) >= hace7)
  const total = semana.length
  const hitosSemana = hitos.filter((h) => new Date(h.fecha) >= hace7).length
  const promedio = total > 0
    ? (semana.reduce((s, e) => s + (e.intensidad || 0), 0) / total).toFixed(1)
    : 0
  const diasSin = episodios.length > 0
    ? Math.floor((new Date() - new Date(episodios[0].fecha)) / 864e5)
    : null

  if (diasSin !== null && diasSin >= 5) {
    return { emoji: '🌱', frase: `Llevas ${diasSin} días sin registrar.`, detalle: 'Las semanas tranquilas también merecen un registro. Volver al hábito ayuda a ver el patrón.' }
  }
  if (total === 0) {
    return { emoji: '✨', frase: 'Sin episodios esta semana.', detalle: 'Eso también es información valiosa. ¡Sigue así!' }
  }
  if (total >= 6) {
    return { emoji: '💪', frase: `Semana intensa: ${total} episodios registrados.`, detalle: `Que los hayas anotado todos ya es un gran paso. Intensidad promedio ${promedio}/5.` }
  }
  if (hitosSemana > 0 && total > 0) {
    return { emoji: '⚖️', frase: `${total} ${total === 1 ? 'episodio difícil' : 'episodios difíciles'} y ${hitosSemana} ${hitosSemana === 1 ? 'momento positivo' : 'momentos positivos'}.`, detalle: 'Registrar las dos caras de la semana es lo que construye el mapa completo de tu hijo.' }
  }
  if (Number(promedio) <= 2) {
    return { emoji: '🌿', frase: `${total} ${total === 1 ? 'episodio' : 'episodios'} esta semana, con baja intensidad.`, detalle: 'Los episodios leves también construyen el patrón. Buen trabajo registrando.' }
  }
  return { emoji: '💪', frase: `Esta semana tuviste ${total} ${total === 1 ? 'momento difícil' : 'momentos difíciles'}, pero los registraste todos.`, detalle: `Intensidad promedio ${promedio}/5. Eso dice mucho de ti como padre/madre.` }
}

function ResumenEmocionalCard({ episodios, hitos }) {
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const semana = episodios.filter((e) => new Date(e.fecha) >= hace7)
  const total = semana.length
  const hitosSemana = hitos.filter((h) => new Date(h.fecha) >= hace7).length
  const promedio = total > 0
    ? (semana.reduce((s, e) => s + (e.intensidad || 0), 0) / total).toFixed(1)
    : '—'

  const { emoji, frase, detalle } = buildResumenEmocional(episodios, hitos)

  return (
    <Card className={styles.resumenCard}>
      <div className={styles.resumenTop}>
        <span className={styles.resumenEmoji}>{emoji}</span>
        <div className={styles.resumenTextos}>
          <p className={styles.resumenFrase}>{frase}</p>
          <p className={styles.resumenDetalle}>{detalle}</p>
        </div>
      </div>
      <div className={styles.resumenStats}>
        <div className={styles.resumenStat}>
          <span className={styles.resumenStatNum}>{total}</span>
          <span className={styles.resumenStatLabel}>episodios</span>
        </div>
        <div className={styles.resumenStatDivider} />
        <div className={styles.resumenStat}>
          <span className={styles.resumenStatNum}>{promedio}</span>
          <span className={styles.resumenStatLabel}>intensidad</span>
        </div>
        <div className={styles.resumenStatDivider} />
        <div className={styles.resumenStat}>
          <span className={styles.resumenStatNum}>{hitosSemana}</span>
          <span className={styles.resumenStatLabel}>hitos ⭐</span>
        </div>
      </div>
    </Card>
  )
}

function EstrategiaActivaPanel({ estrategia, onAbrir }) {
  const ctx = CONTEXTOS_ESTRATEGIA[estrategia.habilidad] || { emoji: '🎯' }
  const semana = Math.min(estrategia.semanaActual, 4)
  return (
    <button className={styles.estrategiaCard} onClick={onAbrir}>
      <div className={styles.estrategiaCardLeft}>
        <span className={styles.estrategiaEmoji}>{ctx.emoji}</span>
        <div>
          <p className={styles.estrategiaLabel}>Estrategia activa — Semana {semana}/4</p>
          <p className={styles.estrategiaTitulo}>{estrategia.habilidad}</p>
        </div>
      </div>
      <ChevronRight size={18} className={styles.estrategiaChevron} />
    </button>
  )
}

export default function PanelPage() {
  const { user } = useAuth()
  const { state } = useHuella()
  const navigate = useNavigate()
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)

  const { hijo, episodios, hitos, estrategias } = state
  const nombreHijo = hijo?.nombre || 'tu hijo/a'
  const padreNombre = getPadreNombre(user?.id)
  const hora = new Date().getHours()
  const { titulo, subtitulo } = buildGreeting(hora, padreNombre, nombreHijo)

  const estrategiaActiva = useMemo(
    () => (estrategias || []).find((e) => e.semanaActual < 4),
    [estrategias]
  )

  async function handleAnalizarPatrones() {
    setLoadingAnalisis(true)
    try {
      const texto = await interpretarPatrones({ hijo, episodios })
      setAnalisis(texto)
    } catch (e) {
      setAnalisis('Error al conectar con la IA: ' + e.message)
    } finally {
      setLoadingAnalisis(false)
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Saludo ── */}
      <div className={styles.greeting}>
        {hijo?.avatarUrl
          ? <img src={hijo.avatarUrl} alt="Avatar" className={styles.greetingAvatar} />
          : <div className={styles.greetingAvatarPlaceholder}>{nombreHijo.charAt(0).toUpperCase()}</div>
        }
        <div className={styles.greetingText}>
          <h1 className={styles.greetingTitulo}>{titulo}</h1>
          {hijo && <p className={styles.greetingSubtitulo}>{subtitulo}</p>}
          {!hijo && <p className={styles.greetingSubtitulo}>Configura el perfil de tu hijo/a para empezar.</p>}
        </div>
      </div>

      {/* ── Resumen emocional ── */}
      <ResumenEmocionalCard episodios={episodios} hitos={hitos} />

      {/* ── CTA registrar ── */}
      <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/registro')}>
        <Plus size={20} />
        Registrar episodio
      </Button>

      {/* ── Estrategia activa ── */}
      {estrategiaActiva && (
        <EstrategiaActivaPanel
          estrategia={estrategiaActiva}
          onAbrir={() => navigate('/estrategias')}
        />
      )}

      {/* ── Gráficos ── */}
      {episodios.length >= 3 && (
        <>
          <Card className={styles.graficoCard}>
            <h3 className={styles.cardTitle}>Frecuencia semanal</h3>
            <GraficoFrecuenciaSemanal episodios={episodios} />
          </Card>
          <Card className={styles.graficoCard}>
            <h3 className={styles.cardTitle}>Intensidad en el tiempo</h3>
            <GraficoIntensidad episodios={episodios} />
          </Card>
          <Card className={styles.graficoCard}>
            <h3 className={styles.cardTitle}>Gatillantes más frecuentes</h3>
            <GraficoGatillantes episodios={episodios} />
          </Card>
        </>
      )}

      {/* ── Análisis de patrones ── */}
      <Card className={styles.patronesCard}>
        <div className={styles.patronesHeader}>
          <TrendingUp size={18} />
          <h3>Análisis de patrones</h3>
        </div>
        <p className={styles.patronesDesc}>
          {episodios.length < 3
            ? 'Registra al menos 3 episodios para activar el análisis de patrones.'
            : `Tienes ${episodios.length} episodios registrados. La IA puede identificar patrones.`}
        </p>
        {episodios.length >= 3 && (
          <Button variant="secondary" fullWidth onClick={handleAnalizarPatrones} loading={loadingAnalisis} className={styles.patronesBtn}>
            Ver análisis de patrones
          </Button>
        )}
        {(analisis || loadingAnalisis) && (
          <RespuestaIA texto={analisis} loading={loadingAnalisis} mensajeCarga="Identificando patrones en el historial..." />
        )}
      </Card>

    </div>
  )
}
