import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import { interpretarPatrones, detectarPatronesEstructurado } from '../../services/anthropic'
import ConsejoDelDiaModal from '../../components/ui/ConsejoDelDiaModal'
import UpgradeModal from '../../components/ui/UpgradeModal'
import { useConsejoDiario } from '../../components/ui/useConsejoDiario'
import { CabeceraHijo } from '../../components/panel/CabeceraHijo'
import { TarjetaCerebro, calcularEstadoCerebro } from '../../components/panel/TarjetaCerebro'
import { BotonRegistrar } from '../../components/panel/BotonRegistrar'
import { PuertaHuella, PuertaMomentos, PuertaAcompanando } from '../../components/panel/Puertas'
import { CTAAskHuella } from '../../components/panel/CTAAskHuella'
import { ChartFrecuencia } from '../../components/panel/ChartFrecuencia'
import { ChartIntensidad } from '../../components/panel/ChartIntensidad'
import { ChartGatillos } from '../../components/panel/ChartGatillos'
import { AnalisisIA } from '../../components/panel/AnalisisIA'
import { TarjetaEntrada } from '../../components/motion/MotionPrimitives'
import { MAX_EPISODIOS_FREE } from '../estrategias/helpers'
import styles from './PanelPage.module.css'

// ── Home · Bloque B2 del rediseño ────────────────────────────────────────────
//
// El Home dejó de ser un dashboard de secciones: ahora es LA PÁGINA DEL HIJO.
// De arriba a abajo: su cara, una tarjeta que interpreta la semana, UNA acción,
// y tres puertas compactas.
//
// Regla de texto (dura): ningún párrafo visible de entrada. Los gráficos y el
// análisis IA no se borraron — viven dentro de la tarjeta central, colapsados.
//
// Lo que se fue de acá: Hero de doble avatar, CTAPrimary con subtexto,
// CTAAskHuella suelto, SectionEyebrows, ResumenSemanal como tarjeta aparte,
// EstadoVacio, AnticipoRetratoCard, GuiaPrimerosPasos como banner, la card de
// último avance y la de estrategia activa (su dato vive en las puertas), y
// CanjeCodigoBeta, que se mudó a Perfil.

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

const DIAS_LABEL = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

