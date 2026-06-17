import React, { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella } from '../../context/HuellaContext'
import IntensidadDots from './IntensidadDots'
import OrientacionIA from './OrientacionIA'
import AccionRapida from './AccionRapida'
import { pillClassFor, emoTileClass } from './helpers'
import { canModify } from '../../utils/authorDisplay'
import { bucketTiempo } from '../../services/anthropic'
import Escarabajo from '../ui/Escarabajo'
import colaRegeneracion from '../../utils/colaRegeneracionAccionRapida'
import styles from './EpisodioCard.module.css'

function formatHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export default function EpisodioCard({ episodio, onDelete, onUpdate, tieneCheckin, onNavigate, authorName }) {
  const [iaOpen, setIaOpen] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [reflexion, setReflexion] = useState(episodio.reflexion ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const timerRef = useRef(null)

  // ── Acción Rápida v1.2 ────────────────────────────────────────────────
  // Estado local hidratado con la versión persistida del episodio. Si el
  // bucket de tiempo cambió desde la última generación, se encola regen
  // (lazy en background con techo 10/sesión) y se actualiza cuando termina.
  const [accionRapidaActual, setAccionRapidaActual] = useState(episodio.accionRapida ?? null)
  const [regenerando, setRegenerando]               = useState(false)

  const { user } = useAuth()
  const { state: huellaState } = useHuella()
  const mine = canModify(episodio.userId, user?.id)

  useEffect(() => {
    if (episodio._source === 'hito') return
    if (!episodio.id || !episodio.fecha) return

    const bucketActual     = bucketTiempo(episodio.fecha)
    const bucketPersistido = accionRapidaActual?.bucket ?? null

    // Si ya tenemos una versión con el bucket actual, no regeneramos.
    if (bucketPersistido !== null && bucketPersistido === bucketActual) return

    // Suscribirse al resultado ANTES de encolar para no perder notificación.
    const unsubscribe = colaRegeneracion.subscribe(episodio.id, (resultado) => {
      if (resultado?.ok && resultado.accion) {
        setAccionRapidaActual(resultado.accion)
      }
      setRegenerando(false)
    })

    const encolado = colaRegeneracion.enqueue(episodio, huellaState.hijo)
    if (encolado) {
      setRegenerando(true)
    }

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodio.id, episodio.fecha])

  const tipoClass = emoTileClass(episodio.tipo)
  const hasIA = !!episodio.orientacionIA
  const isHito = episodio._source === 'hito'
  const horasDesde = (Date.now() - new Date(episodio.fecha)) / 3600000
  const mostrarCheckin = !isHito && !tieneCheckin && horasDesde >= 20 && horasDesde <= 48
  const reflexionDirty = reflexion !== (episodio.reflexion ?? '')

  async function handleEliminar() {
    setEliminando(true)
    try {
      await onDelete(episodio.id)
    } catch {
      setEliminando(false)
      setConfirmando(false)
    }
  }

  async function handleGuardarReflexion() {
    if (!onUpdate) return
    setGuardando(true)
    try {
      await onUpdate({ id: episodio.id, reflexion: reflexion || null })
      clearTimeout(timerRef.current)
      setGuardado(true)
      timerRef.current = setTimeout(() => setGuardado(false), 2500)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <article className={styles.ep}>
      <div className={`${styles.emo} ${styles[`emo_${tipoClass}`]}`} aria-hidden="true">
        {episodio.emoji}
      </div>

      <div className={styles.body}>
        <div className={styles.top}>
          <h3 className={styles.ttl}>{episodio.titulo}</h3>
          <span className={styles.time}>{formatHora(episodio.fecha)}</span>
          {authorName && <span className={styles.author}>· {authorName}</span>}
          {mine && (
            !confirmando ? (
              <button className={styles.deleteBtn} onClick={() => setConfirmando(true)} aria-label="Eliminar">
                <Trash2 size={13} />
              </button>
            ) : (
              <div className={styles.confirmWrap}>
                <button className={styles.confirmSi} onClick={handleEliminar} disabled={eliminando}>
                  {eliminando ? '…' : 'Borrar'}
                </button>
                <button className={styles.confirmNo} onClick={() => setConfirmando(false)} disabled={eliminando}>
                  No
                </button>
              </div>
            )
          )}
        </div>

        {episodio.descripcion && (
          <p className={styles.desc}>{episodio.descripcion}</p>
        )}

        {(episodio.emocion || episodio.estadoPadre) && (
          <div className={styles.emocionRow}>
            {episodio.emocion && (
              <span className={styles.emocionPill}>
                <span className={styles.emocionLbl}>niño/a</span>
                {episodio.emocion}
              </span>
            )}
            {episodio.estadoPadre && (
              <span className={styles.estadoPill}>
                <span className={styles.estadoLbl}>yo</span>
                {episodio.estadoPadre}
              </span>
            )}
          </div>
        )}

        {episodio.descripcionLibre && (
          <p className={styles.descLibre}>{episodio.descripcionLibre}</p>
        )}

        <div className={styles.row3}>
          {(episodio.gatillantes || []).map((g, i) => (
            <span key={i} className={`${styles.pill} ${styles[`pill_${pillClassFor(g)}`]}`}>
              {g}
            </span>
          ))}
          {hasIA && !iaOpen && (
            <button className={styles.iaInline} onClick={() => setIaOpen(true)} aria-expanded={false}>
              <span className={styles.iaH} aria-hidden="true"><Escarabajo className={styles.iaHIcon} /></span>
              Ver orientación
            </button>
          )}
          {!isHito && <IntensidadDots tipo={episodio.tipo} nivel={episodio.nivel || 0} />}
        </div>

        {episodio.fotoUrl && (
          <img
            src={episodio.fotoUrl}
            alt="Foto del avance"
            className={styles.hitoFoto}
            onClick={() => window.open(episodio.fotoUrl, '_blank')}
          />
        )}

        {!isHito && mine && (
          <div className={styles.reflexionWrap}>
            <textarea
              className={styles.reflexionArea}
              placeholder="Mi reflexión sobre este momento…"
              value={reflexion}
              rows={reflexion ? 2 : 1}
              onChange={(e) => { setReflexion(e.target.value); setGuardado(false) }}
            />
            {(reflexionDirty || guardado) && (
              <div className={styles.reflexionActions}>
                {guardado ? (
                  <span className={styles.reflexionOk}>✓ Guardado</span>
                ) : (
                  <button
                    className={styles.reflexionBtn}
                    onClick={handleGuardarReflexion}
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tieneCheckin && (
          <span className={styles.checkinDone}>✓ Seguimiento hecho</span>
        )}
        {mostrarCheckin && (
          <button
            className={styles.checkinBtn}
            onClick={() => onNavigate(`/checkin/${episodio.id}`)}
          >
            ¿Cómo siguió? →
          </button>
        )}
      </div>

      {!isHito && (accionRapidaActual || regenerando) && (
        <AccionRapida data={accionRapidaActual} regenerando={regenerando} />
      )}

      {hasIA && iaOpen && (
        <OrientacionIA orientacion={episodio.orientacionIA} onClose={() => setIaOpen(false)} />
      )}
    </article>
  )
}
