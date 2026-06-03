import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import { interpretarPatrones, detectarPatronesEstructurado } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import GuiaPrimerosPasos from '../../components/ui/GuiaPrimerosPasos'
import BienvenidaModal from '../../components/ui/BienvenidaModal'
import ConsejoDelDiaModal from '../../components/ui/ConsejoDelDiaModal'
import UpgradeModal from '../../components/ui/UpgradeModal'
import { useConsejoDiario } from '../../components/ui/useConsejoDiario'
import { Hero } from '../../components/panel/Hero'
import { CTAPrimary } from '../../components/panel/CTAPrimary'
import { CTAAskHuella } from '../../components/panel/CTAAskHuella'
import { ResumenSemanal } from '../../components/panel/ResumenSemanal'
import { ChartFrecuencia } from '../../components/panel/ChartFrecuencia'
import { ChartIntensidad } from '../../components/panel/ChartIntensidad'
import { ChartGatillos } from '../../components/panel/ChartGatillos'
import { AnalisisIA } from '../../components/panel/AnalisisIA'
import { SectionEyebrow } from '../../components/panel/SectionEyebrow'
import panelStyles from '../../components/panel/panel.module.css'
import { getAuthorDisplay } from '../../utils/authorDisplay'
import styles from './PanelPage.module.css'

// ── Emoji mapping for free-form trigger labels ──────────────────────────────

const GATILLANTE_EMOJIS = {
  comida: '🍽️', hambre: '🍽️', comer: '🍽️', almuerzo: '🍽️', desayuno: '🍽️',
  sueño: '😴', dormir: '😴', cansancio: '😴', siesta: '😴',
  escuela: '🏫', colegio: '🏫', tarea: '📚', jardín: '🏫',
  hermano: '👫', hermanos: '👫', hermana: '👧',
  pantallas: '📱', televisión: '📺', tele: '📺', celular: '📱', tablet: '📱',
  rutina: '🔄', transición: '🚪', cambio: '🔄',
  aburrimiento: '😑', juego: '🎮',
  dolor: '💊', enfermedad: '🤒',
  baño: '🚿', ducha: '🚿',
  salida: '🚪', llegada: '🚪',
  visita: '👥', social: '👥',
}

const CONTEXTOS_ESTRATEGIA = {
  'Calmarse cuando explota':            { emoji: '🌊' },
  'Aceptar el "no" sin crisis':         { emoji: '💪' },
  'Manejar los cambios de rutina':      { emoji: '🔄' },
  'Relacionarse mejor con otros niños': { emoji: '🤝' },
  'Manejar el miedo y la angustia':     { emoji: '🛡️' },
  'Concentrarse y calmarse':            { emoji: '🧘' },
}

const CATEGORIA_EMOJIS = {
  autorregulacion: '🌱', empatia: '💛', disculpa: '🤝',
  frustration: '💪', social: '👫', otro: '⭐',
}

const DIAS_LABEL = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

// ── Componentes locales preservados ──────────────────────────────────────────

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

function EstrategiaActivaPanel({ estrategia, onAbrir, authorName }) {
  const ctx = CONTEXTOS_ESTRATEGIA[estrategia.habilidad] || { emoji: '🎯' }
  const semana = Math.min(estrategia.semanaActual, 4)
  return (
    <button className={styles.estrategiaCard} onClick={onAbrir}>
      <div className={styles.estrategiaCardLeft}>
        <span className={styles.estrategiaEmoji}>{ctx.emoji}</span>
        <div>
          <p className={styles.estrategiaLabel}>
            Estrategia activa — Semana {semana}/4
            {authorName && <span style={{ fontWeight: 600, color: 'var(--color-text-light)', marginLeft: '4px' }}>· {authorName}</span>}
          </p>
          <p className={styles.estrategiaTitulo}>{estrategia.habilidad}</p>
        </div>
      </div>
      <ChevronRight size={18} className={styles.estrategiaChevron} />
    </button>
  )
}

