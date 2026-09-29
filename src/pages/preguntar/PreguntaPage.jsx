import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { canModify } from '../../utils/authorDisplay'
import { DialogoBorrar } from '../historial/MomentoPage'
import { fechaMomento } from '../historial/momentosNuevo'
import { TarjetaResumen, PasoSiguiente, rutaDelPaso, PIE_EVIDENCIA } from '../../components/preguntar/PiezasPregunta'
import { puedePreguntar, obtenerPregunta, borrarPregunta } from '../../services/preguntas'
import momento from '../historial/MomentoPage.module.css'
import styles from './PreguntaPage.module.css'

// Una pregunta guardada, abierta desde Momentos (diseño H3): el resumen, el
// paso siguiente y la conversación completa. Mismo encabezado y mismo borrar
// que un momento abierto.
export default function PreguntaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state } = useHuella()
  const [fila, setFila] = useState(undefined)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const habilitado = puedePreguntar(user?.id)
  useEffect(() => {
    if (!habilitado) return
    let vivo = true
    obtenerPregunta(id)
      .then((f) => { if (vivo) setFila(f ?? null) })
      .catch(() => { if (vivo) setFila(null) })
    return () => { vivo = false }
  }, [id, habilitado])

  if (!habilitado) return <Navigate to="/historial" replace />
  if (fila === undefined) return null
  if (fila === null) return <Navigate to="/historial" replace />

  const hijo = (state.hijos || []).find((h) => h.id === fila.hijo_id) || null
  const mensajes = Array.isArray(fila.mensajes) ? fila.mensajes : []
  const mio = canModify(fila.user_id, user?.id)
  const ultimaLente = mensajes[mensajes.length - 1]?.lente || ''

  async function borrar() {
    setBorrando(true)
    try {
      await borrarPregunta(fila.id)
      navigate('/historial', { replace: true, state: { filtro: 'preguntas' } })
    } catch {
      setBorrando(false)
      setConfirmando(false)
    }
  }

  return (
    <div className={momento.pagina}>
      <div className={momento.barra}>
        <button className={momento.boton} onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        {mio && (
          <div className={momento.opciones}>
            <button
              className={momento.boton}
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label="Más opciones"
              aria-expanded={menuAbierto}
            >
              <MoreHorizontal size={20} />
            </button>
            {menuAbierto && (
              <div className={momento.menu} role="menu">
                <button className={momento.menuItem} role="menuitem" onClick={() => { setMenuAbierto(false); setConfirmando(true) }}>
                  Borrar esta pregunta
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmando && (
        <DialogoBorrar borrando={borrando} alCerrar={() => setConfirmando(false)} alBorrar={borrar} />
      )}

      <div className={momento.encabezado}>
        <span className={`${momento.icono} ${momento.icono_pregunta}`} aria-hidden="true">💭</span>
        <div>
          <h1 className={momento.tipo}>Pregunta</h1>
          <p className={momento.fecha}>{fechaMomento(fila.created_at)}</p>
        </div>
      </div>

      {hijo && (
        <span className={styles.sobre}>
          <span className={styles.sobreRotulo}>Sobre</span>
          {hijo.nombre}{hijo.edad != null ? ` · ${hijo.edad} ${hijo.edad === 1 ? 'año' : 'años'}` : ''}
        </span>
      )}

      {fila.resumen && <TarjetaResumen resumen={fila.resumen} />}
      <PasoSiguiente paso={fila.paso_siguiente} onIr={(p) => { const r = rutaDelPaso(p); if (r) navigate(r) }} />

      {mensajes.length > 0 && (
        <>
          <h2 className={styles.tituloConversacion}>La conversación</h2>
          <section className={styles.conversacion}>
            {mensajes.map((m, i) => (
              <div key={i} className={styles.par}>
                <h3 className={styles.pregunta}>{m.pregunta}</h3>
                <p className={styles.respuesta}>{m.respuesta}</p>
              </div>
            ))}
            <p className={styles.pie}>{PIE_EVIDENCIA}{ultimaLente ? ` Lente: ${ultimaLente}` : ''}</p>
          </section>
        </>
      )}
    </div>
  )
}
