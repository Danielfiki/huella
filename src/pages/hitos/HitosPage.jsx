import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Lock, Camera } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import TooltipAyuda from '../../components/ui/TooltipAyuda'
import { canModify } from '../../utils/authorDisplay'
import styles from './HitosPage.module.css'

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

const CATEGORIAS = [
  { id: 'autorregulacion', label: 'Se calmó solo',   emoji: '🌱' },
  { id: 'empatia',         label: 'Mostró empatía',  emoji: '💛' },
  { id: 'disculpa',        label: 'Pidió disculpas', emoji: '🤝' },
  { id: 'frustration',     label: 'Toleró un "no"',  emoji: '💪' },
  { id: 'social',          label: 'Avance social',   emoji: '👫' },
  { id: 'otro',            label: 'Otro avance',     emoji: '⭐' },
]

// ── Helpers ───────────────────────────────────────────────────────────────

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
  // episodios sorted newest-first; n-th registered = index length-n
  return episodios[episodios.length - n].fecha
}

function tieneVentana(episodios, count, dias) {
  if (episodios.length < count) return null // returns date or null
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
        color: '#f59e0b',
        check: ({ episodios }) => episodios.length >= 1,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 1),
      },
      {
        id: 'cinco_registros',
        emoji: '📊',
        titulo: 'Observador',
        desc: '5 episodios registrados',
        frase: 'Observar sin juzgar es la primera herramienta de todo buen padre.',
        color: '#3b82f6',
        check: ({ episodios }) => episodios.length >= 5,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 5),
      },
      {
        id: 'diez_registros',
        emoji: '🔍',
        titulo: 'Analista',
        desc: '10 episodios registrados',
        frase: 'Ya estás viendo patrones que antes eran invisibles.',
        color: '#8b5cf6',
        check: ({ episodios }) => episodios.length >= 10,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 10),
      },
      {
        id: 'primer_hito',
        emoji: '💛',
        titulo: 'Primer avance',
        desc: '1 avance positivo registrado',
        frase: 'Notar los logros pequeños es lo que los hace crecer.',
        color: '#eab308',
        check: ({ hitos }) => hitos.length >= 1,
        fechaLogro: ({ hitos }) => hitos.length >= 1 ? hitos[hitos.length - 1].fecha : null,
      },
      {
        id: 'cinco_hitos',
        emoji: '🏅',
        titulo: 'Coleccionista',
        desc: '5 avances positivos registrados',
        frase: 'Cada avance registrado le dice: te veo, te valoro.',
        color: '#f97316',
        check: ({ hitos }) => hitos.length >= 5,
        fechaLogro: ({ hitos }) => hitos.length >= 5 ? hitos[hitos.length - 5].fecha : null,
      },
      {
        id: 'primera_estrategia',
        emoji: '🎯',
        titulo: 'Estratega',
        desc: '1 estrategia creada',
        frase: 'Tener un plan cambia todo. Lo más difícil ya pasó.',
        color: '#10b981',
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
        color: '#f59e0b',
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
        color: '#6366f1',
        check: (data) => diasActivo(data) >= 30,
        fechaLogro: (data) => fechaAlDia(data, 30),
      },
      {
        id: 'semana_activa',
        emoji: '🔥',
        titulo: 'Semana activa',
        desc: '7 episodios en 7 días',
        frase: 'Registrar en momentos difíciles es valentía pura.',
        color: '#ef4444',
        check: ({ episodios }) => tieneVentana(episodios, 7, 7) !== null,
        fechaLogro: ({ episodios }) => tieneVentana(episodios, 7, 7),
      },
      {
        id: 'tres_estrategias',
        emoji: '🌈',
        titulo: 'Multihabilidad',
        desc: '3 estrategias creadas',
        frase: 'Tres dimensiones distintas. Eso es comprensión profunda.',
        color: '#06b6d4',
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
        color: '#0ea5e9',
        check: ({ checkinsCount }) => checkinsCount >= 1,
        fechaLogro: () => null,
      },
      {
        id: 'reflexivo',
        emoji: '🪞',
        titulo: 'Reflexivo',
        desc: '5 seguimientos post-episodio realizados',
        frase: 'Revisar lo que pasó es una de las herramientas más poderosas que tienes.',
        color: '#8b5cf6',
        check: ({ checkinsCount }) => checkinsCount >= 5,
        fechaLogro: () => null,
      },
      {
        id: 'constante_7',
        emoji: '📆',
        titulo: 'Constante',
        desc: '7 días consecutivos con registros',
        frase: 'Siete días seguidos. La constancia ya es parte de quién eres.',
        color: '#f97316',
        check: ({ episodios }) => sieteDiasConsecutivos(episodios) !== null,
        fechaLogro: ({ episodios }) => sieteDiasConsecutivos(episodios),
      },
      {
        id: 'comprometido_plan',
        emoji: '💼',
        titulo: 'Comprometido',
        desc: 'Semana 2 de una estrategia alcanzada',
        frase: 'Seguiste adelante cuando era difícil. Eso es lo que cambia todo.',
        color: '#10b981',
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
        color: '#06b6d4',
        check: ({ episodios }) => episodios.length >= 25,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 25),
      },
      {
        id: 'cincuenta_registros',
        emoji: '🎓',
        titulo: 'Profundo',
        desc: '50 episodios registrados',
        frase: 'Pocos padres llegan tan lejos. Eres excepcional.',
        color: '#7c3aed',
        check: ({ episodios }) => episodios.length >= 50,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 50),
      },
      {
        id: 'dos_meses',
        emoji: '🌿',
        titulo: 'Constancia',
        desc: '60 días usando Huella',
        frase: 'La constancia no se improvisa, se construye día a día.',
        color: '#059669',
        check: (data) => diasActivo(data) >= 60,
        fechaLogro: (data) => fechaAlDia(data, 60),
      },
      {
        id: 'diez_hitos',
        emoji: '🤝',
        titulo: 'Mentor',
        desc: '10 avances positivos registrados',
        frase: 'Llevas un registro de amor que tu hijo un día entenderá.',
        color: '#d97706',
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
        color: '#0ea5e9',
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
        color: '#10b981',
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
        color: '#8b5cf6',
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
        color: '#f97316',
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
        color: '#6366f1',
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
        color: '#f59e0b',
        check: ({ episodios }) => episodios.length >= 100,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 100),
      },
      {
        id: 'veinte_hitos',
        emoji: '🔮',
        titulo: 'Visionario',
        desc: '20 avances positivos registrados',
        frase: 'Una biblioteca de momentos que valen oro.',
        color: '#7c3aed',
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
        color: '#0ea5e9',
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
        color: '#ec4899',
        check: (data) => diasActivo(data) >= 120,
        fechaLogro: (data) => fechaAlDia(data, 120),
      },
      {
        id: 'ciento_cincuenta',
        emoji: '🧬',
        titulo: 'Científico',
        desc: '150 episodios registrados',
        frase: 'Eres el científico de tu propia familia.',
        color: '#10b981',
        check: ({ episodios }) => episodios.length >= 150,
        fechaLogro: ({ episodios }) => fechaNEpisodio(episodios, 150),
      },
      {
        id: 'seis_meses',
        emoji: '⭐',
        titulo: 'Dedicado',
        desc: '180 días usando Huella',
        frase: 'Estás redefiniendo lo que significa ser padre o madre.',
        color: '#6366f1',
        check: (data) => diasActivo(data) >= 180,
        fechaLogro: (data) => fechaAlDia(data, 180),
      },
      {
        id: 'siete_tipos',
        emoji: '🎪',
        titulo: 'Explorador',
        desc: 'Episodios de 7 tipos distintos',
        frase: 'Tu hijo no tiene secretos para ti.',
        color: '#f97316',
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
        color: '#06b6d4',
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
        color: '#f43f5e',
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
        color: '#f59e0b',
        check: ({ hitos }) => hitos.length >= 30,
        fechaLogro: ({ hitos }) =>
          hitos.length >= 30 ? hitos[hitos.length - 30].fecha : null,
      },
    ],
  },
]

