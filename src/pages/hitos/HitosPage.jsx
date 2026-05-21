import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Image as ImageIcon } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import TooltipAyuda from '../../components/ui/TooltipAyuda'
import MedallaDetalleModal from '../../components/medallas/MedallaDetalleModal'
import { canModify } from '../../utils/authorDisplay'
import s from './HitosPage.module.css'

async function compressImage(file, maxSize = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Categorías reales de hitos ────────────────────────────────────────────
// El código actual (NuevoPage.jsx, HistorialPage.jsx, HijoPage.jsx) escribe
// estos 6 ids a Supabase. `frustration` viene en inglés por un typo histórico
// nunca migrado; mantengo el id real y agrego `frustracion` como fallback
// defensivo por si alguien guardó algo en español.
const categoriaLabel = {
  autorregulacion: 'Autorregulación',
  empatia:         'Empatía',
  disculpa:        'Disculpa',
  frustration:     'Frustración',
  frustracion:     'Frustración',
  social:          'Social',
  otro:            'Otro',
}

// Cada categoría va a uno de los 5 tonos del álbum según naturaleza emocional.
const tonoAlbumPorCategoria = {
  autorregulacion: 'pistachio',    // regulación / calma
  empatia:         'strawberry',   // conexión emocional
  disculpa:        'strawberry',   // reparación afectiva
  frustration:     'mocha',        // momento difícil
  frustracion:     'mocha',
  social:          'tangerine',    // alegría compartida
  otro:            'cream',        // fallback neutro
}

// Glifo de fallback cuando el hito no tiene foto. Se deriva del tono.
const GLIFO_POR_TONO_ALBUM = {
  pistachio:  '◉',
  strawberry: '♥',
  mocha:      '●',
  tangerine:  '★',
  cream:      '·',
}

// ── Helpers de fechas ─────────────────────────────────────────────────────
const fmtDiaCorto = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' })
function formatDiaCorto(iso) {
  if (!iso) return ''
  try { return fmtDiaCorto.format(new Date(iso)) } catch { return '' }
}

// ── Helpers de medallas ───────────────────────────────────────────────────

function diasActivo({ episodios, hitos }) {
  const fechas = [...episodios.map((e) => e.fecha), ...hitos.map((h) => h.fecha)]
  if (!fechas.length) return 0
  const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
  return Math.floor((Date.now() - oldest) / (24 * 60 * 60 * 1000))
}

function fechaAlDia(data, dias) {
  const fechas = [...data.episodios.map((e) => e.fecha), ...data.hitos.map((h) => h.fecha)]
  if (!fechas.length) return null
  const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
  if (Date.now() - oldest < dias * 24 * 60 * 60 * 1000) return null
  return new Date(oldest + dias * 24 * 60 * 60 * 1000).toISOString()
}

function fechaNEpisodio(episodios, n) {
  if (episodios.length < n) return null
  return episodios[episodios.length - n].fecha
}

function tieneVentana(episodios, count, dias) {
  if (episodios.length < count) return null
  const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
  const ventanaMs = dias * 24 * 60 * 60 * 1000
  for (let i = count - 1; i < sorted.length; i++) {
    const base = new Date(sorted[i].fecha).getTime()
    const inWindow = sorted.filter(
      (e) => new Date(e.fecha).getTime() >= base - ventanaMs && new Date(e.fecha).getTime() <= base
    )
    if (inWindow.length >= count) return sorted[i].fecha
  }
  return null
}

function sieteDiasConsecutivos(episodios) {
  if (episodios.length < 7) return null
  const dias = [...new Set(episodios.map((e) => e.fecha.slice(0, 10)))].sort()
  let streak = 1
  for (let i = 1; i < dias.length; i++) {
    const diff = (new Date(dias[i]) - new Date(dias[i - 1])) / 864e5
    if (diff === 1) {
      streak++
      if (streak >= 7) return dias[i]
    } else {
      streak = 1
    }
  }
  return null
}

// ── Definición de niveles ─────────────────────────────────────────────────
// Mantiene las 33 medallas actuales con su lógica de check/fechaLogro intacta.
// Se sustituye el campo `color` hex por `tono` semántico (5 paletas en index.css).

const NIVELES = [
  {
    nivel: 1,
    subtitulo: 'Primeros pasos',
    umbral: 7,
    badges: [
      {
        id: 'primer_registro',
        emoji: '🌟',
        titulo: 'Primer paso',
        desc: '1 episodio registrado',
        frase: 'Registrar ya es un acto de amor hacia tu hijo.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 1,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 1),
      },
      {
        id: 'cinco_registros',
        emoji: '📊',
        titulo: 'Observador',
        desc: '5 episodios registrados',
        frase: 'Observar sin juzgar es la primera herramienta de todo buen padre.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 5,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 5),
      },
      {
        id: 'diez_registros',
        emoji: '🔍',
        titulo: 'Analista',
        desc: '10 episodios registrados',
        frase: 'Ya estás viendo patrones que antes eran invisibles.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 10,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 10),
      },
      {
        id: 'primer_hito',
        emoji: '💛',
        titulo: 'Primer avance',
        desc: '1 avance positivo registrado',
        frase: 'Notar los logros pequeños es lo que los hace crecer.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 1,
        fechaLogro: ({ hitos }) => hitos.length >= 1 ? hitos[hitos.length - 1].fecha : null,
      },
      {
        id: 'cinco_hitos',
        emoji: '🏅',
        titulo: 'Coleccionista',
        desc: '5 avances positivos registrados',
        frase: 'Cada avance registrado le dice: te veo, te valoro.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 5,
        fechaLogro: ({ hitos }) => hitos.length >= 5 ? hitos[hitos.length - 5].fecha : null,
      },
      {
        id: 'primera_estrategia',
        emoji: '🎯',
        titulo: 'Estratega',
        desc: '1 estrategia creada',
        frase: 'Tener un plan cambia todo. Lo más difícil ya pasó.',
        tono: 'constancia',
        check: ({ estrategias }) => estrategias.length >= 1,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 1 ? estrategias[estrategias.length - 1].fechaInicio : null,
      },
      {
        id: 'plan_completo',
        emoji: '🏆',
        titulo: '4 semanas',
        desc: 'Completaste un plan de 4 semanas',
        frase: 'Cuatro semanas sostenidas. Eso es transformación real.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.some((e) => e.semanaActual >= 4),
        fechaLogro: ({ estrategias }) => {
          const e = estrategias.find((e) => e.semanaActual >= 4)
          return e ? e.fechaInicio : null
        },
      },
      {
        id: 'mes_activo',
        emoji: '📅',
        titulo: 'Un mes',
        desc: '30 días usando Huella',
        frase: 'Un mes de presencia consciente. Extraordinario.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 30,
        fechaLogro: (data) => fechaAlDia(data, 30),
      },
      {
        id: 'semana_activa',
        emoji: '🔥',
        titulo: 'Semana activa',
        desc: '7 episodios en 7 días',
        frase: 'Registrar en momentos difíciles es valentía pura.',
        tono: 'constancia',
        check: ({ episodios }) => tieneVentana(episodios, 7, 7) !== null,
        fechaLogro: ({ episodios }) => tieneVentana(episodios, 7, 7),
      },
      {
        id: 'tres_estrategias',
        emoji: '🌈',
        titulo: 'Multihabilidad',
        desc: '3 estrategias creadas',
        frase: 'Tres dimensiones distintas. Eso es comprensión profunda.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.length >= 3,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 3 ? estrategias[estrategias.length - 3].fechaInicio : null,
      },
      {
        id: 'ciclo_completo',
        emoji: '🔄',
        titulo: 'Ciclo completo',
        desc: '1 seguimiento post-episodio realizado',
        frase: 'Registraste, reflexionaste y volviste a revisar. Eso es lo que transforma.',
        tono: 'calma',
        check: ({ checkinsCount }) => checkinsCount >= 1,
        fechaLogro: () => null,
      },
      {
        id: 'reflexivo',
        emoji: '🪞',
        titulo: 'Reflexivo',
        desc: '5 seguimientos post-episodio realizados',
        frase: 'Revisar lo que pasó es una de las herramientas más poderosas que tienes.',
        tono: 'calma',
        check: ({ checkinsCount }) => checkinsCount >= 5,
        fechaLogro: () => null,
      },
      {
        id: 'constante_7',
        emoji: '📆',
        titulo: 'Constante',
        desc: '7 días consecutivos con registros',
        frase: 'Siete días seguidos. La constancia ya es parte de quién eres.',
        tono: 'constancia',
        check: ({ episodios }) => sieteDiasConsecutivos(episodios) !== null,
        fechaLogro: ({ episodios }) => sieteDiasConsecutivos(episodios),
      },
      {
        id: 'comprometido_plan',
        emoji: '💼',
        titulo: 'Comprometido',
        desc: 'Semana 2 de una estrategia alcanzada',
        frase: 'Seguiste adelante cuando era difícil. Eso es lo que cambia todo.',
        tono: 'constancia',
        check: ({ estrategias }) => estrategias.some((e) => e.semanaActual >= 2),
        fechaLogro: ({ estrategias }) => {
          const e = estrategias.find((e) => e.semanaActual >= 2)
          return e ? e.fechaInicio : null
        },
      },
    ],
  },
  {
    nivel: 2,
    subtitulo: 'En profundidad',
    umbral: 7,
    badges: [
      {
        id: 'veinticinco_registros',
        emoji: '💎',
        titulo: 'Experto',
        desc: '25 episodios registrados',
        frase: 'Te has convertido en el mayor experto en tu propio hijo.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 25,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 25),
      },
      {
        id: 'cincuenta_registros',
        emoji: '🎓',
        titulo: 'Profundo',
        desc: '50 episodios registrados',
        frase: 'Pocos padres llegan tan lejos. Eres excepcional.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 50,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 50),
      },
      {
        id: 'dos_meses',
        emoji: '🌿',
        titulo: 'Constancia',
        desc: '60 días usando Huella',
        frase: 'La constancia no se improvisa, se construye día a día.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 60,
        fechaLogro: (data) => fechaAlDia(data, 60),
      },
      {
        id: 'diez_hitos',
        emoji: '🤝',
        titulo: 'Mentor',
        desc: '10 avances positivos registrados',
        frase: 'Llevas un registro de amor que tu hijo un día entenderá.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 10,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 10 ? hitos[hitos.length - 10].fecha : null,
      },
      {
        id: 'cinco_estrategias',
        emoji: '⚡',
        titulo: 'Arquitecto',
        desc: '5 estrategias creadas',
        frase: 'Estás construyendo una arquitectura emocional sólida.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.length >= 5,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 5 ? estrategias[estrategias.length - 5].fechaInicio : null,
      },
      {
        id: 'dos_planes',
        emoji: '🎯',
        titulo: 'Doble logro',
        desc: '2 planes de 4 semanas completados',
        frase: 'Sabes que el cambio requiere tiempo y lo estás dando.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.filter((e) => e.semanaActual >= 4).length >= 2,
        fechaLogro: ({ estrategias }) => {
          const c = [...estrategias]
            .filter((e) => e.semanaActual >= 4)
            .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
          return c.length >= 2 ? c[1].fechaInicio : null
        },
      },
      {
        id: 'cinco_tipos',
        emoji: '🧩',
        titulo: 'Diversidad',
        desc: 'Episodios de 5 tipos distintos',
        frase: 'Ves a tu hijo desde 5 ángulos distintos. Eso es comprensión.',
        tono: 'calma',
        check: ({ episodios }) => new Set(episodios.map((e) => e.tipo)).size >= 5,
        fechaLogro: ({ episodios }) => {
          const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          const tipos = new Set()
          for (const ep of sorted) {
            tipos.add(ep.tipo)
            if (tipos.size >= 5) return ep.fecha
          }
          return null
        },
      },
      {
        id: 'catorce_dias',
        emoji: '🗓️',
        titulo: 'Comprometido',
        desc: 'Registros en 14 días distintos',
        frase: 'Tu compromiso es consistente y real.',
        tono: 'constancia',
        check: ({ episodios }) => new Set(episodios.map((e) => e.fecha.slice(0, 10))).size >= 14,
        fechaLogro: ({ episodios }) => {
          const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          const dias = new Set()
          for (const ep of sorted) {
            dias.add(ep.fecha.slice(0, 10))
            if (dias.size >= 14) return ep.fecha
          }
          return null
        },
      },
      {
        id: 'tres_meses',
        emoji: '🏔️',
        titulo: 'Tres meses',
        desc: '90 días usando Huella',
        frase: '90 días. El cambio que buscabas ya es permanente.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 90,
        fechaLogro: (data) => fechaAlDia(data, 90),
      },
    ],
  },
  {
    nivel: 3,
    subtitulo: 'Maestría',
    umbral: 7,
    badges: [
      {
        id: 'cien_registros',
        emoji: '👑',
        titulo: 'Maestro',
        desc: '100 episodios registrados',
        frase: 'Nadie conoce mejor a tu hijo que tú.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 100,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 100),
      },
      {
        id: 'veinte_hitos',
        emoji: '🔮',
        titulo: 'Visionario',
        desc: '20 avances positivos registrados',
        frase: 'Una biblioteca de momentos que valen oro.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 20,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 20 ? hitos[hitos.length - 20].fecha : null,
      },
      {
        id: 'cinco_planes',
        emoji: '🌊',
        titulo: 'Fluidez',
        desc: '5 planes de 4 semanas completados',
        frase: 'Tu disciplina es inspiradora. Cinco planes sostenidos.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.filter((e) => e.semanaActual >= 4).length >= 5,
        fechaLogro: ({ estrategias }) => {
          const c = [...estrategias]
            .filter((e) => e.semanaActual >= 4)
            .sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio))
          return c.length >= 5 ? c[4].fechaInicio : null
        },
      },
      {
        id: 'cuatro_meses',
        emoji: '🦋',
        titulo: 'Transformación',
        desc: '120 días usando Huella',
        frase: 'Lo que cambió no solo es tu hijo, también eres tú.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 120,
        fechaLogro: (data) => fechaAlDia(data, 120),
      },
      {
        id: 'ciento_cincuenta',
        emoji: '🧬',
        titulo: 'Científico',
        desc: '150 episodios registrados',
        frase: 'Eres el científico de tu propia familia.',
        tono: 'base',
        check: ({ episodios }) => episodios.length >= 150,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 150),
      },
      {
        id: 'seis_meses',
        emoji: '⭐',
        titulo: 'Dedicado',
        desc: '180 días usando Huella',
        frase: 'Estás redefiniendo lo que significa ser padre o madre.',
        tono: 'constancia',
        check: (data) => diasActivo(data) >= 180,
        fechaLogro: (data) => fechaAlDia(data, 180),
      },
      {
        id: 'siete_tipos',
        emoji: '🎪',
        titulo: 'Explorador',
        desc: 'Episodios de 7 tipos distintos',
        frase: 'Tu hijo no tiene secretos para ti.',
        tono: 'calma',
        check: ({ episodios }) => new Set(episodios.map((e) => e.tipo)).size >= 7,
        fechaLogro: ({ episodios }) => {
          const sorted = [...episodios].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          const tipos = new Set()
          for (const ep of sorted) {
            tipos.add(ep.tipo)
            if (tipos.size >= 7) return ep.fecha
          }
          return null
        },
      },
      {
        id: 'diez_estrategias',
        emoji: '💫',
        titulo: 'Decano',
        desc: '10 estrategias creadas',
        frase: 'Eres un guía para toda tu familia.',
        tono: 'estrella',
        heroica: true,
        check: ({ estrategias }) => estrategias.length >= 10,
        fechaLogro: ({ estrategias }) =>
          estrategias.length >= 10 ? estrategias[estrategias.length - 10].fechaInicio : null,
      },
      {
        id: 'veinticinco_hitos',
        emoji: '🌺',
        titulo: 'Florecimiento',
        desc: '25 avances positivos registrados',
        frase: 'Una historia de amor que ningún otro padre documenta así.',
        tono: 'celebracion',
        check: ({ hitos }) => hitos.length >= 25,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 25 ? hitos[hitos.length - 25].fecha : null,
      },
      {
        id: 'leyenda',
        emoji: '🏅',
        titulo: 'Leyenda',
        desc: '30 avances positivos registrados',
        frase: 'Has llegado al nivel más alto. Eres extraordinario/a.',
        tono: 'estrella',
        heroica: true,
        check: ({ hitos }) => hitos.length >= 30,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 30 ? hitos[hitos.length - 30].fecha : null,
      },
    ],
  },
]

