import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useFamily } from '../../context/FamilyContext'
import { useHuella } from '../../context/HuellaContext'
import styles from './InvitarPage.module.css'

export default function InvitarPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refreshFamily } = useFamily()
  const { reloadData } = useHuella()

  const [status, setStatus] = useState('loading')    // loading | invalid | ready | accepting | done | error | pending_data
  const [invitation, setInvitation] = useState(null) // { inviterEmail, inviteeEmail, expiresAt }
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingCounts, setPendingCounts] = useState(null) // { episodios, hitos, estrategias, rutinas }

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
      const { data, error } = await supabase.rpc('get_invitation_by_token', { p_token: token })
      if (error || !data?.valid) {
        setStatus('invalid')
        return
      }
      setInvitation(data)
      setStatus('ready')
    } catch {
      setStatus('invalid')
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

  const loginUrl = `/login?redirect=${encodeURIComponent(`/invitar?token=${token}`)}`

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>huella</div>

        {status === 'loading' && (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p className={styles.hint}>Verificando invitación…</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className={styles.center}>
            <div className={styles.icon}>⏰</div>
            <h2 className={styles.title}>Invitación inválida o expirada</h2>
            <p className={styles.subtitle}>
              Este link ya no es válido. Pídele a tu pareja que envíe una nueva invitación desde su perfil en Huella.
            </p>
            <Link to="/login" className={styles.btnPrimary}>Ir al inicio</Link>
          </div>
        )}

        {(status === 'ready' || status === 'accepting') && invitation && (
          <>
            <div className={styles.avatarGroup}>
              <div className={styles.avatarCircle}>👤</div>
              <div className={styles.avatarPlus}>+</div>
              <div className={styles.avatarCircle}>👤</div>
            </div>

            <h2 className={styles.title}>
              {invitation.inviterEmail?.split('@')[0] ?? 'Tu pareja'} te invita a Huella
            </h2>
            <p className={styles.subtitle}>
              <strong>{invitation.inviterEmail}</strong> quiere que compartan el seguimiento
              de su hijo/a juntos: episodios, hitos y estrategias de crianza.
            </p>

            {!user ? (
              <div className={styles.noSessionBox}>
                <p className={styles.noSessionText}>
                  Para aceptar la invitación necesitas tener una cuenta en Huella.
                </p>
                <Link to={loginUrl} className={styles.btnPrimary}>
                  Iniciar sesión para aceptar
                </Link>
                <Link
                  to={`/signup?redirect=${encodeURIComponent(`/invitar?token=${token}`)}`}
                  className={styles.btnSecondary}
                >
                  Crear cuenta nueva
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.myEmail}>
                  Aceptarás como <strong>{user.email}</strong>
                </div>
                <button
                  className={styles.btnPrimary}
                  onClick={handleAccept}
                  disabled={status === 'accepting'}
                >
                  {status === 'accepting' ? (
                    <><span className={styles.spinnerBtn} /> Aceptando…</>
                  ) : (
                    'Aceptar invitación'
                  )}
                </button>
                <p className={styles.legalNote}>
                  Al aceptar, compartirás los datos de crianza con {invitation.inviterEmail}.
                  Puedes desvincularte en cualquier momento desde tu perfil.
                </p>
              </>
            )}
          </>
        )}

        {status === 'done' && (
          <div className={styles.center}>
            <div className={styles.icon}>🎉</div>
            <h2 className={styles.title}>¡Familia conectada!</h2>
            <p className={styles.subtitle}>
              Ya pueden ver y registrar episodios juntos. Redirigiendo al panel…
            </p>
          </div>
        )}

        {status === 'pending_data' && (
          <div className={styles.center}>
            <div className={styles.icon}>📋</div>
            <h2 className={styles.title}>Tienes datos previos</h2>
            <p className={styles.subtitle}>
              {describirCounts(pendingCounts) ? (
                <>
                  Ya tienes <strong>{describirCounts(pendingCounts)}</strong> en tu cuenta.
                  Para unirte a la familia de <strong>{invitation?.inviterEmail}</strong>{' '}
                  sin perderlos, escríbenos a <strong>hola@huella.app</strong> y te ayudamos
                  a unificar tu historial.
                </>
              ) : (
                <>
                  Ya tienes episodios o registros en tu cuenta. Para unirte a la familia de{' '}
                  <strong>{invitation?.inviterEmail}</strong> sin perder tus datos, escríbenos
                  y te ayudamos a unificar tu historial.
                </>
              )}
            </p>
            <a
              href="mailto:hola@huella.app"
              className={styles.btnPrimary}
            >
              Contactar soporte
            </a>
            <Link to="/panel" className={styles.btnSecondary}>Ir a mi panel</Link>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.center}>
            <div className={styles.icon}>⚠️</div>
            <h2 className={styles.title}>No se pudo aceptar</h2>
            <p className={styles.subtitle}>{errorMsg}</p>
            <Link to="/perfil" className={styles.btnPrimary}>Ir a mi perfil</Link>
          </div>
        )}
      </div>
    </div>
  )
}
