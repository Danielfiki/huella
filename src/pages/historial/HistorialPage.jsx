import React, { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import RespuestaIA from '../../components/ui/RespuestaIA'
import GenerarInformeBtn from '../../modules/pdf/GenerarInformeBtn'
import styles from './HistorialPage.module.css'

const TIPOS = {
  rabieta:     { label: 'Rabieta / explosión',              emoji: '😤' },
  llanto:      { label: 'Llanto intenso',                   emoji: '😢' },
  agresividad: { label: 'Golpes / agresividad',             emoji: '😠' },
  miedo:       { label: 'Miedo / angustia',                 emoji: '😨' },
  sueño:       { label: 'No quiere dormir',                 emoji: '😴' },
  social:      { label: 'Se aisló / no quiso relacionarse', emoji: '🙈' },
  desconexion: { label: 'Se cerró / no respondía',          emoji: '😶' },
  oposicion:   { label: 'Oposición / no coopera',           emoji: '🙅' },
  otro:        { label: 'Otro',                             emoji: '📝' },
}

const INTENSIDAD_LABEL = ['', 'Muy leve', 'Leve', 'Moderado', 'Intenso', 'Muy intenso']
const INTENSIDAD_COLOR = ['', '#a8d5b5', '#c4e0a8', '#f0dfa0', '#f5c4a8', '#e87878']

function formatHora(fechaStr) {
  return new Date(fechaStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function labelDia(fechaStr) {
  const fecha = new Date(fechaStr)
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)
  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy'
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer'
  return fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function agruparPorDia(episodios) {
  const grupos = new Map()
  for (const ep of episodios) {
    const key = new Date(ep.fecha).toDateString()
    if (!grupos.has(key)) grupos.set(key, { label: labelDia(ep.fecha), episodios: [] })
    grupos.get(key).episodios.push(ep)
  }
  return Array.from(grupos.values())
}

function EpisodioCard({ ep, onDelete }) {
  const [expandido, setExpandido] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const tipo = TIPOS[ep.tipo] || { label: ep.tipo, emoji: '📝' }

  async function handleEliminar() {
    setEliminando(true)
    try {
      await onDelete(ep.id)
    } catch {
      setEliminando(false)
      setConfirmando(false)
    }
  }

  return (
    <Card className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.tipoWrap}>
          <span className={styles.emoji}>{tipo.emoji}</span>
          <div>
            <p className={styles.tipoLabel}>{tipo.label}</p>
            <p className={styles.hora}>{formatHora(ep.fecha)}</p>
          </div>
        </div>
        <div className={styles.cardTopRight}>
          <span
            className={styles.intensidadBadge}
            style={{ background: INTENSIDAD_COLOR[ep.intensidad] }}
          >
            {INTENSIDAD_LABEL[ep.intensidad]}
          </span>
          {!confirmando ? (
            <button
              className={styles.deleteBtn}
              onClick={() => setConfirmando(true)}
              title="Eliminar episodio"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className={styles.confirmWrap}>
              <button
                className={styles.confirmSiBtn}
                onClick={handleEliminar}
                disabled={eliminando}
              >
                {eliminando ? '...' : 'Eliminar'}
              </button>
              <button
                className={styles.confirmNoBtn}
                onClick={() => setConfirmando(false)}
                disabled={eliminando}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {ep.contexto ? (
        <p className={styles.contexto}>{ep.contexto}</p>
      ) : null}

      {ep.gatillantes?.length > 0 ? (
        <div className={styles.gatillantes}>
          {ep.gatillantes.map((g) => (
            <span key={g} className={styles.gatillante}>{g}</span>
          ))}
        </div>
      ) : null}

      {ep.estadoPadre ? (
        <p className={styles.estadoPadre}>Estado del padre: {ep.estadoPadre}</p>
      ) : null}

      {ep.orientacionIA ? (
        <>
          <button
            className={styles.toggleBtn}
            onClick={() => setExpandido(!expandido)}
          >
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandido ? 'Ocultar orientación' : 'Ver orientación de Huella'}
          </button>
          {expandido && <RespuestaIA texto={ep.orientacionIA} compact />}
        </>
      ) : null}
    </Card>
  )
}

export default function HistorialPage() {
  const { state, deleteEpisodio } = useHuella()
  const { episodios, estrategias, hitos, hijo } = state

  if (episodios.length === 0) {
    return (
      <div className={styles.page}>
        <h2 className={styles.titulo}>Historial</h2>
        <Card className={styles.emptyCard}>
          <BookOpen size={36} color="var(--color-primary-light)" />
          <h3>Sin episodios aún</h3>
          <p>Cuando registres episodios aparecerán aquí con la orientación que dio Huella en cada momento.</p>
        </Card>
      </div>
    )
  }

  const grupos = agruparPorDia(episodios)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Historial</h2>
        <span className={styles.count}>
          {episodios.length} episodio{episodios.length !== 1 ? 's' : ''}
        </span>
      </div>

      {grupos.map((grupo) => (
        <div key={grupo.label} className={styles.grupo}>
          <p className={styles.grupoLabel}>{grupo.label}</p>
          {grupo.episodios.map((ep) => (
            <EpisodioCard key={ep.id} ep={ep} onDelete={deleteEpisodio} />
          ))}
        </div>
      ))}

      <GenerarInformeBtn
        hijo={hijo}
        episodios={episodios}
        estrategias={estrategias}
        hitos={hitos}
      />
    </div>
  )
}