const TOTAL_MEDALLAS = NIVELES.reduce((acc, n) => acc + n.badges.length, 0)

// Submensaje del header de cada nivel.
function getSubmensaje(nivel, desbloqueadasCount, nivelBloqueado) {
  if (nivelBloqueado) return 'Por descubrir'
  if (desbloqueadasCount === 0) return 'Empieza aquí'
  if (desbloqueadasCount === nivel.badges.length) return 'Completado'
  return 'En curso'
}

// ── Mapeo de tono → clase CSS de medalla ──────────────────────────────────
const tonoCls = {
  estrella:    s.tEstrella,
  celebracion: s.tCelebracion,
  calma:       s.tCalma,
  constancia:  s.tConstancia,
  base:        s.tBase,
}

const tonoAlbumCls = {
  mocha:      s.tMocha,
  tangerine:  s.tTangerine,
  pistachio:  s.tPistachio,
  strawberry: s.tStrawberry,
  cream:      s.tCream,
}

// ── SVG por tono ──────────────────────────────────────────────────────────
function MedalIcon({ tono, abierta }) {
  if (!abierta) {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" />
      </svg>
    )
  }
  switch (tono) {
    case 'estrella':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.5L22 10l-5.4 4.7L18 22l-6-3.6L6 22l1.4-7.3L2 10l7.1-1.5L12 2z" />
        </svg>
      )
    case 'celebracion':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7-4.8-9.3-9C0.8 7.6 4 4 8 5.5c1.6.6 3 1.9 4 3.4 1-1.5 2.4-2.8 4-3.4 4-1.5 7.2 2.1 5.3 6.5C19 16.2 12 21 12 21z" />
        </svg>
      )
    case 'calma':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-3 4.5-6 8-6 11.5A6 6 0 0 0 12 21a6 6 0 0 0 6-6.5C18 11 15 7.5 12 3z" />
        </svg>
      )
    case 'constancia':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
        </svg>
      )
    case 'base':
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}