function UltimoHitoCard({ hito, onVerLogros, authorName }) {
  const emoji = CATEGORIA_EMOJIS[hito.categoria] || '⭐'
  return (
    <button
      onClick={onVerLogros}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        background: 'var(--color-surface)', border: '1.5px solid var(--color-primary-border)',
        borderRadius: 'var(--radius-md)', padding: '12px 14px', cursor: 'pointer',
        textAlign: 'left', boxShadow: 'var(--shadow-sm)',
      }}
    >
      {hito.foto_url
        ? <img src={hito.foto_url} alt="Logro" style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{emoji}</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Último avance</p>
        <p style={{ margin: '2px 0 0', fontSize: '14px', color: 'var(--color-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hito.descripcion || emoji}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {new Date(hito.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
          {authorName && <span style={{ fontWeight: 600 }}>· {authorName}</span>}
        </p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
    </button>
  )
}

// ── Computaciones de narrativas ───────────────────────────────────────────────

function useNarrativaFrecuencia(episodios, estrategias) {
  return useMemo(() => {
    if (episodios.length < 3) return null
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(monday); start.setDate(monday.getDate() - (5 - i) * 7)
      const end = new Date(start); end.setDate(start.getDate() + 7)
      return { start, end }
    })
    const counts = weeks.map(w =>
      episodios.filter(e => { const f = new Date(e.fecha); return f >= w.start && f < w.end }).length
    )
    const current = counts[5]
    const prev5 = counts.slice(0, 5)
    const prevWeek = counts[4]
    const avg5 = prev5.reduce((s, c) => s + c, 0) / 5
    const hasHistory = prev5.some(c => c > 0)

    const estActiva = estrategias.find(e => e.fechaInicio)
    if (estActiva) {
      const inicio = new Date(estActiva.fechaInicio)
      const diasDesde = (Date.now() - inicio) / 864e5
      if (diasDesde >= 14) {
        const antes = episodios.filter(e => new Date(e.fecha) < inicio)
        const despues = episodios.filter(e => new Date(e.fecha) >= inicio)
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
    if (hasHistory && prev5.every(c => c === 0 || current < c)) return 'Mejor semana en los últimos 30 días 📈'
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
}

function useNarrativaIntensidad(episodios) {
  return useMemo(() => {
    const data = [...episodios].reverse().slice(-20)
    if (data.length < 4) return null
    const half = Math.floor(data.length / 2)
    const avg = arr => arr.reduce((s, e) => s + e.intensidad, 0) / arr.length
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
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PanelPage() {
  const { user } = useAuth()
  const { state, dispatch, setHijoActivo, profilesByUserId, isPro } = useHuella()
  const navigate = useNavigate()
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const analisisRef = useRef(null)

  const { hijo, hijos, episodios, hitos, estrategias, padreNombre } = state
  const nombreHijo = hijo?.nombre || 'tu hijo/a'
  const userName = padreNombre || user?.email?.split('@')[0] || 'tú'

  // Consejo del día: live en la campana del Hero. Visible solo si hay
  // datos suficientes. Puntito de notificación mientras no se vea.
  const consejo = useConsejoDiario({ user, hijo, episodios, hitos, estrategias })
  const [consejoAbierto, setConsejoAbierto] = useState(false)
  function abrirConsejo() {
    setConsejoAbierto(true)
    consejo.marcarVisto()
  }

  const estrategiaActiva = useMemo(
    () => (estrategias || []).find(e => e.semanaActual <= 4 && !e.completado_at),
    [estrategias]
  )

  const ultimoHitoConFoto = useMemo(
    () => hitos.find(h => h.foto_url),
    [hitos]
  )

  // ── Datos para ResumenSemanal ────────────────────────────────────────────

  const weekData = useMemo(() => {
    const now = new Date()
    const hace7  = new Date(now); hace7.setDate(now.getDate() - 7)
    const hace14 = new Date(now); hace14.setDate(now.getDate() - 14)
    const rangeEnd   = now
    const rangeStart = hace7

    const thisWeekEps = episodios.filter(e => new Date(e.fecha) >= hace7)
    const prevWeekEps = episodios.filter(e => { const f = new Date(e.fecha); return f >= hace14 && f < hace7 })

    const episodes     = thisWeekEps.length
    const prevEpisodes = prevWeekEps.length
    const episodesDelta    = episodes - prevEpisodes
    const episodesDeltaPct = prevEpisodes > 0 ? episodesDelta / prevEpisodes : 0

    const intensityAvg = episodes > 0
      ? thisWeekEps.reduce((s, e) => s + (e.intensidad || 0), 0) / episodes
      : 0
    const prevIntensityAvg = prevEpisodes > 0
      ? prevWeekEps.reduce((s, e) => s + (e.intensidad || 0), 0) / prevEpisodes
      : 0
    const intensityDelta = intensityAvg - prevIntensityAvg

    const hace30 = new Date(now); hace30.setDate(now.getDate() - 30)
    const gCounts = {}
    for (const ep of episodios.filter(e => new Date(e.fecha) >= hace30)) {
      for (const g of ep.gatillantes || []) gCounts[g] = (gCounts[g] || 0) + 1
    }
    const topG = Object.entries(gCounts).sort((a, b) => b[1] - a[1])[0]
    const topTriggerLabel = topG?.[0] || null
    const topTriggerEmoji = topTriggerLabel
      ? (GATILLANTE_EMOJIS[topTriggerLabel.toLowerCase()] || '⭐')
      : null

    const showDeltas = episodes >= 3 && prevEpisodes > 0

    return {
      rangeStart, rangeEnd,
      episodes, episodesDelta, episodesDeltaPct,
      intensityAvg, intensityDelta,
      topTriggerEmoji, topTriggerLabel,
      showDeltas,
    }
  }, [episodios])

  // ── Datos para gráficos ──────────────────────────────────────────────────

  const frecData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const dayIdx = (d.getDay() + 6) % 7
      return {
        day: DIAS_LABEL[dayIdx],
        count: episodios.filter(e => { const f = new Date(e.fecha); return f >= d && f < next }).length,
      }
    })
  }, [episodios])

  const intData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const dayIdx = (d.getDay() + 6) % 7
      const dayEps = episodios.filter(e => { const f = new Date(e.fecha); return f >= d && f < next })
      const avg = dayEps.length > 0 ? dayEps.reduce((s, e) => s + (e.intensidad || 0), 0) / dayEps.length : 0
      return { day: DIAS_LABEL[dayIdx], value: avg }
    })
  }, [episodios])

  const gatillosTop3 = useMemo(() => {
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const counts = {}
    for (const ep of episodios.filter(e => new Date(e.fecha) >= hace30)) {
      for (const g of ep.gatillantes || []) counts[g] = (counts[g] || 0) + 1
    }
    const BG = ['pill-emocion-bg', 'leaf-bg', 'info-bg']
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count], i) => ({
        emoji: GATILLANTE_EMOJIS[label.toLowerCase()] || '⭐',
        label,
        count,
        bgToken: BG[i],
      }))
  }, [episodios])

  const narrativaFrecuencia = useNarrativaFrecuencia(episodios, estrategias)
  const narrativaIntensidad = useNarrativaIntensidad(episodios)

  // ── Scroll al análisis cuando se activa ─────────────────────────────────

  useEffect(() => {
    if (loadingAnalisis) {
      setTimeout(() => {
        analisisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, [loadingAnalisis])

  async function handleAnalizarPatrones() {
    if (loadingAnalisis) return
    setLoadingAnalisis(true)
    try {
      const [texto, interpretacion] = await Promise.all([
        interpretarPatrones({ hijo, episodios }),
        detectarPatronesEstructurado({ hijo_id: hijo?.id, hijo_edad: hijo?.edad, episodios }),
      ])
      setAnalisis(texto)
      dispatch({ type: 'SET_SUGERENCIA_ESTRATEGIA', payload: interpretacion })
    } catch (e) {
      setAnalisis('Error al conectar con la IA: ' + e.message)
    } finally {
      setLoadingAnalisis(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={panelStyles.panel}>
      <BienvenidaModal />
      <GuiaPrimerosPasos totalEpisodios={episodios.length} />

      <Hero
        userName={userName}
        childName={nombreHijo}
        childAvatarUrl={hijo?.avatarUrl ?? null}
        date={new Date()}
        onProfileClick={() => navigate('/perfil')}
        bellActive={consejo.visible}
        bellHasNew={consejo.tieneConsejoNuevo}
        onBellClick={abrirConsejo}
      />

      {consejoAbierto && (
        <ConsejoDelDiaModal
          frase={consejo.frase}
          loading={consejo.loading}
          onClose={() => setConsejoAbierto(false)}
        />
      )}

      <main className={panelStyles.body}>

        {/* ── Selector de hijo (solo si hay más de uno) ── */}
        {hijos.length > 1 && (
          <div className={styles.selectorHijos}>
            {hijos.map(h => (
              <button
                key={h.id}
                type="button"
                className={`${styles.selectorChip} ${h.id === state.hijoActivoId ? styles.selectorChipActivo : ''}`}
                onClick={() => setHijoActivo(h.id)}
              >
                {h.nombre}
              </button>
            ))}
            <button
              type="button"
              className={styles.selectorAddBtn}
              onClick={() => {
                // Gate 2do hijo: free limitado a 1; Pro/Admin, ilimitados.
                if (!isPro() && hijos.length >= 1) { setShowUpgrade(true); return }
                navigate('/hijo?nuevo=true')
              }}
              aria-label="Agregar hijo"
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* ── CTA primario ── */}
        <CTAPrimary onClick={() => navigate('/nuevo')} />

        {/* ── CTA Pregúntale a Huella (visible solo con datos suficientes) ── */}
        {episodios.length >= 3 && (
          <CTAAskHuella
            onClick={handleAnalizarPatrones}
            loading={loadingAnalisis}
          />
        )}

        {episodios.length === 0 ? (

          /* ── Estado vacío ── */
          <EstadoVacio nombreHijo={nombreHijo} onRegistrar={() => navigate('/nuevo')} />

        ) : (
          <>
            {ultimoHitoConFoto && (
              <UltimoHitoCard
                hito={ultimoHitoConFoto}
                onVerLogros={() => navigate('/hitos')}
                authorName={getAuthorDisplay(ultimoHitoConFoto.user_id, profilesByUserId, user?.id)}
              />
            )}

            {/* ── Resumen semanal ── */}
            <SectionEyebrow>Esta semana · contexto</SectionEyebrow>
            <ResumenSemanal data={weekData} />

            {/* ── Gráficos (desde 3 episodios) ── */}
            {episodios.length >= 3 && (
              <>
                <SectionEyebrow>Cómo se ve la semana</SectionEyebrow>
                <ChartFrecuencia data={frecData} peakCaption={narrativaFrecuencia} />
                <ChartIntensidad data={intData} caption={narrativaIntensidad} />
                {gatillosTop3.length > 0 && <ChartGatillos data={gatillosTop3} />}
              </>
            )}

            {/* ── Estrategia activa ── */}
            {estrategiaActiva && (
              <EstrategiaActivaPanel
                estrategia={estrategiaActiva}
                onAbrir={() => navigate('/estrategias')}
                authorName={getAuthorDisplay(estrategiaActiva.userId, profilesByUserId, user?.id)}
              />
            )}

            {/* ── Análisis IA (desde 3 episodios) ── */}
            {episodios.length >= 3 && (
              <div ref={analisisRef}>
                <SectionEyebrow>Análisis de patrones</SectionEyebrow>
                <AnalisisIA
                  loading={loadingAnalisis}
                  texto={analisis}
                  onAnalizar={handleAnalizarPatrones}
                  onAccept={() => navigate('/estrategias', { state: { sugerencia_precocida: state.sugerenciaEstrategia } })}
                  onDismiss={() => setAnalisis('')}
                />
              </div>
            )}
          </>
        )}
      </main>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          tituloCustom="Cada hijo tiene su huella"
          mensajeCustom="Con Huella Pro registras a todos tus hijos y acompañas la huella única de cada uno."
        />
      )}
    </div>
  )
}
