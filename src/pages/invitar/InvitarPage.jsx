import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { useHuella } from '../../context/HuellaContext'
import Escarabajo from '../../components/ui/Escarabajo'
import styles from './InvitarPage.module.css'

// ── /invitar · la ÚNICA pantalla pública con contenido de una familia ────────
//
// La abre la pareja desde el link del correo, SIN sesión y fuera del Layout: no
// hay header mocha ni barra baja. Es la primera vez que esta persona ve Huella,
// así que la pantalla no explica un producto: muestra a quién la invitó y a qué
// niño va a acompañar, y ofrece una sola acción.
//
// EL FLUJO NO CAMBIÓ. Validar token → aceptar → crear cuenta o entrar →
// conectados, y el estado de invitación caída. Lo que cambió es el envase.
//
// De dónde salen los datos: `get_invitation_public_by_token` (migración 011),
// un RPC nuevo que devuelve SOLO nombre de pila del inviter, nombre del hijo y
// los PATHS de las dos fotos. Nunca correos. El RPC viejo
// (`get_invitation_by_token`, que sí devuelve emails) quedó intacto porque lo
// usa el camino de aceptación, pero esta pantalla ya no lo consume.
//
// Las fotos se firman acá con TTL corto, no en el RPC: una función SQL no puede
// generar URLs firmadas de Storage — las firma la API de Storage. Si el firmado
// falla o la persona no tiene foto, cae a la inicial del nombre.

const TTL_FOTO = 300   // 5 min: la pantalla se ve una vez y se abandona

function Avatar({ url, nombre, className }) {
  if (url) return <img src={url} alt="" className={className} />
  const inicial = (nombre || '·').trim().charAt(0).toUpperCase()
  return <span className={`${className} ${styles.avatarInicial}`}>{inicial}</span>
}

