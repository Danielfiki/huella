import React, { useState } from 'react'
import { Star, Plus, Sparkles } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { celebrarHito } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import styles from './HitosPage.module.css'

const CATEGORIAS = [
  { id: 'autorregulacion', label: 'Se calmó solo',   emoji: '🌱' },
  { id: 'empatia',         label: 'Mostró empatía',  emoji: '💛' },
  { id: 'disculpa',        label: 'Pidió disculpas', emoji: '🤝' },
  { id: 'frustration',     label: 'Toleró un "no"',  emoji: '💪' },
  { id: 'social',          label: 'Avance social',   emoji: '👫' },
  { id: 'otro',            label: 'Otro avance',     emoji: '⭐' },
]

// ── Definición de badges ──────────────────────────────────────────────────

const BADGES = [
  {
    id: 'primer_registro',
    emoji: '🌟',
    titulo: 'Primer paso',
    desc: '1 episodio registrado',
    color: '#f59e0b',
    check: ({ episodios }) => episodios.length >= 1,
    fechaLogro: ({ episodios }) =>
      episodios.length >= 1 ? episodios[episodios.length - 1].fecha : null,
  },
  {
    id: 'cinco_registros',
    emoji: '📊',
    titulo: 'Observador',
    desc: '5 episodios registrados',
    color: '#3b82f6',
    check: ({ episodios }) => episodios.length >= 5,
    fechaLogro: ({ episodios }) =>
      episodios.length >= 5 ? episodios[episodios.length - 5].fecha : null,
  },
  {
    id: 'diez_registros',
    emoji: '🔍',
    titulo: 'Analista',
    desc: '10 episodios registrados',
    color: '#8b5cf6',
    check: ({ episodios }) => episodios.length >= 10,
    fechaLogro: ({ episodios }) =>
      episodios.length >= 10 ? episodios[episodios.length - 10].fecha : null,
  },
  {
    id: 'primer_hito',
    emoji: '💛',
    titulo: 'Primer avance',
    desc: 'Registraste un avance positivo',
    color: '#eab308',
    check: ({ hitos }) => hitos.length >= 1,
    fechaLogro: ({ hitos }) =>
      hitos.length >= 1 ? hitos[hitos.length - 1].fecha : null,
  },
  {
    id: 'cinco_hitos',
    emoji: '🏅',
    titulo: 'Coleccionista',
    desc: '5 avances positivos registrados',
    color: '#f97316',
    check: ({ hitos }) => hitos.length >= 5,
    fechaLogro: ({ hitos }) =>
      hitos.length >= 5 ? hitos[hitos.length - 5].fecha : null,
  },
  {
    id: 'primera_estrategia',
    emoji: '🎯',
    titulo: 'Estratega',
    desc: 'Creaste tu primera estrategia',
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
    color: '#6366f1',
    check: ({ episodios, hitos }) => {
      const fechas = [...episodios.map((e) => e.fecha), ...hitos.map((h) => h.fecha)]
      if (!fechas.length) return false
      const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
      return Date.now() - oldest >= 30 * 24 * 60 * 60 * 1000
    },
    fechaLogro: ({ episodios, hitos }) => {
      const fechas = [...episodios.map((e) => e.fecha), ...hitos.map((h) => h.fecha)]
      if (!fechas.length) return null
      const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
      return new Date(oldest + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
  },
  {
    id: 'semana_intensa',
    emoji: '🔥',
    titulo: 'Semana activa',
    desc: '7 episodios en 7 días',
    color: '#ef4444',
    check: ({ episodios }) => {
      if (episodios.length < 7) return false
      for (let i = 0; i < episodios.length; i++) {
        const base = new Date(episodios[i].fecha).getTime()
        const ventana = episodios.filter(
          (e) => Math.abs(new Date(e.fecha).getTime() - base) <= 7 * 24 * 60 * 60 * 1000
        )
        if (ventana.length >= 7) return true
      }
      return false
    },
    fechaLogro: ({ episodios }) => {
      if (episodios.length < 7) return null
      for (let i = 0; i < episodios.length; i++) {
        const base = new Date(episodios[i].fecha).getTime()
        const ventana = episodios.filter(
          (e) => Math.abs(new Date(e.fecha).getTime() - base) <= 7 * 24 * 60 * 60 * 1000
        )
        if (ventana.length >= 7) return episodios[i].fecha
      }
      return null
    },
  },
  {
    id: 'tres_estrategias',
    emoji: '🌈',
    titulo: 'Multihabilidad',
    desc: '3 estrategias creadas',
    color: '#06b6d4',
    check: ({ estrategias }) => estrategias.length >= 3,
    fechaLogro: ({ estrategias }) =>
      estrategias.length >= 3 ? estrategias[estrategias.length - 3].fechaInicio : null,
  },
]

function BadgeCard({ badge, desbloqueado, fechaLogro }) {
  return (
    <div className={`${styles.badgeCard} ${desbloqueado ? styles.badgeDesbloqueado : styles.badgeBloqueado}`}>
      <div
        className={styles.badgeEmojiWrap}
        style={desbloqueado ? { background: badge.color + '22', borderColor: badge.color + '55' } : {}}
      >
        <span className={styles.badgeEmoji}>{badge.emoji}</span>
      </div>
      <p className={styles.badgeTitulo}>{badge.titulo}</p>
      <p className={styles.badgeDesc}>{badge.desc}</p>
      {desbloqueado && fechaLogro ? (
        <p className={styles.badgeFecha} style={{ color: badge.color }}>
          {new Date(fechaLogro).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
        </p>
      ) : (
        <p className={styles.badgeBloqueadoLabel}>Bloqueado</p>
      )}
    </div>
  )
}

export default function HitosPage() {
  const { state, addHito } = useHuella()
  const [mostrando, setMostrando] = useState(false)
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loadingGuardar, setLoadingGuardar] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const [celebracion, setCelebracion] = useState('')
  const [loadingCelebracion, setLoadingCelebracion] = useState(false)

  const { episodios, hitos, estrategias } = state
  const dataBadge = { episodios, hitos, estrategias }

  const desbloqueados = BADGES.filter((b) => b.check(dataBadge)).length

  async function handleGuardar() {
    if (!categoria) return
    setLoadingGuardar(true)
    setErrorGuardar('')
    const hito = {
      id: Date.now().toString(),
      categoria,
      descripcion,
      fecha: new Date().toISOString(),
    }
    try {
      await addHito(hito)
      setCategoria('')
      setDescripcion('')
      setMostrando(false)
      setLoadingCelebracion(true)
      try {
        const texto = await celebrarHito({ hijo: state.hijo, hito })
        setCelebracion(texto)
      } catch {
        // celebración es bonus
      } finally {
        setLoadingCelebracion(false)
      }
    } catch (e) {
      setErrorGuardar('No se pudo guardar: ' + e.message)
    } finally {
      setLoadingGuardar(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Logros</h2>
        <Button variant="primary" size="sm" onClick={() => setMostrando(!mostrando)}>
          <Plus size={16} /> Registrar
        </Button>
      </div>

      {/* ── Formulario ── */}
      {mostrando && (
        <Card className={styles.formCard}>
          <p className={styles.label}>¿Qué logró?</p>
          <div className={styles.categoriasGrid}>
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                className={`${styles.catBtn} ${categoria === c.id ? styles.catSelected : ''}`}
                onClick={() => setCategoria(c.id)}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            placeholder="Describe el momento con detalle..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
          />
          <Button variant="primary" fullWidth onClick={handleGuardar} disabled={!categoria} loading={loadingGuardar}>
            Guardar hito
          </Button>
          {errorGuardar && <p className={styles.error}>{errorGuardar}</p>}
        </Card>
      )}

      {/* ── Celebración IA ── */}
      {(loadingCelebracion || celebracion) && (
        <Card className={styles.celebracionCard}>
          <div className={styles.celebracionHeader}>
            <Sparkles size={15} color="var(--color-primary-dark)" />
            <span>Huella</span>
          </div>
          {loadingCelebracion ? (
            <div className={styles.celebracionSkeleton}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} style={{ width: '75%' }} />
            </div>
          ) : (
            <p className={styles.celebracionTexto}>{celebracion}</p>
          )}
        </Card>
      )}

      {/* ── Medallas ── */}
      <div className={styles.badgesHeader}>
        <h3 className={styles.seccionTitulo}>Medallas</h3>
        <span className={styles.badgesContador}>{desbloqueados}/{BADGES.length}</span>
      </div>

      <div className={styles.badgesGrid}>
        {BADGES.map((badge) => {
          const desbloqueado = badge.check(dataBadge)
          const fechaLogro = desbloqueado ? badge.fechaLogro(dataBadge) : null
          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              desbloqueado={desbloqueado}
              fechaLogro={fechaLogro}
            />
          )
        })}
      </div>

      {/* ── Avances registrados ── */}
      {hitos.length > 0 && (
        <>
          <h3 className={styles.seccionTitulo} style={{ marginTop: 4 }}>Avances registrados</h3>
          <div className={styles.hitosList}>
            {hitos.map((h) => {
              const cat = CATEGORIAS.find((c) => c.id === h.categoria)
              return (
                <Card key={h.id} className={styles.hitoCard}>
                  <div className={styles.hitoHeader}>
                    <span className={styles.hitoEmoji}>{cat?.emoji || '⭐'}</span>
                    <div>
                      <p className={styles.hitoCategoria}>{cat?.label || h.categoria}</p>
                      <p className={styles.hitoFecha}>
                        {new Date(h.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  {h.descripcion ? <p className={styles.hitoDesc}>{h.descripcion}</p> : null}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
