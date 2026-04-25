import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import { interpretarPatrones, generarConsejoDiario } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import GraficoFrecuenciaSemanal from '../../modules/panel/GraficoFrecuenciaSemanal'
import GraficoIntensidad from '../../modules/panel/GraficoIntensidad'
import GraficoGatillantes from '../../modules/panel/GraficoGatillantes'
import GraficoDiaSemana from '../../modules/panel/GraficoDiaSemana'
import GraficoTipos from '../../modules/panel/GraficoTipos'
import styles from './PanelPage.module.css'

const CONTEXTOS_ESTRATEGIA = {
  'Calmarse cuando explota':            { emoji: '🌊' },
  'Aceptar el "no" sin crisis':         { emoji: '💪' },
  'Manejar los cambios de rutina':      { emoji: '🔄' },
  'Relacionarse mejor con otros niños': { emoji: '🤝' },
  'Manejar el miedo y la angustia':     { emoji: '🛡️' },
  'Concentrarse y calmarse':            { emoji: '🧘' },
}

function buildGreeting(hora, padreNombre, nombreHijo, edadHijo) {
  const saludoHora = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const hijoLabel = edadHijo != null
    ? `${nombreHijo} (${edadHijo} ${edadHijo === 1 ? 'año' : 'años'})`
    : nombreHijo
  const preguntaHora = hora < 12
    ? `¿Cómo empezó el día con ${hijoLabel}?`
    : hora < 20
    ? `¿Cómo va la tarde con ${hijoLabel}?`
    : `¿Cómo estuvo hoy con ${hijoLabel}?`

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

function EstadoVacio({ nombreHijo, onRegistrar }) {
  return (
    <Card className={styles.emptyCard}>
      <div className={styles.emptyIlustracion}>🌱</div>
      <h2 className={styles.emptyTitulo}>Todo empieza aquí</h2>
      <p className={styles.emptyTexto}>
        Cada vez que anotas lo que pasó con <strong>{nombreHijo}</strong>,
        Huella construye un mapa de sus emociones. Con el tiempo verás
        patrones que hoy son invisibles.
      </p>
      <p className={styles.emptyTip}>No tiene que ser perfecto — una nota rápida ya cuenta.</p>
      <Button variant="primary" fullWidth onClick={onRegistrar}>
        <Plus size={18} />
        Registrar primer episodio
      </Button>
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

function AcompañamientoCard({ user, hijo, episodios, hitos, estrategias }) {
  const [frase, setFrase] = useState(null)
  const [loadingFrase, setLoadingFrase] = useState(false)
  const [diasVisitados, setDiasVisitados] = useState([])

  useEffect(() => {
    if (!user?.id) return

    const today = new Date().toISOString().split('T')[0]

    // Track presence
    const presenciaKey = `huella_presencia_${user.id}`
    try {
      const stored = JSON.parse(localStorage.getItem(presenciaKey) || '[]')
      const updated = stored.includes(today) ? stored : [...stored, today]
      localStorage.setItem(presenciaKey, JSON.stringify(updated))
      setDiasVisitados(updated)
    } catch {}

    // Fetch daily frase if enough data
    const hasData = episodios.length >= 2 || hitos.length >= 1
    if (!hasData) return

    const fraseKey = `huella_consejo_${user.id}_${today}`
    try {
      const cached = localStorage.getItem(fraseKey)
      if (cached) { setFrase(cached); return }
    } catch {}

    setLoadingFrase(true)
    generarConsejoDiario({ hijo, episodios, hitos, estrategias })
      .then((text) => {
        setFrase(text)
        try { localStorage.setItem(fraseKey, text) } catch {}
      })
      .catch(() => {})
      .finally(() => setLoadingFrase(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Week Mon–Sun
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const today = now.toISOString().split('T')[0]
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    return { iso, visited: diasVisitados.includes(iso), isToday: iso === today }
  })

  const count = semana.filter((d) => d.visited).length
  const nombre = hijo?.nombre || 'tu hijo/a'
  const presenciaTexto = count === 1
    ? `Esta semana acompañaste a ${nombre} 1 vez`
    : `Esta semana acompañaste a ${nombre} ${count} veces`

  const showFrase = frase || loadingFrase

  return (
    <Card className={styles.acompCard}>
      {showFrase && (
        <>
          <p className={loadingFrase ? styles.acompFraseCargando : styles.acompFrase}>
            {loadingFrase ? 'Preparando tu mensaje de hoy...' : frase}
          </p>
          <div className={styles.acompDivider} />
        </>
      )}
      <div className={styles.acompPresencia}>
        <p className={styles.acompPresenciaTexto}>{presenciaTexto}</p>
        <div className={styles.acompDots}>
          {semana.map(({ iso, visited, isToday }) => (
            <div
              key={iso}
              className={[
                styles.acompDot,
                visited ? styles.acompDotVisitado : '',
                isToday && !visited ? styles.acompDotHoy : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

export default function PanelPage() {
  const { user } = useAuth()
  const { state } = useHuella()
  const navigate = useNavigate()
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)

  const { hijo, episodios, hitos, estrategias, padreNombre } = state
  const nombreHijo = hijo?.nombre || 'tu hijo/a'
  const hora = new Date().getHours()
  const { titulo, subtitulo } = buildGreeting(hora, padreNombre, nombreHijo, hijo?.edad)

  const estrategiaActiva = useMemo(
    () => (estrategias || []).find((e) => e.semanaActual < 4),
    [estrategias]
  )

  // ── Narrativas de gráficos ────────────────────────────────────────────────

  const narrativaFrecuencia = useMemo(() => {
    if (episodios.length < 3) return null
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(monday)
      start.setDate(monday.getDate() - (5 - i) * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      return { start, end }
    })
    const counts = weeks.map((w) =>
      episodios.filter((e) => { const f = new Date(e.fecha); return f >= w.start && f < w.end }).length
    )
    const current = counts[5]
    const prev5 = counts.slice(0, 5)
    const prevWeek = counts[4]
    const avg5 = prev5.reduce((s, c) => s + c, 0) / 5
    const min5 = Math.min(...prev5.filter((_, i) => prev5.some((c) => c > 0)) )
    const hasHistory = prev5.some((c) => c > 0)

    // Impacto de estrategia (si empezó ≥14 días antes)
    const estActiva = estrategias.find((e) => e.fechaInicio)
    if (estActiva) {
      const inicio = new Date(estActiva.fechaInicio)
      const diasDesde = (Date.now() - inicio) / 864e5
      if (diasDesde >= 14) {
        const antes = episodios.filter((e) => new Date(e.fecha) < inicio)
        const despues = episodios.filter((e) => new Date(e.fecha) >= inicio)
        if (antes.length >= 3 && despues.length >= 3) {
          const tasaAntes = antes.length / Math.max((inicio - new Date(antes.at(-1).fecha)) / 864e5, 1)
          const tasaDespues = despues.length / diasDesde
          if (tasaDespues < tasaAntes * 0.65) {
            const pct = Math.round((1 - tasaDespues / tasaAntes) * 100)
            return `Los episodios bajaron un ${pct}% desde que empezaste tu estrategia 💪`
          }
        }
      }
    }

    if (current === 0) return 'Sin episodios esta semana 🌱'
    if (hasHistory && prev5.every((c) => c === 0 || current < c))
      return 'Mejor semana en los últimos 30 días 📈'
    if (prevWeek > 0 && current <= prevWeek * 0.6) {
      const pct = Math.round((1 - current / prevWeek) * 100)
      return `${pct}% menos episodios que la semana pasada 💪`
    }
    if (avg5 > 0 && current < avg5 * 0.85) return 'Esta semana, por debajo de tu promedio 🌿'
    if (avg5 > 0 && current > avg5 * 1.2) return 'Esta semana fue más intensa que tu promedio'
    if (prevWeek > 0 && current > prevWeek) {
      const diff = current - prevWeek
      return `${diff} más que la semana pasada — registrar ayuda a entender el patrón`
    }
    return `${current} episodio${current !== 1 ? 's' : ''} esta semana — dentro de tu promedio`
  }, [episodios, estrategias])

  const narrativaIntensidad = useMemo(() => {
    const data = [...episodios].reverse().slice(-20)
    if (data.length < 4) return null
    const half = Math.floor(data.length / 2)
    const avg = (arr) => arr.reduce((s, e) => s + e.intensidad, 0) / arr.length
    const firstAvg = avg(data.slice(0, half))
    const secondAvg = avg(data.slice(-half))
    const delta = secondAvg - firstAvg
    const overallAvg = avg(data).toFixed(1)
    if (delta <= -0.4)
      return `La intensidad está bajando 🌿 — de ${firstAvg.toFixed(1)} a ${secondAvg.toFixed(1)} en los últimos registros`
    if (delta >= 0.5)
      return `Los episodios recientes son más intensos (${secondAvg.toFixed(1)}/5) — considera reforzar la estrategia`
    return `Intensidad estable en los últimos registros — promedio ${overallAvg}/5`
  }, [episodios])

  const narrativaDiaSemana = useMemo(() => {
    if (episodios.length < 5) return null
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const ep of episodios) {
      const d = new Date(ep.fecha).getDay()
      counts[d === 0 ? 6 : d - 1]++
    }
    const DIAS_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    const peak = counts.indexOf(Math.max(...counts))
    const total = counts.reduce((s, c) => s + c, 0)
    const pct = Math.round((counts[peak] / total) * 100)
    const weekend = counts[5] + counts[6]
    const weekday = total - weekend
    if (pct >= 30) return `El ${DIAS_FULL[peak]} concentra el ${pct}% de los episodios — algo pasa ese día`
    if (weekend > 0 && weekday > 0 && weekend / 2 > (weekday / 5) * 1.5)
      return 'Los fines de semana son más intensos — los cambios de rutina pueden estar influyendo'
    return 'Los episodios se distribuyen en varios días — no hay un día claramente más difícil'
  }, [episodios])

  const narrativaTipos = useMemo(() => {
    const counts = {}
    for (const ep of episodios) {
      if (ep.tipo) counts[ep.tipo] = (counts[ep.tipo] || 0) + 1
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return null
    const total = entries.reduce((s, [, c]) => s + c, 0)
    const [topTipo, topCount] = entries[0]
    const TIPO_LABELS = {
      rabieta: 'rabietas', llanto: 'llanto', agresividad: 'agresividad',
      miedo: 'miedo', sueño: 'problemas de sueño', oposicion: 'oposición',
      social: 'dificultades sociales', desconexion: 'desconexión', otro: 'otro tipo',
    }
    const label = TIPO_LABELS[topTipo] || topTipo
    const pct = Math.round((topCount / total) * 100)
    if (entries.length === 1) return `Todos los episodios son de ${label}`
    if (pct >= 50) return `El ${pct}% de los episodios son ${label} — el patrón más claro`
    if (entries.length >= 3) return `Los episodios varían entre ${entries.length} tipos — el contexto importa más que el tipo`
    return `${label} es el tipo más frecuente (${pct}%)`
  }, [episodios])

  const narrativaGatillantes = useMemo(() => {
    const counts = {}
    for (const ep of episodios) {
      for (const g of ep.gatillantes || []) counts[g] = (counts[g] || 0) + 1
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return null
    const [topName, topCount] = entries[0]
    const totalConGatillante = episodios.filter((e) => e.gatillantes?.length > 0).length
    if (totalConGatillante === 0) return null

    // ¿Está aumentando en las últimas 4 semanas?
    const hace28 = new Date(); hace28.setDate(hace28.getDate() - 28)
    const recientes = episodios.filter((e) => new Date(e.fecha) >= hace28)
    const countReciente = recientes.filter((e) => e.gatillantes?.includes(topName)).length
    const pctReciente = recientes.length > 0 ? countReciente / recientes.length : 0
    const pctTotal = topCount / totalConGatillante

    if (pctReciente > pctTotal * 1.4 && countReciente >= 3)
      return `«${topName}» aparece cada vez más — algo cambió recientemente`
    if (entries.length >= 3 && entries[0][1] <= entries[2][1] * 1.4)
      return 'Los gatillantes varían — no hay uno dominante, el contexto importa más'
    if (pctTotal >= 0.5)
      return `«${topName}» aparece en más de la mitad de los episodios — el patrón más claro`
    return `«${topName}» es el gatillante más frecuente con ${topCount} ${topCount === 1 ? 'aparición' : 'apariciones'}`
  }, [episodios])

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

      {/* ── Presencia semanal ── */}
      <PresenciaSemanal user={user} />

      {episodios.length === 0 ? (

        /* ── Estado vacío ── */
        <EstadoVacio nombreHijo={nombreHijo} onRegistrar={() => navigate('/nuevo')} />

      ) : (
        <>
          {/* ── Consejo diario ── */}
          <ConsejoDiario user={user} hijo={hijo} episodios={episodios} hitos={hitos} estrategias={estrategias} />

          {/* ── Resumen emocional ── */}
          <ResumenEmocionalCard episodios={episodios} hitos={hitos} />

          {/* ── CTA registrar ── */}
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/nuevo')}>
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
                <GraficoFrecuenciaSemanal episodios={episodios} estrategiaInicio={estrategiaActiva?.fechaInicio} />
                {narrativaFrecuencia && (
                  <p className={styles.narrativa}>{narrativaFrecuencia}</p>
                )}
              </Card>
              <Card className={styles.graficoCard}>
                <h3 className={styles.cardTitle}>Distribución por día</h3>
                <GraficoDiaSemana episodios={episodios} />
                {narrativaDiaSemana && (
                  <p className={styles.narrativa}>{narrativaDiaSemana}</p>
                )}
              </Card>
              <Card className={styles.graficoCard}>
                <h3 className={styles.cardTitle}>Intensidad en el tiempo</h3>
                <GraficoIntensidad episodios={episodios} />
                {narrativaIntensidad && (
                  <p className={styles.narrativa}>{narrativaIntensidad}</p>
                )}
              </Card>
              <Card className={styles.graficoCard}>
                <h3 className={styles.cardTitle}>Tipos de episodio</h3>
                <GraficoTipos episodios={episodios} />
                {narrativaTipos && (
                  <p className={styles.narrativa}>{narrativaTipos}</p>
                )}
              </Card>
              <Card className={styles.graficoCard}>
                <h3 className={styles.cardTitle}>Gatillantes más frecuentes</h3>
                <GraficoGatillantes episodios={episodios} />
                {narrativaGatillantes && (
                  <p className={styles.narrativa}>{narrativaGatillantes}</p>
                )}
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
              <RespuestaIA texto={analisis} loading={loadingAnalisis} mensajeCarga="Identificando patrones en el historial..." categoria="patrones" />
            )}
          </Card>
        </>
      )}

    </div>
  )
}
