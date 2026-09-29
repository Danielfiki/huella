import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUp, ChevronDown } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import VoiceTextarea from '../../components/ui/VoiceTextarea'
import TopeDiario, { esLimiteDiario } from '../../components/ui/TopeDiario'
import { FilaHuella, FilaPadre, PuntosLeyendo } from '../../components/conversacion/Conversacion'
import { CabeceraHijo, TarjetaRespuesta, TarjetaResumen, PasoSiguiente, rutaDelPaso } from '../../components/preguntar/PiezasPregunta'
import { preguntarAHuella } from '../../services/anthropic'
import { puedePreguntar, crearPregunta, actualizarPregunta, MAX_PREGUNTAS } from '../../services/preguntas'
import { palabrasGenero } from '../../utils/genero'
import styles from './PreguntarPage.module.css'

// ──────────────────────────────────────────────────────────────────────
// PREGUNTAR A HUELLA
//
// Una duda sobre un hijo, aunque no haya pasado nada. Registrar ≠ Preguntar:
// esta pantalla no crea episodios ni avances, y lo que guarda va a su propia
// tabla. Hasta 5 preguntas sobre el mismo tema; a las 5, o con "Terminar",
// cierra con el resumen de 2 líneas y UN paso siguiente (sin otra llamada:
// el resumen ya viene con cada respuesta).
//
// Momentos del flujo: escribir (B) → esperando (C) → conversación (D/E1) →
// cerrada (E2). Aparte: fuera del marco (F), que no se guarda, y el tope
// diario (G2).
// ──────────────────────────────────────────────────────────────────────

// Ejemplo del campo según el tramo de edad (los mismos cortes que la
// calibración por edad de la IA) y el género guardado.
function ejemploPregunta(hijo) {
  const n = parseInt(hijo?.edad, 10)
  const { codigo } = palabrasGenero(hijo)
  const lo = codigo === 'f' ? 'la' : codigo === 'nb' ? 'le' : 'lo'
  if (!isNaN(n) && n <= 2) return 'Ej.: ¿Es normal que todavía se despierte varias veces en la noche?'
  if (isNaN(n) || n <= 5) return 'Ej.: ¿Es normal que diga que no a todo?'
  if (n <= 11) return `Ej.: ¿Cómo ${lo} ayudo cuando le cuesta perder?`
  return `Ej.: ¿Es normal que ya no quiera que ${lo} abrace delante de sus amigos?`
}

// Lo que queda fuera del marco se deriva, no se responde, y no se guarda.
function textoFueraDeMarco(tema, nombre) {
  if (tema === 'medicamentos') return `Sobre medicamentos no puedo orientarte. Eso le corresponde a su pediatra, que conoce la historia de ${nombre}.`
  if (tema === 'salud_fisica') return `Sobre la salud física de ${nombre} no puedo orientarte. Eso le corresponde a su pediatra, que conoce su historia.`
  if (tema === 'diagnostico') return `Un diagnóstico le corresponde a su pediatra, que conoce la historia de ${nombre} y puede derivar a un especialista si hace falta.`
  return 'Sobre temas legales no puedo orientarte. Eso le corresponde a un abogado de familia.'
}