// ── Página ────────────────────────────────────────────────────────────────

export default function HitosPage() {
  const { state, updateHitoFoto, getCheckinsHechos } = useHuella()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabActiva = searchParams.get('tab') === 'album' ? 'album' : 'medallas'
  const highlight = searchParams.get('highlight')

  const [checkinsCount, setCheckinsCount] = useState(0)
  const [subiendoHitoId, setSubiendoHitoId] = useState(null)
  const [errorUpload, setErrorUpload] = useState('')
  const [medallaAbierta, setMedallaAbierta] = useState(null)
  const uploadInputRef = useRef(null)
  const targetHitoIdRef = useRef(null)

  useEffect(() => {
    getCheckinsHechos().then((set) => setCheckinsCount(set.size))
  }, [])

  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => {
      document.getElementById(highlight)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    return () => clearTimeout(timer)
  }, [highlight])

  const { episodios, hitos, estrategias, hijo } = state
  const dataBadge = { episodios, hitos, estrategias, checkinsCount }

  // Tracking de medallas nuevas (las recién desbloqueadas que el padre aún no vio).
  const storageKey = `huella_badges_vistos_${user?.id || 'anon'}`
  const badgesVistosRef = useRef(null)
  if (badgesVistosRef.current === null) {
    try {
      badgesVistosRef.current = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch { badgesVistosRef.current = new Set() }
  }

  const todosLosBadges = NIVELES.flatMap((n) => n.badges)
  const desbloqueadosActuales = new Set(
    todosLosBadges.filter((b) => b.check(dataBadge)).map((b) => b.id)
  )
  const badgesNuevos = new Set(
    [...desbloqueadosActuales].filter((id) => !badgesVistosRef.current.has(id))
  )

  // La primera medalla nueva del set se trata como "medallaReciente" para el glow.
  const medallaReciente = badgesNuevos.size > 0
    ? { id: [...badgesNuevos][0] }
    : null

  // Marcar como vistos al salir (o tras 4s) — preserva la lógica anterior.
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify([...desbloqueadosActuales])) }
      catch {}
    }, 4000)
    return () => {
      clearTimeout(timer)
      try { localStorage.setItem(storageKey, JSON.stringify([...desbloqueadosActuales])) }
      catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Determinar niveles bloqueados.
  const nivelesConEstado = NIVELES.map((nivel, i) => {
    if (i === 0) return { ...nivel, bloqueado: false }
    const previo = NIVELES[i - 1]
    const desbloqueadosPrevios = previo.badges.filter((b) => b.check(dataBadge)).length
    return {
      ...nivel,
      bloqueado: desbloqueadosPrevios < previo.umbral,
      umbralPrevio: previo.umbral,
      desbloqueadosPrevios,
    }
  })

  // Nivel actual = último no bloqueado.
  const nivelActualIdx = nivelesConEstado.reduce(
    (acc, n, i) => (!n.bloqueado ? i : acc),
    0
  )
  const nivelActualSrc = nivelesConEstado[nivelActualIdx]
  const nivelActual = { n: nivelActualSrc.nivel, nombre: nivelActualSrc.subtitulo }

  const totalDesbloqueados = desbloqueadosActuales.size
  const esVacio = totalDesbloqueados === 0

  // Álbum: todos los hitos del hijo, ordenados desc por fecha.
  const album = useMemo(
    () => [...hitos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [hitos]
  )

  function tabChange(tab) {
    const nuevos = new URLSearchParams(searchParams)
    nuevos.set('tab', tab)
    setSearchParams(nuevos)
  }

  function handleAlbumClick(item) {
    if (item.foto_url) {
      window.open(item.foto_url, '_blank')
      return
    }
    if (!canModify(item.user_id, user?.id)) return
    targetHitoIdRef.current = item.id
    setErrorUpload('')
    uploadInputRef.current?.click()
  }

  async function handleAlbumUpload(e) {
    const file = e.target.files?.[0]
    const hitoId = targetHitoIdRef.current
    e.target.value = ''
    if (!file || !hitoId || !user) return
    setSubiendoHitoId(hitoId)
    setErrorUpload('')
    try {
      const blob = await compressImage(file)
      const path = `${user.id}/${hitoId}.jpg`
      const { error } = await supabase.storage
        .from('momentos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('momentos').getPublicUrl(path)
      await updateHitoFoto(hitoId, `${data.publicUrl}?t=${Date.now()}`)
    } catch {
      setErrorUpload('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setSubiendoHitoId(null)
      targetHitoIdRef.current = null
    }
  }

  return (
    <div className={s.page}>
      <header className={`${s.hero} ${esVacio ? s.heroEmpty : ''}`}>
        <div className={s.heroTop}>
          <h1 className={s.heroTitle}>
            Logros
            <TooltipAyuda texto="Aquí celebramos tu constancia. Cada episodio registrado es un paso hacia entender mejor a tu hijo/a." />
          </h1>
          <button
            className={s.heroIconBtn}
            onClick={() => navigate('/nuevo', { state: { vistaInicial: 'hito' } })}
            aria-label={`Registrar avance de ${hijo?.nombre || 'tu hijo/a'}`}
          >
            <Plus size={18} />
          </button>
        </div>

        <p className={s.heroLede}>
          {esVacio
            ? `La huella que ${hijo?.nombre || 'tu hijo/a'} va dejando se enciende con tu primer registro.`
            : `La huella que ${hijo?.nombre || 'tu hijo/a'} va dejando, encendiéndose poco a poco.`}
        </p>

        <div className={s.heroStats}>
          <div className={s.heroStat}>
            <span className={s.heroStatNum}>
              {totalDesbloqueados} <small>de {TOTAL_MEDALLAS}</small>
            </span>
            <span className={s.heroStatLbl}>Medallas</span>
          </div>
          <div className={s.heroStat}>
            <span className={`${s.heroStatNum} ${s.calm}`}>
              {esVacio ? 'Empezando' : `Nivel ${nivelActual.n}`}
            </span>
            <span className={s.heroStatLbl}>
              {esVacio ? 'Aún sin nivel' : nivelActual.nombre}
            </span>
          </div>
        </div>
      </header>

      <div className={s.tabs} role="tablist">
        <button
          role="tab"
          id="tab-medallas"
          className={`${s.tab} ${tabActiva === 'medallas' ? s.on : ''}`}
          onClick={() => tabChange('medallas')}
        >
          Medallas <span className={s.tabCt}>{totalDesbloqueados}</span>
        </button>
        <button
          role="tab"
          id="tab-album"
          className={`${s.tab} ${tabActiva === 'album' ? s.on : ''}`}
          onClick={() => tabChange('album')}
        >
          Álbum <span className={s.tabCt}>{album.length}</span>
        </button>
      </div>

      {tabActiva === 'medallas' && (
        <div className={s.body} role="tabpanel" aria-labelledby="tab-medallas">
          {nivelesConEstado.map((nivel) => {
            const desbloqueadasN = nivel.badges.filter((b) => desbloqueadosActuales.has(b.id))
            const desbloqueadasCt = desbloqueadasN.length
            const nivelBloqueado = nivel.bloqueado
            const faltan = nivel.umbralPrevio
              ? Math.max(0, nivel.umbralPrevio - (nivel.desbloqueadosPrevios ?? 0))
              : 0
            return (
              <section
                key={nivel.nivel}
                className={`${s.nivel} ${nivelBloqueado ? s.nivelLocked : ''}`}
                aria-labelledby={`nivel-${nivel.nivel}`}
              >
                <div className={s.nivelHead}>
                  <div className={s.levelBadge}>{nivel.nivel}</div>
                  <div className={s.nivelLbl}>
                    <h2 id={`nivel-${nivel.nivel}`} className={s.nivelName}>
                      {nivel.subtitulo}
                    </h2>
                    <span className={s.nivelSub}>
                      {getSubmensaje(nivel, desbloqueadasCt, nivelBloqueado)}
                    </span>
                  </div>
                  {!nivelBloqueado && (
                    <span className={s.nivelPct}>
                      {desbloqueadasCt}<small>/{nivel.badges.length}</small>
                    </span>
                  )}
                </div>

                {!nivelBloqueado && (
                  <div
                    className={s.nivelBar}
                    role="progressbar"
                    aria-valuenow={desbloqueadasCt}
                    aria-valuemax={nivel.badges.length}
                  >
                    <i style={{ width: `${(desbloqueadasCt / nivel.badges.length) * 100}%` }} />
                  </div>
                )}

                {!nivelBloqueado ? (
                  <div className={s.grid3} aria-live="polite">
                    {nivel.badges.map((m) => {
                      const abierta = desbloqueadosActuales.has(m.id)
                      const esNueva = m.id === medallaReciente?.id
                      return (
                        <div
                          key={m.id}
                          id={m.id}
                          className={[
                            s.med,
                            abierta ? tonoCls[m.tono] : s.locked,
                            esNueva ? s.nueva : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          tabIndex={abierta ? 0 : undefined}
                          role={abierta ? 'button' : undefined}
                          aria-label={abierta ? `Ver detalle de ${m.titulo}` : undefined}
                          style={abierta ? { cursor: 'pointer' } : undefined}
                          onClick={abierta ? (e) => { e.currentTarget.focus(); setMedallaAbierta(m) } : undefined}
                          onKeyDown={abierta ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setMedallaAbierta(m)
                            }
                          } : undefined}
                        >
                          <div className={s.disc}>
                            <MedalIcon tono={m.tono} abierta={abierta} />
                          </div>
                          <span className={s.medName}>
                            {abierta ? m.titulo : 'Por descubrir'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className={s.lockMsg}>
                    Llega a este nivel completando{' '}
                    <strong>
                      {faltan === 1 ? '1 medalla más' : `${faltan} medallas más`}
                    </strong>{' '}
                    del nivel {nivel.nivel - 1}.
                  </p>
                )}
              </section>
            )
          })}
        </div>
      )}

      {medallaAbierta && (
        <MedallaDetalleModal
          medalla={medallaAbierta}
          dataBadge={dataBadge}
          onClose={() => setMedallaAbierta(null)}
        />
      )}

      {tabActiva === 'album' && (
        <div className={s.body} role="tabpanel" aria-labelledby="tab-album">
          {album.length === 0 ? (
            <div className={s.albumEmpty}>
              <div className={s.ic} aria-hidden="true">
                <ImageIcon size={22} />
              </div>
              <h2>Aquí va a vivir el álbum de {hijo?.nombre || 'tu hijo/a'}.</h2>
              <p>
                Cada vez que registres un <strong>avance</strong> de {hijo?.nombre || 'tu hijo/a'}, se queda guardado acá.
              </p>
            </div>
          ) : (
            <>
              {errorUpload && <p className={s.albumError}>{errorUpload}</p>}
              <div className={s.album}>
                {album.map((item) => {
                  const tono = tonoAlbumPorCategoria[item.categoria] ?? 'cream'
                  const label = categoriaLabel[item.categoria] ?? item.categoria
                  const glifo = GLIFO_POR_TONO_ALBUM[tono] ?? '·'
                  const subiendo = subiendoHitoId === item.id
                  return (
                    <article
                      key={item.id}
                      className={[s.albumItem, tonoAlbumCls[tono]].filter(Boolean).join(' ')}
                      onClick={() => !subiendo && handleAlbumClick(item)}
                    >
                      {item.foto_url ? (
                        <img
                          src={item.foto_url}
                          alt={item.descripcion || label}
                          className={s.albumPhoto}
                        />
                      ) : (
                        <div className={s.albumPlaceholder} aria-hidden="true">
                          {subiendo ? '…' : glifo}
                        </div>
                      )}
                      <span className={s.albumBadge}>{label}</span>
                      <time className={s.albumDay} dateTime={item.fecha}>
                        {formatDiaCorto(item.fecha)}
                      </time>
                    </article>
                  )
                })}
              </div>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAlbumUpload}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