// Cuántas fotos entran en la rotación de la cabecera y cuántos momentos
// dibujan la mini-timeline de la puerta "Momentos".
const MAX_FOTOS_CABECERA = 5
const DIAS_PATRON_NUEVO = 3
const CUPO_AVISO_DESDE = 3   // quedan 3 o menos → aparece el chip

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
  const { state, dispatch, setHijoActivo, isPro } = useHuella()
  const navigate = useNavigate()
  const [analisis, setAnalisis] = useState('')
  const [loadingAnalisis, setLoadingAnalisis] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeCopy, setUpgradeCopy] = useState(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const detalleRef = useRef(null)

  const { hijo, hijos, episodios, hitos, estrategias, rasgos, padreNombre } = state
  const nombreHijo = hijo?.nombre || 'tu hijo/a'

  // Motor de rasgos · 4D. El aviso de rasgo nuevo (candidato o emergente) ya no
  // es una card propia: es el badge de la puerta "Su huella".
  const rasgoCandidato = (rasgos || []).some(
    (r) => r.estado === 'candidato' && r.hijoId === hijo?.id
  )
  const rasgosConfirmadosCount = (rasgos || []).filter(
    (r) => r.estado === 'confirmado' && r.hijoId === hijo?.id
  ).length
  const hayEmergente = (rasgos || []).some(
    (r) => r.estado === 'emergente' && r.hijoId === hijo?.id
  )
  const userName = padreNombre || user?.email?.split('@')[0] || 'tú'

  // Consejo del día: vive en la campana de la cabecera. Visible solo si hay
  // datos suficientes. Puntito terracota mientras no se vea.
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

  // Fotos de la cabecera: el avatar del hijo primero y después las fotos de
  // hitos más recientes. Sin ninguna, la cabecera dibuja el placeholder.
  const fotosCabecera = useMemo(() => {
    const lista = [hijo?.avatarUrl, ...hitos.filter(h => h.foto_url).map(h => h.foto_url)]
    return [...new Set(lista.filter(Boolean))].slice(0, MAX_FOTOS_CABECERA)
  }, [hijo?.avatarUrl, hitos])

  const fotoUltimoAvance = useMemo(
    () => hitos.find(h => h.foto_url)?.foto_url ?? null,
    [hitos]
  )

  // Patrones abiertos del hijo activo, del más reciente al más viejo por
  // created_at (NUNCA por gravedad ni clasificación).
  const patronesAbiertos = useMemo(
    () => (state.patrones || [])
      .filter(p => p.estado === 'abierto' && p.hijo_id === hijo?.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [state.patrones, hijo?.id]
  )

  const hayPatronNuevo = useMemo(
    () => patronesAbiertos.some(
      p => Date.now() - new Date(p.created_at).getTime() < DIAS_PATRON_NUEVO * 864e5
    ),
    [patronesAbiertos]
  )

  // ── Datos de la semana ───────────────────────────────────────────────────

  const weekData = useMemo(() => {
    const now = new Date()
    const hace7  = new Date(now); hace7.setDate(now.getDate() - 7)
    const hace14 = new Date(now); hace14.setDate(now.getDate() - 14)

    const thisWeekEps = episodios.filter(e => new Date(e.fecha) >= hace7)
    const prevWeekEps = episodios.filter(e => { const f = new Date(e.fecha); return f >= hace14 && f < hace7 })

    const episodes     = thisWeekEps.length
    const prevEpisodes = prevWeekEps.length

    const intensityAvg = episodes > 0
      ? thisWeekEps.reduce((s, e) => s + (e.intensidad || 0), 0) / episodes
      : 0
    const prevIntensityAvg = prevEpisodes > 0
      ? prevWeekEps.reduce((s, e) => s + (e.intensidad || 0), 0) / prevEpisodes
      : 0

    return {
      episodes,
      prevEpisodes,
      intensityAvg,
      intensityDelta: intensityAvg - prevIntensityAvg,
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

  // Estado de la tarjeta central y la ÚNICA frase que muestra.
  const estadoCerebro = calcularEstadoCerebro({
    totalEpisodios: episodios.length,
    episodiosSemana: weekData.episodes,
  })
  const fraseHallazgo = narrativaFrecuencia || narrativaIntensidad
  const detalleDisponible = episodios.length >= 3

  // Chip de cupo del plan free: solo cuando de verdad queda poco.
  const cupoRestante = MAX_EPISODIOS_FREE - episodios.length
  const avisoCupo = !isPro() && cupoRestante <= CUPO_AVISO_DESDE
    ? (cupoRestante > 0
        ? `Te quedan ${cupoRestante} momento${cupoRestante === 1 ? '' : 's'} del plan gratuito`
        : `Llegaste a los ${MAX_EPISODIOS_FREE} momentos del plan gratuito`)
    : null

  // ── Scroll al detalle cuando arranca el análisis ─────────────────────────

  useEffect(() => {
    if (loadingAnalisis) {
      setTimeout(() => {
        detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }, [loadingAnalisis])

  async function handleAnalizarPatrones() {
    if (loadingAnalisis) return
    setDetalleAbierto(true)
    setLoadingAnalisis(true)
    try {
      if (!isPro()) {
        // Free: gate real. Solo la primera sección (teaser); el resto es Pro y
        // ni siquiera se genera.
        const texto = await interpretarPatrones({ hijo, episodios, teaser: true })
        setAnalisis(texto)
      } else {
        const [texto, interpretacion] = await Promise.all([
          interpretarPatrones({ hijo, episodios }),
          detectarPatronesEstructurado({ hijo_id: hijo?.id, hijo_edad: hijo?.edad, episodios }),
        ])
        setAnalisis(texto)
        dispatch({ type: 'SET_SUGERENCIA_ESTRATEGIA', payload: interpretacion })
      }
    } catch (e) {
      setAnalisis('Error al conectar con la IA: ' + e.message)
    } finally {
      setLoadingAnalisis(false)
    }
  }

  // Abre el UpgradeModal con el copy del gate de análisis de patrones.
  function abrirUpgradeAnalisis() {
    setUpgradeCopy({
      titulo: 'Huella ve el cuadro completo',
      mensaje: 'Con Huella Pro desbloqueas qué merece atención en tu hijo, por qué ocurre y los próximos pasos concretos.',
    })
    setShowUpgrade(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.cabeceraBleed}>
        <CabeceraHijo
          nombreHijo={nombreHijo}
          fotos={fotosCabecera}
          padreNombre={userName}
          padreAvatarUrl={state.padreAvatarUrl}
          onFotoClick={() => navigate('/hijo')}
          onPadreClick={() => navigate('/perfil')}
          bellActive={consejo.visible}
          bellHasNew={consejo.tieneConsejoNuevo}
          onBellClick={abrirConsejo}
        />
      </div>

      {consejoAbierto && (
        <ConsejoDelDiaModal
          frase={consejo.frase}
          loading={consejo.loading}
          onClose={() => setConsejoAbierto(false)}
        />
      )}

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
              if (!isPro() && hijos.length >= 1) {
                setUpgradeCopy({
                  titulo: 'Cada hijo tiene su huella',
                  mensaje: 'Con Huella Pro registras a todos tus hijos y acompañas la huella única de cada uno.',
                })
                setShowUpgrade(true)
                return
              }
              navigate('/hijo?nuevo=true')
            }}
            aria-label="Agregar hijo"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* ── Tarjeta central: la semana interpretada ── */}
      <TarjetaCerebro
        nombreHijo={nombreHijo}
        estado={estadoCerebro}
        edadHijo={hijo?.edad ?? null}
        totalEpisodios={episodios.length}
        episodiosSemana={weekData.episodes}
        frecData={frecData}
        frase={fraseHallazgo}
        expandible={detalleDisponible}
        abierto={detalleAbierto}
        onToggle={() => setDetalleAbierto(v => !v)}
      >
        <div ref={detalleRef} className={styles.detalleInterno}>
          <CTAAskHuella onClick={handleAnalizarPatrones} loading={loadingAnalisis} />
          <ChartFrecuencia data={frecData} peakCaption={narrativaFrecuencia} />
          <ChartIntensidad data={intData} caption={narrativaIntensidad} />
          {gatillosTop3.length > 0 && <ChartGatillos data={gatillosTop3} />}
          <AnalisisIA
            loading={loadingAnalisis}
            texto={analisis}
            bloqueado={!isPro()}
            onAnalizar={handleAnalizarPatrones}
            onUpgrade={abrirUpgradeAnalisis}
            onAccept={() => navigate('/estrategias', { state: { sugerencia_precocida: state.sugerenciaEstrategia } })}
            onDismiss={() => setAnalisis('')}
          />
        </div>
      </TarjetaCerebro>

      {/* ── La única acción ── */}
      <BotonRegistrar onClick={() => navigate('/nuevo')} avisoCupo={avisoCupo} />

      {/* ── Puertas ── */}
      <div className={styles.puertas}>
        <TarjetaEntrada delay={0}>
          <PuertaHuella
            nombreHijo={nombreHijo}
            fotoHijo={hijo?.avatarUrl ?? null}
            confirmados={rasgosConfirmadosCount}
            hayNovedad={rasgoCandidato || hayEmergente}
            onClick={() => navigate('/hijo')}
          />
        </TarjetaEntrada>

        <TarjetaEntrada delay={0.06}>
          <PuertaMomentos
            total={episodios.length}
            ultimos={episodios}
            fotoAvance={fotoUltimoAvance}
            onClick={() => navigate('/historial')}
          />
        </TarjetaEntrada>

        {/* B3 · esta puerta ya no se condiciona a tener plan o patrones: con
            Estrategias fuera de la tab bar, es la única entrada a /estrategias.
            Sin nada que acompañar se muestra en modo "explorar".

            Tres destinos, porque la puerta junta dos cosas distintas: el plan
            vive en /estrategias, pero los patrones NUNCA estuvieron ahí (pared
            dura: patrones, estrategias y motor de rasgos son cosas separadas).
            Cada chip abre la lectura de SU patrón y el "+N" abre Momentos
            filtrado, que es donde se ven todos. */}
        <TarjetaEntrada delay={0.12}>
          <PuertaAcompanando
            nombreHijo={nombreHijo}
            plan={estrategiaActiva ?? null}
            patrones={patronesAbiertos}
            hayPatronNuevo={hayPatronNuevo}
            onClick={() => navigate('/estrategias')}
            onPatronClick={(id) => navigate(`/patron/${id}`)}
            onVerTodos={() => navigate('/historial', { state: { filtro: 'patrones' } })}
          />
        </TarjetaEntrada>
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          tituloCustom={upgradeCopy?.titulo}
          mensajeCustom={upgradeCopy?.mensaje}
        />
      )}
    </div>
  )
}