export default function InvitarPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refreshFamily } = useFamily()
  const { reloadData } = useHuella()

  const [status, setStatus] = useState('loading')    // loading | invalid | ready | accepting | done | error | pending_data
  const [invitacion, setInvitacion] = useState(null) // { inviterNombre, hijoNombre, fotoInviter, fotoHijo }
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingCounts, setPendingCounts] = useState(null)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    validateToken()
  }, [token])

  async function validateToken() {
    setStatus('loading')
    try {
      const { data, error } = await supabase.rpc('get_invitation_public_by_token', { p_token: token })
      if (error || !data?.valid) {
        setStatus('invalid')
        return
      }
      // Las dos firmas van en paralelo y ninguna puede voltear la pantalla: si
      // una falla, esa foto cae a inicial y el resto sigue igual.
      const [fotoInviter, fotoHijo] = await Promise.all([
        firmar(data.inviterFotoPath),
        firmar(data.hijoFotoPath),
      ])
      setInvitacion({
        inviterNombre: data.inviterNombre || null,
        hijoNombre:    data.hijoNombre || null,
        fotoInviter,
        fotoHijo,
      })
      setStatus('ready')
    } catch {
      setStatus('invalid')
    }
  }

  async function firmar(path) {
    if (!path || !supabase) return null
    try {
      const { data } = await supabase.storage.from('avatares').createSignedUrl(path, TTL_FOTO)
      return data?.signedUrl ?? null
    } catch {
      return null
    }
  }

  async function handleAccept() {
    if (!user) return
    setStatus('accepting')
    try {
      const { data, error } = await supabase.rpc('accept_partner_invitation', { p_token: token })
      if (error) throw new Error(error.message)
      if (!data?.success) {
        if (data?.error_code === 'pending_data') {
          setPendingCounts(data.counts ?? null)
          setStatus('pending_data')
          return
        }
        throw new Error(data?.error ?? 'No se pudo aceptar')
      }
      const newFamily = await refreshFamily()
      if (newFamily) reloadData(newFamily)
      setStatus('done')
      setTimeout(() => navigate('/panel'), 2000)
    } catch (e) {
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  const destino  = `/invitar?token=${token}`
  const loginUrl  = `/login?redirect=${encodeURIComponent(destino)}`
  const signupUrl = `/signup?redirect=${encodeURIComponent(destino)}`

  function describirCounts(counts) {
    if (!counts) return null
    const items = []
    if (counts.episodios   > 0) items.push(`${counts.episodios} ${counts.episodios   === 1 ? 'episodio'   : 'episodios'}`)
    if (counts.hitos       > 0) items.push(`${counts.hitos} ${counts.hitos           === 1 ? 'hito'       : 'hitos'}`)
    if (counts.estrategias > 0) items.push(`${counts.estrategias} ${counts.estrategias === 1 ? 'estrategia' : 'estrategias'}`)
    if (counts.rutinas     > 0) items.push(`${counts.rutinas} ${counts.rutinas       === 1 ? 'rutina'     : 'rutinas'}`)
    if (items.length === 0) return null
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} y ${items[1]}`
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
  }

  // La marca: escarabajo suelto + palabra, el mismo gesto del splash.
  const marca = (
    <div className={styles.marca}>
      <Escarabajo className={styles.marcaBicho} />
      <span className={styles.marcaPalabra}>huella</span>
    </div>
  )

  // Pantalla centrada de un solo mensaje. La usan la invitación caída y los
  // estados de cierre (conectados, datos previos, error), para que todos hablen
  // con la misma voz en vez de tener cada uno su propio envase.
  function Mensaje({ titulo, texto, children }) {
    return (
      <div className={styles.pagina}>
        <div className={styles.centrado}>
          {marca}
          <h1 className={styles.tituloMensaje}>{titulo}</h1>
          {texto && <p className={styles.bajada}>{texto}</p>}
          {children && <div className={styles.accionesMensaje}>{children}</div>}
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className={styles.pagina}>
        <div className={styles.centrado}>
          {marca}
          <p className={styles.cargando}>Abriendo la invitación…</p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <Mensaje
        titulo="Esta invitación ya no está activa"
        texto="Pídele a quien te invitó que te envíe una nueva desde la app."
      >
        <Link to="/signup" className={styles.btnSecundario}>Descargar huella</Link>
        <a href="mailto:contacto@huella.lat" className={styles.enlace}>
          ¿Necesitas ayuda? Escríbenos
        </a>
      </Mensaje>
    )
  }

  if (status === 'done') {
    return (
      <Mensaje
        titulo="Quedaron conectados"
        texto="Desde ahora ven y registran los mismos momentos. Te llevamos a tu inicio…"
      />
    )
  }

  if (status === 'pending_data') {
    return (
      <Mensaje
        titulo="Ya tienes registros tuyos"
        texto={
          describirCounts(pendingCounts)
            ? `En tu cuenta hay ${describirCounts(pendingCounts)}. Escríbenos y unimos tu historial con el de esta familia, sin perder nada.`
            : 'En tu cuenta ya hay registros. Escríbenos y unimos tu historial con el de esta familia, sin perder nada.'
        }
      >
        <a href="mailto:contacto@huella.lat" className={styles.btnSecundario}>Escribirnos</a>
        <Link to="/panel" className={styles.enlace}>Ir a mi inicio</Link>
      </Mensaje>
    )
  }

  if (status === 'error') {
    return (
      <Mensaje titulo="No pudimos completar la conexión" texto={errorMsg}>
        <Link to="/perfil" className={styles.btnSecundario}>Ir a mi perfil</Link>
      </Mensaje>
    )
  }

  // ── Invitación válida ──
  const inviter = invitacion?.inviterNombre || 'Tu pareja'
  const hijo    = invitacion?.hijoNombre
  const titular = hijo
    ? `${inviter} te invita a acompañar juntos a ${hijo}`
    : `${inviter} te invita a acompañar juntos a su hijo o hija`
  const bajada = hijo
    ? `huella es un diario privado para guardar los momentos de ${hijo} y entender cómo crece.`
    : 'huella es un diario privado para guardar los momentos de tu hijo o hija y entender cómo crece.'

  return (
    <div className={styles.pagina}>
      {marca}

      <div className={styles.par}>
        <Avatar
          url={invitacion?.fotoInviter}
          nombre={inviter}
          className={styles.fotoInviter}
        />
        <Avatar
          url={invitacion?.fotoHijo}
          nombre={hijo}
          className={styles.fotoHijo}
        />
      </div>

      <h1 className={styles.titular}>{titular}</h1>
      <p className={styles.bajada}>{bajada}</p>

      <div className={styles.pie}>
        <p className={styles.microcopy}>Solo {inviter} y tú verán sus registros.</p>

        {user ? (
          <>
            <button
              type="button"
              className={styles.btnPrimario}
              onClick={handleAccept}
              disabled={status === 'accepting'}
            >
              {status === 'accepting' ? 'Conectando…' : 'Aceptar invitación'}
            </button>
            <p className={styles.enlaceNota}>Entrarás como {user.email}</p>
          </>
        ) : (
          <>
            <Link to={signupUrl} className={styles.btnPrimario}>Aceptar invitación</Link>
            <Link to={loginUrl} className={styles.enlace}>
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
