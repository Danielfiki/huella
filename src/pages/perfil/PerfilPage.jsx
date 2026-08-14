import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, User, Mail, Baby, CheckCircle, Heart, Camera, Users, Copy, Check, X, Plus, UserCircle, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useHuella, calcularEdad } from '../../context/HuellaContext'
import { useFamily } from '../../context/FamilyContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import UpgradeModal from '../../components/ui/UpgradeModal'
import styles from './PerfilPage.module.css'

function isoToDisplay(iso) {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function displayToIso(display) {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8)
  const date = new Date(`${y}-${m}-${d}`)
  if (isNaN(date.getTime()) || date.getMonth() + 1 !== Number(m)) return ''
  return `${y}-${m}-${d}`
}

async function compressImage(file, maxSize = 400) {
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
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const { state, setHijo, savePadreNombre, savePadreAvatar, isPro, isAdmin, dataLoading } = useHuella()
  const { family, pendingInvitation, familyLoading, invitePartner, cancelInvitation, disconnectPartner } = useFamily()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)
  const padreInputRef = useRef(null)
  const padreAvatarInputRef = useRef(null)

  // Gate 2do hijo: free está limitado a 1 hijo; Pro/Admin, ilimitados.
  const [showUpgrade, setShowUpgrade] = useState(false)
  function handleAgregarHijo() {
    if (!isPro() && state.hijos.length >= 1) { setShowUpgrade(true); return }
    navigate('/hijo?nuevo=true')
  }

  const [nombre, setNombre] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [fechaDisplay, setFechaDisplay] = useState('')
  const [genero, setGenero] = useState('')
  const [loadingHijo, setLoadingHijo] = useState(false)
  const [errorHijo, setErrorHijo] = useState('')
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [loadingSignOut, setLoadingSignOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [errorAvatar, setErrorAvatar] = useState('')

  const [padreNombre, setPadreNombre] = useState('')
  const [guardadoPadreOk, setGuardadoPadreOk] = useState(false)
  const [uploadingPadreAvatar, setUploadingPadreAvatar] = useState(false)
  const [errorPadreAvatar, setErrorPadreAvatar] = useState('')

  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  // Familia
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteEmailSent, setInviteEmailSent] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [familyError, setFamilyError] = useState('')

  useEffect(() => {
    if (state.hijo) {
      setNombre(state.hijo.nombre || '')
      setFechaNacimiento(state.hijo.fechaNacimiento || '')
      setFechaDisplay(isoToDisplay(state.hijo.fechaNacimiento || ''))
      setGenero(state.hijo.genero || '')
    }
  }, [state.hijo])

  useEffect(() => {
    if (state.padreNombre) setPadreNombre(state.padreNombre)
  }, [state.padreNombre])

  async function handleGuardarPadre(e) {
    e.preventDefault()
    if (!user?.id) return
    try {
      await savePadreNombre(padreNombre.trim())
      setGuardadoPadreOk(true)
      setTimeout(() => setGuardadoPadreOk(false), 2500)
    } catch {
      // el estado optimista ya se aplicó en el contexto; el error es silencioso
    }
  }

  // Foto del cuidador. Mismo camino que handleAvatarChange (comprimir →
  // subir al bucket `avatares` dentro de la carpeta del usuario → guardar el
  // PATH en la BD). El nombre de archivo es fijo `cuidador.jpg`: los avatares
  // de hijos se llaman con el UUID del hijo, asi que nunca chocan, y con
  // upsert:true cada foto nueva reemplaza la anterior sin dejar basura.
  async function handlePadreAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPadreAvatar(true)
    setErrorPadreAvatar('')
    try {
      const blob = await compressImage(file)
      if (!blob) throw new Error('No se pudo procesar la imagen.')
      const path = `${user.id}/cuidador.jpg`
      const { error: uploadError } = await supabase.storage.from('avatares').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (uploadError) throw new Error(uploadError.message)
      await savePadreAvatar(path)
    } catch (err) {
      console.error('Error subiendo foto del cuidador:', err)
      setErrorPadreAvatar('No se pudo subir la foto. Asegúrate de tener conexión e intenta de nuevo.')
    } finally {
      setUploadingPadreAvatar(false)
      if (padreAvatarInputRef.current) padreAvatarInputRef.current.value = ''
    }
  }

  function handleFechaChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let display = digits
    if (digits.length > 4) display = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
    else if (digits.length > 2) display = `${digits.slice(0,2)}/${digits.slice(2)}`
    setFechaDisplay(display)
    const iso = displayToIso(display)
    setFechaNacimiento(iso || (digits.length === 0 ? '' : fechaNacimiento))
  }

  async function handleGuardarHijo(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoadingHijo(true)
    setErrorHijo('')
    setGuardadoOk(false)
    try {
      await Promise.all([
        setHijo({
          nombre:          nombre.trim(),
          avatarUrl:       state.hijo?.avatarUrl ?? null,
          fechaNacimiento: fechaNacimiento || null,
          genero:          genero || null,
        }, state.hijo?.id ?? null),
        padreNombre.trim() ? savePadreNombre(padreNombre.trim()) : Promise.resolve(),
      ])
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)
    } catch {
      setErrorHijo('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setLoadingHijo(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user || !state.hijo?.id) return
    setUploadingAvatar(true)
    setErrorAvatar('')
    try {
      const blob = await compressImage(file)
      if (!blob) throw new Error('No se pudo procesar la imagen.')
      const path = `${user.id}/${state.hijo.id}.jpg`
      const { error: uploadError } = await supabase.storage.from('avatares').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (uploadError) throw new Error(uploadError.message)
      // Bucket privado: se guarda el PATH; setHijo firma la URL para mostrar.
      await setHijo({
        nombre:          nombre.trim() || state.hijo?.nombre || '',
        avatarUrl:       path,
        fechaNacimiento: fechaNacimiento || state.hijo?.fechaNacimiento || null,
        genero:          genero || state.hijo?.genero || null,
      }, state.hijo?.id ?? null)
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      setErrorAvatar('No se pudo subir la foto. Asegúrate de tener conexión e intenta de nuevo.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  async function handleEliminarCuenta() {
    setEliminandoCuenta(true)
    setErrorEliminar('')
    try {
      const { error } = await supabase.rpc('delete_user')
      if (error) throw new Error(error.message)
      await signOut()
      navigate('/login')
    } catch (e) {
      setErrorEliminar('No se pudo eliminar la cuenta. Intenta de nuevo o escribe a danielundurraga.r@gmail.com')
      setEliminandoCuenta(false)
      setConfirmandoEliminar(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteError('')
    setInviteLink('')
    try {
      const { url, emailSent } = await invitePartner(inviteEmail.trim().toLowerCase())
      setInviteLink(url)
      setInviteEmailSent(emailSent)
      setInviteEmail('')
    } catch (err) {
      setInviteError(err.message || 'No se pudo enviar la invitación')
    } finally {
      setInviteLoading(false)
    }
  }

  function handleCopyLink(link) {
    const url = link || (pendingInvitation ? `${window.location.origin}/invitar?token=${pendingInvitation.token}` : '')
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  async function handleDisconnect() {
    setDisconnectLoading(true)
    setFamilyError('')
    try {
      await disconnectPartner()
      setConfirmDisconnect(false)
    } catch (err) {
      setFamilyError(err.message || 'No se pudo desconectar')
    } finally {
      setDisconnectLoading(false)
    }
  }

  async function handleSignOut() {
    setLoadingSignOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch {
      setLoadingSignOut(false)
    }
  }

  const necesitaCompletarNombre = !dataLoading && !state.padreNombre?.trim()

  function scrollAPadre() {
    padreInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => padreInputRef.current?.focus(), 350)
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.titulo}>Perfil</h2>

      {necesitaCompletarNombre && (
        <button
          type="button"
          className={styles.nombreBanner}
          onClick={scrollAPadre}
        >
          <span className={styles.nombreBannerIcon} aria-hidden="true">
            <UserCircle size={18} />
          </span>
          <span className={styles.nombreBannerText}>
            Completa tu nombre para que tu familia lo vea junto a los episodios que registras.
          </span>
        </button>
      )}

      {/* ── Padre/madre ──────────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Heart size={18} color="var(--color-primary)" />
          <h3 className={styles.sectionTitle}>Tú</h3>
        </div>
        <p className={styles.sectionDesc}>
          Así te llamará Huella en el saludo del panel.
        </p>

        <input
          ref={padreAvatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePadreAvatarChange}
        />
        <div
          className={`${styles.avatarWrap} ${uploadingPadreAvatar ? styles.avatarLoading : ''}`}
          onClick={() => !uploadingPadreAvatar && padreAvatarInputRef.current?.click()}
        >
          {state.padreAvatarUrl ? (
            <img src={state.padreAvatarUrl} alt="Tu foto" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <UserCircle size={34} color="var(--color-primary-light)" />
            </div>
          )}
          <div className={styles.avatarCamara}>
            <Camera size={13} color="white" />
          </div>
        </div>
        {errorPadreAvatar && <p className={styles.error}>{errorPadreAvatar}</p>}

        <form onSubmit={handleGuardarPadre} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>¿Cómo te llamamos?</label>
            <input
              ref={padreInputRef}
              className={styles.input}
              type="text"
              placeholder="Tu nombre"
              value={padreNombre}
              onChange={(e) => setPadreNombre(e.target.value)}
              maxLength={40}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            fullWidth
            disabled={!padreNombre.trim()}
          >
            {guardadoPadreOk ? (
              <><CheckCircle size={15} /> Guardado</>
            ) : (
              'Guardar'
            )}
          </Button>
        </form>
      </Card>

      {/* ── Huella Pro ───────────────────────────────── */}
      <Card className={styles.proCard}>
        <div className={styles.proHeader}>
          <div className={styles.proTitleWrap}>
            <Sparkles size={18} color={isPro() ? 'var(--color-success)' : 'var(--color-primary)'} />
            <h3 className={styles.proTitle}>Huella Pro</h3>
          </div>
          <span className={`${styles.proChip} ${isPro() ? styles.proChipActive : styles.proChipFree}`}>
            {isAdmin() ? 'Admin' : isPro() ? 'Activo' : 'Plan Gratuito'}
          </span>
        </div>

        {isPro() ? (
          <Link to="/cuenta" className={styles.proManageLink}>
            Gestionar plan
          </Link>
        ) : (
          <>
            <p className={styles.proBenefit}>
              Desbloquea episodios ilimitados, todos los planes de estrategia y el acompañamiento completo de Huella.
            </p>
            <Link to="/cuenta" className={styles.proCta}>
              Conocer Pro
              <ArrowRight size={16} />
            </Link>
          </>
        )}
      </Card>

      {/* ── Hijo ─────────────────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Baby size={18} color="var(--color-primary)" />
          <h3 className={styles.sectionTitle}>
            {state.hijo ? 'Tu hijo/a' : 'Cuéntanos sobre tu hijo/a'}
          </h3>
        </div>
        {!state.hijo && (
          <p className={styles.sectionDesc}>
            Con el nombre y la edad, Huella personaliza cada orientación.
          </p>
        )}

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
        <div
          className={`${styles.avatarWrap} ${uploadingAvatar ? styles.avatarLoading : ''}`}
          onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
        >
          {state.hijo?.avatarUrl ? (
            <img src={state.hijo.avatarUrl} alt="Avatar" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <Baby size={34} color="var(--color-primary-light)" />
            </div>
          )}
          <div className={styles.avatarCamara}>
            <Camera size={13} color="white" />
          </div>
        </div>
        {errorAvatar && <p className={styles.error}>{errorAvatar}</p>}

        <form onSubmit={handleGuardarHijo} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre</label>
            <input
              className={styles.input}
              type="text"
              placeholder="¿Cómo se llama?"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Fecha de nacimiento</label>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              value={fechaDisplay}
              onChange={handleFechaChange}
              maxLength={10}
            />
            {fechaNacimiento && (() => {
              const e = calcularEdad(fechaNacimiento)
              return e != null
                ? <p className={styles.edadPreview}>{e} {e === 1 ? 'año' : 'años'}</p>
                : null
            })()}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Es...</label>
            <div className={styles.generoGroup}>
              {[
                { val: 'm',  label: '👦 Niño' },
                { val: 'f',  label: '👧 Niña' },
                { val: 'nb', label: '🙂 Otro' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  className={`${styles.generoBtn} ${genero === val ? styles.generoBtnActivo : ''}`}
                  onClick={() => setGenero(genero === val ? '' : val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {errorHijo && <p className={styles.error}>{errorHijo}</p>}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!nombre.trim()}
            loading={loadingHijo}
          >
            {guardadoOk ? (
              <><CheckCircle size={15} /> Guardado</>
            ) : (
              state.hijo ? 'Actualizar' : 'Guardar'
            )}
          </Button>
        </form>

        {(!family || family.role === 'owner') && (
          <button
            type="button"
            className={styles.agregarHijoBtn}
            onClick={handleAgregarHijo}
          >
            <Plus size={14} />
            Agregar otro hijo/a
          </button>
        )}
      </Card>

      {/* ── Mi Familia ───────────────────────────────── */}
      <Card>
        <div className={styles.sectionHeader}>
          <Users size={18} color="var(--color-primary)" />
          <h3 className={styles.sectionTitle}>Mi familia</h3>
        </div>

        {familyLoading ? (
          <p className={styles.sectionDesc}>Cargando…</p>
        ) : family?.partner ? (
          /* Estado C: pareja conectada */
          <div className={styles.familyConnected}>
            <div className={styles.familyPartnerRow}>
              <div className={styles.familyDot} />
              <div>
                <p className={styles.familyPartnerLabel}>Pareja conectada</p>
                <p className={styles.familyPartnerEmail}>{family.partner.email}</p>
              </div>
            </div>
            {familyError && <p className={styles.error}>{familyError}</p>}
            {family.role === 'owner' && (
              confirmDisconnect ? (
                <div className={styles.familyConfirmRow}>
                  <p className={styles.familyConfirmText}>¿Desconectar a {family.partner.email}? Dejarán de compartir datos.</p>
                  <div className={styles.familyConfirmBtns}>
                    <button className={styles.familyCancelBtn} onClick={() => setConfirmDisconnect(false)} disabled={disconnectLoading}>
                      Cancelar
                    </button>
                    <button className={styles.familyDisconnectBtn} onClick={handleDisconnect} disabled={disconnectLoading}>
                      {disconnectLoading ? 'Desconectando…' : 'Sí, desconectar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button className={styles.familyTextBtn} onClick={() => setConfirmDisconnect(true)}>
                  Desconectar pareja
                </button>
              )
            )}
          </div>
        ) : pendingInvitation?.status === 'rejected_pending_data' ? (
          /* Estado D: la pareja intentó aceptar pero tenía datos previos */
          <div className={styles.familyRejected}>
            <p className={styles.familyRejectedTitle}>
              <span className={styles.familyRejectedIcon} aria-hidden="true">📋</span>
              Tu pareja no pudo unirse
            </p>
            <p className={styles.familyRejectedDesc}>
              <strong>{pendingInvitation.inviteeEmail}</strong> ya tiene datos en su propia cuenta.
              Contáctanos a <strong>contacto@huella.lat</strong> para ayudarles a unificar el historial.
            </p>
            <button
              className={styles.familyDiscardBtn}
              onClick={cancelInvitation}
            >
              Descartar invitación
            </button>
          </div>
        ) : pendingInvitation || inviteLink ? (
          /* Estado B: invitación pendiente */
          <div className={styles.familyPending}>
            {inviteEmailSent === true ? (
              <p className={styles.inviteStatusOk}>
                Email enviado a <strong>{pendingInvitation?.inviteeEmail}</strong>. También puedes copiar el link.
              </p>
            ) : inviteEmailSent === false ? (
              <p className={styles.inviteStatusWarn}>
                No pudimos enviar el email automáticamente. Comparte el link con <strong>{pendingInvitation?.inviteeEmail}</strong>.
              </p>
            ) : (
              <p className={styles.sectionDesc} style={{ marginBottom: 0 }}>
                Invitación pendiente para <strong>{pendingInvitation?.inviteeEmail}</strong>. Comparte el link para que pueda aceptarla.
              </p>
            )}
            <div className={styles.familyLinkBox}>
              <span className={styles.familyLinkText}>
                {inviteLink || `${window.location.origin}/invitar?token=${pendingInvitation?.token}`}
              </span>
              <button
                className={styles.familyCopyBtn}
                onClick={() => handleCopyLink(inviteLink)}
                title="Copiar link"
              >
                {copiedLink ? <Check size={15} color="var(--color-success)" /> : <Copy size={15} />}
              </button>
            </div>
            <button
              className={styles.familyTextBtn}
              onClick={cancelInvitation}
            >
              Cancelar invitación
            </button>
          </div>
        ) : (
          /* Estado A: sin pareja */
          <>
            <p className={styles.sectionDesc}>
              Invita a tu pareja para registrar episodios y ver el progreso juntos.
            </p>
            <form onSubmit={handleInvite} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Email de tu pareja</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="pareja@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              {inviteError && <p className={styles.error}>{inviteError}</p>}
              <Button
                type="submit"
                variant="secondary"
                fullWidth
                disabled={!inviteEmail.trim()}
                loading={inviteLoading}
              >
                Enviar invitación
              </Button>
            </form>
          </>
        )}
      </Card>

      {/* ── Estadísticas ─────────────────────────────── */}
      <Card className={styles.statsCard}>
        <h3 className={styles.sectionTitle}>Tu actividad</h3>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{state.episodios.length}</span>
            <span className={styles.statLabel}>Episodios</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{state.hitos.length}</span>
            <span className={styles.statLabel}>Hitos</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{state.estrategias.length}</span>
            <span className={styles.statLabel}>Estrategias</span>
          </div>
        </div>
      </Card>

      {/* ── Cuenta ───────────────────────────────────── */}
      <Card className={styles.cuentaCard}>
        <div className={styles.sectionHeader}>
          <User size={18} color="var(--color-text-muted)" />
          <h3 className={styles.sectionTitle}>Cuenta</h3>
        </div>
        <div className={styles.emailRow}>
          <Mail size={14} color="var(--color-text-muted)" />
          <span className={styles.emailText}>{user?.email}</span>
        </div>
      </Card>

      <button className={styles.signOutLink} onClick={handleSignOut} disabled={loadingSignOut}>
        {loadingSignOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>

      {!confirmandoEliminar ? (
        <button className={styles.eliminarLink} onClick={() => setConfirmandoEliminar(true)}>
          Eliminar cuenta
        </button>
      ) : (
        <Card className={styles.eliminarCard}>
          <p className={styles.eliminarAviso}>
            ⚠️ Esto eliminará tu cuenta y todos tus datos permanentemente. Esta acción no se puede deshacer.
          </p>
          {errorEliminar && <p className={styles.error}>{errorEliminar}</p>}
          <div className={styles.eliminarBtns}>
            <button
              className={styles.eliminarCancelarBtn}
              onClick={() => { setConfirmandoEliminar(false); setErrorEliminar('') }}
              disabled={eliminandoCuenta}
            >
              Cancelar
            </button>
            <button
              className={styles.eliminarConfirmarBtn}
              onClick={handleEliminarCuenta}
              disabled={eliminandoCuenta}
            >
              {eliminandoCuenta ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
            </button>
          </div>
        </Card>
      )}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        <Link to="/terminos" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          Términos y privacidad
        </Link>
      </p>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          tituloCustom="Cada hijo tiene su huella"
          mensajeCustom="Con Huella Pro registras a todos tus hijos y acompañas la huella única de cada uno."
        />
      )}
    </div>
  )
}
