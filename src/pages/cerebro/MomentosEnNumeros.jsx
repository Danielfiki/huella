import React, { useMemo } from 'react'
import { useHuella } from '../../context/HuellaContext'
import CardPlegable from '../../components/ui/CardPlegable'
import { ChartFrecuencia } from '../../components/panel/ChartFrecuencia'
import { ChartIntensidad } from '../../components/panel/ChartIntensidad'
import { ChartGatillos } from '../../components/panel/ChartGatillos'
import styles from './MomentosEnNumeros.module.css'

// "Sus momentos en números": los tres gráficos que vivían plegados en la
// tarjeta del cerebro del Home (frecuencia de la semana, intensidad y los
// gatillantes del mes). Se mudaron al final del cerebro cuando el Home quedó
// en tres bloques. Plegado y cerrado, y solo con 3+ episodios, igual que antes.
//
// Todo lo de abajo (emojis, días, narrativas y cálculos) se trajo tal cual
// desde PanelPage. Las narrativas eran también la frase de la semana del Home;
// esa frase se fue, pero acá siguen como pie de sus gráficos.

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


// ── Computaciones de narrativas ───────────────────────────────────────────────
//
// Estas dos son el pie de los gráficos de frecuencia e intensidad. Antes eran
// también la frase de la tarjeta central del Home, que se fue. No hay prompt
// de IA detrás: se arman acá, locales, y siguen la voz de siempre: el niño por
// su nombre, sin cifras dentro de la frase, nunca lenguaje estadístico.
//
// Las condiciones siguen midiendo lo mismo que siempre — promedios, semanas
// comparadas, tasas antes/después de la estrategia. Lo que cambió es que ese
// cálculo ya NO se dice en voz alta: la frase habla del niño por su nombre y
// no muestra ni una cifra. El dato duro ya está en el número grande y en las
// barras; la frase es la lectura, no el reporte.

function useNarrativaFrecuencia(episodios, estrategias, nombre) {
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
            return `Desde que empezaste, ${nombre} viene teniendo semanas más livianas.`
          }
        }
      }
    }

    if (current === 0) return `Una semana tranquila para ${nombre}.`
    if (hasHistory && prev5.every(c => c === 0 || current < c)) return `La semana más suave de ${nombre} en un buen rato.`
    if (prevWeek > 0 && current <= prevWeek * 0.6) {
      return `${nombre} tuvo una semana más liviana que la anterior.`
    }
    if (avg5 > 0 && current < avg5 * 0.85) return `La semana de ${nombre} vino más calmada de lo habitual.`
    if (avg5 > 0 && current > avg5 * 1.2) return `Esta semana pesó más para ${nombre}.`
    if (prevWeek > 0 && current > prevWeek) {
      return `${nombre} está teniendo más momentos que la semana pasada.`
    }
    return `La semana de ${nombre} va parecida a las anteriores.`
  }, [episodios, estrategias, nombre])
}

function useNarrativaIntensidad(episodios, nombre) {
  return useMemo(() => {
    const data = [...episodios].reverse().slice(-20)
    if (data.length < 4) return null
    const half = Math.floor(data.length / 2)
    const avg = arr => arr.reduce((s, e) => s + e.intensidad, 0) / arr.length
    const firstAvg = avg(data.slice(0, half))
    const secondAvg = avg(data.slice(-half))
    const delta = secondAvg - firstAvg
    if (delta <= -0.4) return `Los momentos de ${nombre} vienen más suaves.`
    if (delta >= 0.5)  return `Los momentos de ${nombre} vienen llegando más fuertes.`
    return `${nombre} viene sosteniendo un ritmo parejo.`
  }, [episodios, nombre])
}

export default function MomentosEnNumeros() {
  const { state } = useHuella()
  const episodios = state.episodios || []
  const estrategias = state.estrategias || []
  const nombreHijo = state.hijo?.nombre || 'tu hijo/a'

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

  const narrativaFrecuencia = useNarrativaFrecuencia(episodios, estrategias, nombreHijo)
  const narrativaIntensidad = useNarrativaIntensidad(episodios, nombreHijo)

  if (episodios.length < 3) return null

  return (
    <CardPlegable titulo="Sus momentos en números" className={styles.card}>
      <div className={styles.detalle}>
        <ChartFrecuencia data={frecData} peakCaption={narrativaFrecuencia} />
        <ChartIntensidad data={intData} caption={narrativaIntensidad} />
        {gatillosTop3.length > 0 && <ChartGatillos data={gatillosTop3} />}
      </div>
    </CardPlegable>
  )
}