// ── Componentes ───────────────────────────────────────────────────────────

function BadgeCard({ badge, desbloqueado, fechaLogro, nivelBloqueado, esNuevo }) {
  const locked = nivelBloqueado || !desbloqueado
  return (
    <div id={badge.id} className={`${styles.badgeCard} ${locked ? styles.badgeLocked : styles.badgeUnlocked} ${esNuevo ? styles.badgeNuevo : ''}`}>
      <div
        className={styles.badgeEmojiWrap}
        style={!locked ? { background: badge.color + '22', borderColor: badge.color + '66' } : {}}
      >
        <span className={styles.badgeEmoji}>{badge.emoji}</span>
      </div>
      {esNuevo && <span className={styles.nuevoPill}>¡Nuevo!</span>}
      <p className={styles.badgeTitulo}>{badge.titulo}</p>
      <p className={styles.badgeDesc}>{badge.desc}</p>
      {!locked ? (
        <>
          <p className={styles.badgeFrase}>"{badge.frase}"</p>
          {fechaLogro && (
            <p className={styles.badgeFecha} style={{ color: badge.color }}>
              {new Date(fechaLogro).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </>
      ) : (
        <p className={styles.badgeBloqueadoLabel}>Por descubrir</p>
      )}
    </div>
  )
}

function NivelSection({ nivel, data, bloqueado, umbralPrevio, desbloqueadosPrevios, badgesNuevos }) {
  const desbloqueados = nivel.badges.filter((b) => b.check(data)).length
  const total = nivel.badges.length
  const pct = Math.round((desbloqueados / total) * 100)
  const faltan = Math.max(0, (umbralPrevio ?? 0) - (desbloqueadosPrevios ?? 0))

  return (
    <div className={`${styles.nivelSection} ${bloqueado ? styles.nivelBloqueado : ''}`}>
      <div className={styles.nivelHeader}>
        <div className={styles.nivelTituloWrap}>
          {bloqueado && <Lock size={13} className={styles.nivelLockIcon} />}
          <span className={styles.nivelTitulo}>Nivel {nivel.nivel}</span>
          <span className={styles.nivelSubtitulo}>· {bloqueado ? 'Por descubrir' : nivel.subtitulo}</span>
        </div>
        {bloqueado ? (
          <span className={styles.nivelLockMsg}>
            {faltan === 1
              ? 'Te falta 1 medalla del nivel anterior para desbloquearlo'
              : `Te faltan ${faltan} medallas del nivel anterior para desbloquearlo`}
          </span>
        ) : (
          <span className={styles.nivelCounter}>
            {desbloqueados}/{total}
          </span>
        )}
      </div>

      {!bloqueado && (
        <div className={styles.nivelProgressBar}>
          <div className={styles.nivelProgressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className={styles.badgesGrid}>
        {nivel.badges.map((badge) => {
          const desbloqueado = !bloqueado && badge.check(data)
          const fechaLogro = desbloqueado ? badge.fechaLogro(data) : null
          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              desbloqueado={desbloqueado}
              fechaLogro={fechaLogro}
              nivelBloqueado={bloqueado}
              esNuevo={badgesNuevos?.has(badge.id) ?? false}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── HitoCard con upload de foto ───────────────────────────────────────────

function HitoCard({ hito, user, updateHitoFoto }) {
  const cat = CATEGORIAS.find((c) => c.id === hito.categoria)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [errorFoto, setErrorFoto] = useState('')
  const fotoInputRef = useRef(null)

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setSubiendoFoto(true)
    setErrorFoto('')
    try {
      const blob = await compressImage(file)
      const path = `${user.id}/${hito.id}.jpg`
      const { error } = await supabase.storage
        .from('momentos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('momentos').getPublicUrl(path)
      await updateHitoFoto(hito.id, `${data.publicUrl}?t=${Date.now()}`)
    } catch {
      setErrorFoto('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setSubiendoFoto(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }

  return (
    <Card className={styles.hitoCard}>
      <div className={styles.hitoHeader}>
        <span className={styles.hitoEmoji}>{cat?.emoji || '⭐'}</span>
        <div>
          <p className={styles.hitoCategoria}>{cat?.label || hito.categoria}</p>
          <p className={styles.hitoFecha}>
            {new Date(hito.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>
      {hito.descripcion ? <p className={styles.hitoDesc}>{hito.descripcion}</p> : null}
      {hito.foto_url ? (
        <img
          src={hito.foto_url}
          alt="Momento"
          className={styles.hitoFotoImg}
          onClick={() => window.open(hito.foto_url, '_blank')}
        />
      ) : canModify(hito.user_id, user?.id) ? (
        <button
          className={styles.hitoCameraBtn}
          onClick={() => fotoInputRef.current?.click()}
          disabled={subiendoFoto}
        >
          <Camera size={13} />
          {subiendoFoto ? 'Subiendo…' : 'Agregar foto'}
        </button>
      ) : null}
      {errorFoto && <p className={styles.hitoFotoError}>{errorFoto}</p>}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────────────────────

export default function HitosPage() {
  const { state, updateHitoFoto, getCheckinsHechos } = useHuella()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight')
  // Permite entrar directo al Álbum vía /hitos?tab=album (lo usa el
  // link "Ver todos en Álbum" desde el Perfil del hijo).
  const [pestaña, setPestaña] = useState(
    searchParams.get('tab') === 'album' ? 'album' : 'medallas'
  )
  const [checkinsCount, setCheckinsCount] = useState(0)

  useEffect(() => {
    getCheckinsHechos().then(set => setCheckinsCount(set.size))
  }, [])

  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => {
      document.getElementById(highlight)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    return () => clearTimeout(timer)
  }, [highlight])

  const { episodios, hitos, estrategias } = state
  const dataBadge = { episodios, hitos, estrategias, checkinsCount }

  // ── Tracking de badges nuevos ─────────────────────────────────────────────
  const storageKey = `huella_badges_vistos_${user?.id || 'anon'}`
  const badgesVistosRef = useRef(null)

  if (badgesVistosRef.current === null) {
    try {
      badgesVistosRef.current = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch { badgesVistosRef.current = new Set() }
  }

  const todosLosBadges = NIVELES.flatMap((n) => n.badges)
  const desbloqueadosActuales = new Set(todosLosBadges.filter((b) => b.check(dataBadge)).map((b) => b.id))
  const badgesNuevos = new Set([...desbloqueadosActuales].filter((id) => !badgesVistosRef.current.has(id)))

  // Marcar como vistos al salir (o tras 4s)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify([...desbloqueadosActuales]))
      } catch {}
    }, 4000)
    return () => {
      clearTimeout(timer)
      try {
        localStorage.setItem(storageKey, JSON.stringify([...desbloqueadosActuales]))
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Determine which levels are unlocked
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

  // Always show up to (last unlocked + 1) level, minimum 2
  const lastUnlockedIdx = nivelesConEstado.reduce((acc, n, i) => (!n.bloqueado ? i : acc), 0)
  const nivelesVisibles = nivelesConEstado.slice(0, Math.min(lastUnlockedIdx + 2, NIVELES.length))

  const totalDesbloqueados = desbloqueadosActuales.size
  const totalBadges = NIVELES.reduce((s, n) => s + n.badges.length, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.titulo}>Logros<TooltipAyuda texto="Aquí celebramos tu constancia. Cada episodio registrado es un paso hacia entender mejor a tu hijo/a." /></h2>
          <p className={styles.totalBadges}>{totalDesbloqueados} de {totalBadges} medallas</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/nuevo', { state: { vistaInicial: 'hito' } })}
        >
          <Plus size={16} /> Registrar
        </Button>
      </div>

      {/* ── Pestañas ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${pestaña === 'medallas' ? styles.tabActive : ''}`}
          onClick={() => setPestaña('medallas')}
        >
          Medallas
        </button>
        <button
          className={`${styles.tab} ${pestaña === 'album' ? styles.tabActive : ''}`}
          onClick={() => setPestaña('album')}
        >
          Álbum
        </button>
      </div>

      {/* ── Tab: Medallas ── */}
      {pestaña === 'medallas' && (
        <>
          {nivelesVisibles.map((nivel) => (
            <NivelSection
              key={nivel.nivel}
              nivel={nivel}
              data={dataBadge}
              bloqueado={nivel.bloqueado}
              umbralPrevio={nivel.umbralPrevio}
              desbloqueadosPrevios={nivel.desbloqueadosPrevios}
              badgesNuevos={badgesNuevos}
            />
          ))}
        </>
      )}

      {/* ── Tab: Álbum ── */}
      {pestaña === 'album' && (
        <>
          {hitos.length === 0 ? (
            <Card className={styles.albumVacio}>
              <p className={styles.albumVacioEmoji}>📸</p>
              <p className={styles.albumVacioTitulo}>Aún no hay avances registrados</p>
              <p className={styles.albumVacioSub}>Registra un logro de {state.hijo?.nombre || 'tu hijo/a'} para empezar el álbum.</p>
            </Card>
          ) : (
            <>
              {hitos.some((h) => h.foto_url) && (
                <>
                  <h3 className={styles.seccionTitulo}>Álbum de crecimiento</h3>
                  <div className={styles.albumGrid}>
                    {hitos.filter((h) => h.foto_url).map((h) => (
                      <div
                        key={h.id}
                        className={styles.albumItem}
                        onClick={() => window.open(h.foto_url, '_blank')}
                      >
                        <img src={h.foto_url} alt="" className={styles.albumImg} />
                        <p className={styles.albumLabel}>
                          {new Date(h.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <h3 className={styles.seccionTitulo}>Avances registrados</h3>
              <div className={styles.hitosList}>
                {hitos.map((h) => (
                  <HitoCard key={h.id} hito={h} user={user} updateHitoFoto={updateHitoFoto} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
