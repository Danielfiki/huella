import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Camera } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import comprimirImagen from '../../utils/comprimirImagen'
import { canModify } from '../../utils/authorDisplay'
import { generarRespuestaReflexion } from '../../services/anthropic'
import { LENTE_POR_ID } from '../../constants/catalogoAvance'
import { TIPOS, emoTileClass } from '../../components/historial/helpers'
import OrientacionSecciones from '../../components/registro/OrientacionSecciones'
import Escarabajo from '../../components/ui/Escarabajo'
import { usaMomentosNuevo, fechaMomento } from './momentosNuevo'
import styles from './MomentoPage.module.css'

// El momento abierto (rediseño de Momentos, solo la cuenta de Daniel): un
// episodio o un avance en pantalla propia. Episodio: relato completo, emoción,
// la orientación completa por secciones, la reflexión con su respuesta de
// Huella, "¿Cómo siguió?" (entre 20 y 48 h) y borrar dentro de "Más opciones".
// Avance: foto (o la cámara para agregarla), relato y la respuesta de Huella.
// La Acción rápida no va en Momentos.
export default function MomentoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, updateEpisodio, deleteEpisodio, deleteHito, getCheckinsHechos, updateHitoFoto } = useHuella()

  const episodio = state.episodios.find((e) => e.id === id) || null
  const hito = episodio ? null : (state.hitos.find((h) => h.id === id) || null)

  const [menuAbierto, setMenuAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  if (!usaMomentosNuevo(user?.id)) return <Navigate to="/historial" replace />
  if (!episodio && !hito) {
    // Recién borrado, o todavía cargando: vuelve a la lista.
    return state.episodios.length || state.hitos.length ? <Navigate to="/historial" replace /> : null
  }

  const autorId = episodio ? episodio.userId : hito.user_id
  const mio = canModify(autorId, user?.id)
  const tipo = episodio ? episodio.tipo : 'logro'
  const titulo = episodio
    ? (TIPOS[episodio.tipo]?.label ?? episodio.tipo)
    : (hito.categoria ? (LENTE_POR_ID[hito.categoria]?.label ?? hito.categoria) : 'Avance')
  const emoji = episodio ? (TIPOS[episodio.tipo]?.emoji ?? '📝') : '⭐'
  const fecha = episodio ? episodio.fecha : hito.fecha

  async function borrar() {
    setBorrando(true)
    try {
      await (episodio ? deleteEpisodio(id) : deleteHito(id))
      navigate('/historial', { replace: true })
    } catch {
      setBorrando(false)
      setConfirmando(false)
    }
  }

  return (
    <div className={styles.pagina}>
      <div className={styles.barra}>
        <button className={styles.boton} onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        {mio && (
          <div className={styles.opciones}>
            <button
              className={styles.boton}
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label="Más opciones"
              aria-expanded={menuAbierto}
            >
              <MoreHorizontal size={20} />
            </button>
            {menuAbierto && (
              <div className={styles.menu} role="menu">
                <button className={styles.menuItem} role="menuitem" onClick={() => { setMenuAbierto(false); setConfirmando(true) }}>
                  Borrar este momento
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmando && (
        <DialogoBorrar borrando={borrando} alCerrar={() => setConfirmando(false)} alBorrar={borrar} />
      )}

      <div className={styles.encabezado}>
        <span className={`${styles.icono} ${styles[`icono_${emoTileClass(tipo)}`] || ''}`} aria-hidden="true">{emoji}</span>
        <div>
          <h1 className={styles.tipo}>{titulo}</h1>
          <p className={styles.fecha}>{fechaMomento(fecha)}</p>
        </div>
      </div>

      {episodio
        ? <CuerpoEpisodio episodio={episodio} mio={mio} hijo={state.hijo} episodios={state.episodios} userId={user?.id} updateEpisodio={updateEpisodio} getCheckinsHechos={getCheckinsHechos} navigate={navigate} />
        : <CuerpoAvance hito={hito} mio={mio} userId={user?.id} updateHitoFoto={updateHitoFoto} />}
    </div>
  )
}

// Confirmación de borrar: diálogo centrado sobre la pantalla, con el fondo
// oscurecido. Va por portal a document.body (mismo motivo que UpgradeModal: que
// ninguna capa de la página le gane). Tocar el fondo, "No" o Escape cierra sin
// borrar; el foco entra en "No" y el Tab no sale del diálogo.
function DialogoBorrar({ borrando, alCerrar, alBorrar }) {
  const noRef = useRef(null)
  const siRef = useRef(null)
  useEffect(() => { noRef.current?.focus() }, [])

  function teclas(e) {
    if (e.key === 'Escape' && !borrando) { e.preventDefault(); alCerrar() }
    if (e.key === 'Tab') {
      const [primero, ultimo] = [noRef.current, siRef.current]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus() }
    }
  }

  return createPortal(
    <div className={styles.fondo} onClick={(e) => { if (e.target === e.currentTarget && !borrando) alCerrar() }}>
      <div className={styles.dialogo} role="dialog" aria-modal="true" aria-labelledby="dialogo-borrar-texto" onKeyDown={teclas}>
        <p id="dialogo-borrar-texto" className={styles.confirmarTexto}>¿Lo borramos? No se puede deshacer.</p>
        <div className={styles.confirmarBotones}>
          <button ref={noRef} className={styles.confirmarNo} onClick={alCerrar} disabled={borrando}>
            No
          </button>
          <button ref={siRef} className={styles.confirmarSi} onClick={alBorrar} disabled={borrando}>
            {borrando ? '…' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function CuerpoEpisodio({ episodio, mio, hijo, episodios, userId, updateEpisodio, getCheckinsHechos, navigate }) {
  const relato = episodio.descripcionLibre || episodio.contexto || ''
  const horasDesde = (Date.now() - new Date(episodio.fecha)) / 3600000
  const [checkinHecho, setCheckinHecho] = useState(false)
  useEffect(() => {
    let vivo = true
    getCheckinsHechos().then((s) => { if (vivo) setCheckinHecho(s.has(episodio.id)) })
    return () => { vivo = false }
  }, [episodio.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const mostrarCheckin = !checkinHecho && horasDesde >= 20 && horasDesde <= 48

  return (
    <>
      {episodio.emocion && (
        <span className={styles.chip}>
          <span className={styles.chipRotulo}>niño/a</span>
          {episodio.emocion}
        </span>
      )}

      {relato && <p className={styles.relato}>{relato}</p>}

      {episodio.orientacionIA && (
        <section className={styles.tarjeta}>
          <div className={styles.rotulo}>
            <Escarabajo className={styles.rotuloIcono} />
            <span>Orientación de Huella</span>
          </div>
          <OrientacionSecciones texto={episodio.orientacionIA} episodio={episodio} hijo={hijo} grande />
        </section>
      )}

      {mio && (
        <Reflexion episodio={episodio} hijo={hijo} episodios={episodios} userId={userId} updateEpisodio={updateEpisodio} />
      )}

      {checkinHecho && <span className={styles.seguimientoHecho}>✓ Seguimiento hecho</span>}
      {mostrarCheckin && (
        <button className={styles.comoSiguio} onClick={() => navigate(`/checkin/${episodio.id}`)}>
          ¿Cómo siguió? →
        </button>
      )}
    </>
  )
}

// Misma lógica que la reflexión de EpisodioCard: se guarda, y la primera vez
// que queda guardada Huella responde una sola vez (la columna es el candado).
function Reflexion({ episodio, hijo, episodios, userId, updateEpisodio }) {
  const [reflexion, setReflexion] = useState(episodio.reflexion ?? '')
  const [respuesta, setRespuesta] = useState(episodio.reflexionRespuesta ?? null)
  const [cargandoRespuesta, setCargandoRespuesta] = useState(false)
  const respuestaPedida = useRef(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(false)
  const timerRef = useRef(null)
  useEffect(() => () => clearTimeout(timerRef.current), [])
  const sucio = reflexion !== (episodio.reflexion ?? '')

  async function guardar() {
    const texto = (reflexion || '').trim()
    setGuardando(true)
    setErrorGuardado(false)
    try {
      await updateEpisodio({ id: episodio.id, reflexion: reflexion || null })
      clearTimeout(timerRef.current)
      setGuardado(true)
      timerRef.current = setTimeout(() => setGuardado(false), 2500)
    } catch {
      setErrorGuardado(true)
      return
    } finally {
      setGuardando(false)
    }

    if (!texto || respuesta || respuestaPedida.current) return
    respuestaPedida.current = true
    setCargandoRespuesta(true)
    try {
      const r = await generarRespuestaReflexion({
        hijo,
        episodio: { tipo: episodio.tipo, intensidad: episodio.intensidad },
        texto,
        episodios,
        userId: userId ?? null,
        excluirId: episodio.id,
      })
      if (r) {
        setRespuesta(r)
        updateEpisodio({ id: episodio.id, reflexionRespuesta: r })
      }
    } catch {
      // Si falla, no aparece nada: su texto ya quedó guardado.
    } finally {
      setCargandoRespuesta(false)
    }
  }

  return (
    <section className={`${styles.tarjeta} ${styles.tarjetaReflexion}`}>
      <label className={styles.reflexionLabel} htmlFor={`reflexion-${episodio.id}`}>Mi reflexión sobre este momento</label>
      <textarea
        id={`reflexion-${episodio.id}`}
        className={styles.reflexionCampo}
        placeholder="Escribe si quieres — esto es solo para ti."
        value={reflexion}
        rows={3}
        onChange={(e) => { setReflexion(e.target.value); setGuardado(false); setErrorGuardado(false) }}
      />
      {guardado ? (
        <span className={styles.reflexionOk}>✓ Guardado</span>
      ) : errorGuardado ? (
        <button type="button" className={styles.reflexionReintentar} onClick={guardar}>
          No se guardó. Toca para reintentar.
        </button>
      ) : sucio && (
        <button className={styles.reflexionGuardar} onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      )}
      {cargandoRespuesta && <p className={styles.respuestaReflexion}>Huella está leyendo lo que escribiste…</p>}
      {!cargandoRespuesta && respuesta && (
        <p className={styles.respuestaReflexion}>
          <Escarabajo className={styles.respuestaIcono} />
          <span>{respuesta}</span>
        </p>
      )}
    </section>
  )
}

function CuerpoAvance({ hito, mio, userId, updateHitoFoto }) {
  const [subiendo, setSubiendo] = useState(false)
  const [errorFoto, setErrorFoto] = useState('')
  const inputRef = useRef(null)
  const [linea1, ...resto] = (hito.respuesta_ia || '').split('\n').filter((l) => l.trim())

  // Mismo camino que EpisodioCard: comprimir, subir al bucket privado y
  // guardar el PATH.
  async function subirFoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    setSubiendo(true)
    setErrorFoto('')
    try {
      const blob = await comprimirImagen(file)
      const path = `${userId}/${hito.id}.jpg`
      const { error } = await supabase.storage.from('momentos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw new Error(error.message)
      await updateHitoFoto(hito.id, path)
    } catch {
      setErrorFoto('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      {hito.foto_url ? (
        <img src={hito.foto_url} alt="Foto del avance" className={styles.foto} />
      ) : mio && (
        <>
          <button
            type="button"
            className={styles.camara}
            onClick={() => !subiendo && inputRef.current?.click()}
            disabled={subiendo}
            aria-label="Agregar una foto a este avance"
          >
            <Camera size={20} />
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={subirFoto} />
        </>
      )}
      {errorFoto && <p className={styles.errorFoto}>{errorFoto}</p>}

      {hito.descripcion && <p className={styles.relato}>{hito.descripcion}</p>}

      {linea1 && (
        <section className={`${styles.tarjeta} ${styles.tarjetaRespuesta}`}>
          <Escarabajo className={styles.respuestaAvanceIcono} />
          <p className={styles.respuestaLinea1}>{linea1}</p>
          {resto.length > 0 && <p className={styles.respuestaLinea2}>{resto.join(' ')}</p>}
        </section>
      )}
    </>
  )
}