export default function PreguntarPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, setHijoActivo } = useHuella()
  const hijo = state.hijo
  const hijos = state.hijos || []

  const [fase, setFase] = useState('escribir')
  const [borrador, setBorrador] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [pendiente, setPendiente] = useState('')
  const [ultimo, setUltimo] = useState(null)
  const [filaId, setFilaId] = useState(null)
  const [fuera, setFuera] = useState(null)
  const [tope, setTope] = useState(false)
  const [error, setError] = useState('')
  const [verConversacion, setVerConversacion] = useState(false)
  const enviando = useRef(false)
  const ultimaRef = useRef(null)

  // Lo que Huella ya sabe de este hijo: sus rasgos confirmados y los últimos
  // momentos, episodios y avances juntos.
  const rasgosConfirmados = useMemo(
    () => (state.rasgos || []).filter((r) => r.estado === 'confirmado' && r.hijoId === hijo?.id),
    [state.rasgos, hijo?.id]
  )
  const momentosRecientes = useMemo(() => [
    ...(state.episodios || []).map((e) => ({ fecha: e.fecha, tipo: e.tipo, emocion: e.emocion, descripcionLibre: e.descripcionLibre, contexto: e.contexto })),
    ...(state.hitos || []).map((h) => ({ fecha: h.fecha, _tipo: 'avance', descripcion: h.descripcion })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 8), [state.episodios, state.hitos])

  // La respuesta nueva queda a la vista.
  useEffect(() => {
    if (fase === 'conversacion' && mensajes.length > 1) ultimaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mensajes.length, fase])

  if (!puedePreguntar(user?.id)) return <Navigate to="/nuevo" replace />
  if (!hijo) return null

  const nombre = hijo.nombre

  function reiniciar() {
    setFase('escribir'); setBorrador(''); setMensajes([]); setPendiente(''); setUltimo(null)
    setFilaId(null); setFuera(null); setTope(false); setError(''); setVerConversacion(false)
  }

  async function preguntar(texto) {
    const pregunta = (texto || '').trim()
    if (!pregunta || enviando.current) return
    enviando.current = true
    setPendiente(pregunta)
    setError('')
    setFuera(null)
    setBorrador('')
    setFase(mensajes.length ? 'siguiendo' : 'esperando')
    try {
      const r = await preguntarAHuella({ hijo, pregunta, historial: mensajes, rasgosConfirmados, momentosRecientes })

      if (r.fueraDeMarco) {
        setFuera({ ...r.fueraDeMarco, pregunta })
        setFase(mensajes.length ? 'conversacion' : 'fuera')
        return
      }

      const mensaje = { pregunta, respuesta: r.respuesta, lente: r.lente, fecha: new Date().toISOString() }
      const nuevos = [...mensajes, mensaje]
      const cierra = nuevos.length >= MAX_PREGUNTAS
      // Si guardar falla, la respuesta igual se lee: se avisa en consola.
      try {
        if (!filaId) {
          const fila = await crearPregunta({ userId: user.id, hijoId: hijo.id, mensaje, resumen: r.resumen, pasoSiguiente: r.pasoSiguiente })
          setFilaId(fila.id)
        } else {
          await actualizarPregunta(filaId, { mensajes: nuevos, resumen: r.resumen, pasoSiguiente: r.pasoSiguiente, estado: cierra ? 'cerrada' : undefined })
        }
      } catch (err) {
        console.warn('[preguntar] no se guardó la conversación:', err.message)
      }
      setMensajes(nuevos)
      setUltimo({ resumen: r.resumen, pasoSiguiente: r.pasoSiguiente, ofrecerRegistrar: r.ofrecerRegistrar })
      setFase(cierra ? 'cerrada' : 'conversacion')
    } catch (err) {
      if (esLimiteDiario(err)) {
        setTope(true)
      } else {
        setError('No pudimos responder esta vez. Tu pregunta sigue acá para intentarlo de nuevo.')
        setBorrador(pregunta)
      }
      setFase(mensajes.length ? 'conversacion' : 'escribir')
    } finally {
      setPendiente('')
      enviando.current = false
    }
  }

  // "Terminar" usa el último resumen, sin otra llamada.
  async function terminar() {
    if (!mensajes.length) { navigate(-1); return }
    if (filaId) {
      actualizarPregunta(filaId, { estado: 'cerrada' })
        .catch((err) => console.warn('[preguntar] no se cerró la conversación:', err.message))
    }
    setFase('cerrada')
  }

  function irAlPaso(paso) {
    const ruta = rutaDelPaso(paso)
    if (ruta) navigate(ruta)
  }

  const quedan = MAX_PREGUNTAS - mensajes.length

  // ── B · escribir la primera pregunta (y G2 si ya no quedan consultas) ──
  if (fase === 'escribir') {
    return (
      <div className={styles.pagina}>
        {hijos.length > 1 ? (
          <div className={styles.cabeceraHijos}>
            <button type="button" className={styles.volver} onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft size={20} /></button>
            <div className={styles.chipsHijos} role="group" aria-label="Hijo">
              {hijos.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  aria-pressed={h.id === hijo.id}
                  className={`${styles.chipHijo} ${h.id === hijo.id ? styles.chipHijoOn : ''}`}
                  onClick={() => h.id !== hijo.id && setHijoActivo(h.id)}
                >
                  {h.nombre}{h.edad != null ? ` · ${h.edad} ${h.edad === 1 ? 'año' : 'años'}` : ''}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <CabeceraHijo hijo={hijo} onVolver={() => navigate(-1)} />
        )}

        <h1 className={styles.titulo}>¿Qué quieres saber de {nombre}?</h1>

        {tope ? (
          <TopeDiario nombreHijo={nombre} />
        ) : (
          <>
            <div className={styles.campo}>
              <VoiceTextarea
                value={borrador}
                onChange={setBorrador}
                onVoiceResult={(t) => setBorrador((b) => (b ? `${b} ${t}` : t))}
                placeholder={ejemploPregunta(hijo)}
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button
              type="button"
              className={styles.botonPreguntar}
              disabled={!borrador.trim()}
              onClick={() => preguntar(borrador)}
            >
              Preguntar
            </button>
          </>
        )}
      </div>
    )
  }

  // ── C · esperando la primera respuesta ──
  if (fase === 'esperando') {
    return (
      <div className={styles.pagina}>
        <CabeceraHijo hijo={hijo} onVolver={() => navigate(-1)} />
        <div className={styles.hilo}>
          <FilaPadre avatarUrl={state.padreAvatarUrl} inicial={(state.padreNombre || '').trim().charAt(0).toUpperCase()}>
            <p className={styles.burbujaTexto}>{pendiente}</p>
          </FilaPadre>
          <FilaHuella><PuntosLeyendo /></FilaHuella>
        </div>
      </div>
    )
  }

  // ── F · fuera del marco (la primera pregunta). No se guarda. ──
  if (fase === 'fuera' && fuera) {
    return (
      <div className={styles.pagina}>
        <CabeceraHijo hijo={hijo} onVolver={() => navigate(-1)} />
        <p className={styles.preguntaFuera}>{fuera.pregunta}</p>
        <section className={styles.tarjetaFuera}>
          <p className={styles.textoFuera}>{textoFueraDeMarco(fuera.tema, nombre)}</p>
        </section>
        <button type="button" className={styles.botonBlanco} onClick={reiniciar}>
          Hacer otra pregunta <ArrowRight size={18} />
        </button>
      </div>
    )
  }

  // ── E2 · cierre: resumen y UN paso siguiente ──
  if (fase === 'cerrada') {
    return (
      <div className={styles.pagina}>
        <CabeceraHijo hijo={hijo} onVolver={() => navigate('/panel')} />
        <h2 className={styles.pregunta}>{mensajes[0]?.pregunta}</h2>
        {ultimo?.resumen && <TarjetaResumen resumen={ultimo.resumen} />}
        <PasoSiguiente paso={ultimo?.pasoSiguiente} onIr={irAlPaso} />
        <button type="button" className={styles.botonBlanco} onClick={reiniciar}>
          Hacer otra pregunta <ArrowRight size={18} />
        </button>
        <button
          type="button"
          className={styles.verConversacion}
          aria-expanded={verConversacion}
          onClick={() => setVerConversacion((v) => !v)}
        >
          <span>
            Ver la conversación{' '}
            <span className={styles.verConversacionN}>
              · {mensajes.length} {mensajes.length === 1 ? 'pregunta' : 'preguntas'}
            </span>
          </span>
          <ChevronDown size={18} className={verConversacion ? styles.chevronAbierto : ''} />
        </button>
        {verConversacion && mensajes.map((m, i) => (
          <React.Fragment key={i}>
            <h3 className={styles.preguntaChica}>{m.pregunta}</h3>
            <TarjetaRespuesta respuesta={m.respuesta} lente={m.lente} />
          </React.Fragment>
        ))}
      </div>
    )
  }

  // ── D / E1 · la conversación ──
  return (
    <div className={styles.pagina}>
      <CabeceraHijo
        hijo={hijo}
        onVolver={() => navigate(-1)}
        derecha={<button type="button" className={styles.terminar} onClick={terminar}>Terminar</button>}
      />

      {mensajes.map((m, i) => (
        <React.Fragment key={i}>
          <h2 className={i === 0 ? styles.pregunta : styles.preguntaChica} ref={i === mensajes.length - 1 ? ultimaRef : undefined}>
            {m.pregunta}
          </h2>
          <TarjetaRespuesta respuesta={m.respuesta} lente={m.lente} />
        </React.Fragment>
      ))}

      {fase === 'siguiendo' && (
        <>
          <h2 className={styles.preguntaChica}>{pendiente}</h2>
          <FilaHuella><PuntosLeyendo /></FilaHuella>
        </>
      )}

      {/* Una pregunta de seguimiento fuera del marco: se deriva ahí mismo y no
          entra a la conversación guardada. */}
      {fuera && fase === 'conversacion' && (
        <>
          <p className={styles.preguntaFueraChica}>{fuera.pregunta}</p>
          <section className={styles.tarjetaFuera}>
            <p className={styles.textoFuera}>{textoFueraDeMarco(fuera.tema, nombre)}</p>
          </section>
        </>
      )}

      {fase === 'conversacion' && (tope ? (
        <TopeDiario nombreHijo={nombre} />
      ) : (
        <>
          {mensajes.length >= 2 && quedan > 0 && (
            <p className={styles.quedan}>
              Puedes hacer {quedan} {quedan === 1 ? 'pregunta más' : 'preguntas más'} sobre esto.
            </p>
          )}
          <div className={styles.seguir}>
            <div className={styles.seguirCampo}>
              <VoiceTextarea
                value={borrador}
                onChange={setBorrador}
                onVoiceResult={(t) => setBorrador((b) => (b ? `${b} ${t}` : t))}
                placeholder="Pregunta algo más sobre esto"
              />
            </div>
            <button
              type="button"
              className={styles.enviar}
              disabled={!borrador.trim()}
              onClick={() => preguntar(borrador)}
              aria-label="Enviar"
            >
              <ArrowUp size={20} />
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {ultimo?.ofrecerRegistrar && (
            <button type="button" className={styles.botonBlanco} onClick={() => navigate('/registro')}>
              Registrar lo que pasó <ArrowRight size={18} />
            </button>
          )}
        </>
      ))}
    </div>
  )
}
