import React, { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUp, ArrowDown, Minus, Settings, ArrowLeft } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import styles from './HijoPage.module.css'
import RutinaDiaria from './RutinaDiaria'

// ── Helpers ───────────────────────────────────────────────────────────────

function toDateStr(fecha) {
  return new Date(fecha).toISOString().slice(0, 10)
}

function calcularRacha(episodios, hitos) {
  const set = new Set([
    ...episodios.map((e) => toDateStr(e.fecha)),
    ...hitos.map((h) => toDateStr(h.fecha)),
  ])
  if (set.size === 0) return 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!set.has(toDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!set.has(toDateStr(cursor))) return 0
  }
  let streak = 0
  while (set.has(toDateStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function frasePorRacha(racha, nombre) {
  const n = nombre || 'tu hijo/a'
  if (racha === 0) return `Registra algo hoy para empezar tu racha con ${n} 🌱`
  if (racha === 1) return `Llevas 1 día acompañando a ${n} 🌱`
  if (racha < 4) return `Llevas ${racha} días seguidos con ${n} 🌿`
  if (racha < 7) return `${racha} días consecutivos. Estás construyendo un hábito 🌿`
  if (racha < 14) return `¡${racha} días seguidos acompañando a ${n}! 🌟`
  if (racha < 30) return `${racha} días. Tu constancia ya tiene raíces 🌳`
  return `${racha} días de presencia consciente junto a ${n} 🏆`
}

function calcularEvolucion(episodios) {
  const now = new Date()
  const mes = now.getMonth()
  const anio = now.getFullYear()
  const mesPrev = mes === 0 ? 11 : mes - 1
  const anioPrev = mes === 0 ? anio - 1 : anio
  const este = episodios.filter((e) => {
    const d = new Date(e.fecha)
    return d.getMonth() === mes && d.getFullYear() === anio
  }).length
  const anterior = episodios.filter((e) => {
    const d = new Date(e.fecha)
    return d.getMonth() === mesPrev && d.getFullYear() === anioPrev
  }).length
  const diff = este - anterior
  const pct = anterior > 0 ? Math.round((Math.abs(diff) / anterior) * 100) : null
  return { este, anterior, diff, pct }
}

function calcularLogrosRecientes(data) {
  const { episodios, hitos, estrategias } = data
  const diasActivos = (() => {
    const fechas = [...episodios.map((e) => e.fecha), ...hitos.map((h) => h.fecha)]
    if (!fechas.length) return 0
    const oldest = Math.min(...fechas.map((f) => new Date(f).getTime()))
    return Math.floor((Date.now() - oldest) / 86400000)
  })()

  const BADGES = [
    { emoji: '🌟', titulo: 'Primer paso',    check: () => episodios.length >= 1,  getDate: () => episodios.at(-1)?.fecha },
    { emoji: '📊', titulo: 'Observador',     check: () => episodios.length >= 5,  getDate: () => episodios[episodios.length - 5]?.fecha },
    { emoji: '🔍', titulo: 'Analista',       check: () => episodios.length >= 10, getDate: () => episodios[episodios.length - 10]?.fecha },
    { emoji: '💛', titulo: 'Primer avance',  check: () => hitos.length >= 1,      getDate: () => hitos.at(-1)?.fecha },
    { emoji: '🏅', titulo: 'Coleccionista',  check: () => hitos.length >= 5,      getDate: () => hitos[hitos.length - 5]?.fecha },
    { emoji: '🎯', titulo: 'Estratega',      check: () => estrategias.length >= 1, getDate: () => estrategias.at(-1)?.fechaInicio },
    { emoji: '🏆', titulo: '4 semanas',      check: () => estrategias.some((e) => e.semanaActual >= 4), getDate: () => estrategias.find((e) => e.semanaActual >= 4)?.fechaInicio },
    { emoji: '📅', titulo: 'Un mes',         check: () => diasActivos >= 30,      getDate: () => null },
    { emoji: '🔥', titulo: 'Semana activa',  check: () => episodios.length >= 7,  getDate: () => episodios[episodios.length - 7]?.fecha },
    { emoji: '🌈', titulo: 'Multihabilidad', check: () => estrategias.length >= 3, getDate: () => estrategias[estrategias.length - 3]?.fechaInicio },
    { emoji: '💎', titulo: 'Experto',        check: () => episodios.length >= 25, getDate: () => episodios[episodios.length - 25]?.fecha },
    { emoji: '🤝', titulo: 'Mentor',         check: () => hitos.length >= 10,     getDate: () => hitos[hitos.length - 10]?.fecha },
  ]

  return BADGES.filter((b) => b.check())
    .map((b) => ({ ...b, fecha: b.getDate() }))
    .filter((b) => b.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 3)
}

// ── Helpers fecha (modo creación) ─────────────────────────────────────────

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

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const HITO_EMOJIS = { autorregulacion: '🌱', empatia: '💛', disculpa: '🤝', frustration: '💪', social: '👫', otro: '⭐' }

// ── Componente ────────────────────────────────────────────────────────────

export default function HijoPage() {
  const { state, setHijo } = useHuella()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { hijo, episodios, hitos, estrategias } = state

  const esNuevo = searchParams.get('nuevo') === 'true'

  // Estados del formulario de creación (siempre declarados — regla de hooks)
  const [seccion, setSeccion]             = useState('perfil')
  const [nombre, setNombre]               = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [fechaDisplay, setFechaDisplay]   = useState('')
  const [genero, setGenero]               = useState('')
  const [loadingCrear, setLoadingCrear]   = useState(false)
  const [errorCrear, setErrorCrear]       = useState('')

  function handleFechaChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let display = digits
    if (digits.length > 4) display = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
    else if (digits.length > 2) display = `${digits.slice(0,2)}/${digits.slice(2)}`
    setFechaDisplay(display)
    const iso = displayToIso(display)
    setFechaNacimiento(iso || (digits.length === 0 ? '' : fechaNacimiento))
  }

  async function handleCrear(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoadingCrear(true)
    setErrorCrear('')
    try {
      await setHijo({
        nombre:          nombre.trim(),
        avatarUrl:       null,
        fechaNacimiento: fechaNacimiento || null,
        genero:          genero || null,
      }, null)
      navigate('/hijo')
    } catch {
      setErrorCrear('No se pudo crear. Intenta de nuevo.')
    } finally {
      setLoadingCrear(false)
    }
  }

  // ── Modo creación ─────────────────────────────────────────────────────────
  if (esNuevo) {
    return (
      <div className={styles.page}>
        <div className={styles.formHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className={styles.formTitulo}>Nuevo hijo/a</h2>
        </div>

        <Card>
          <form onSubmit={handleCrear} className={styles.form}>
            <div className={styles.campo}>
              <label className={styles.campoLabel}>
                Nombre <span className={styles.required}>*</span>
              </label>
              <input
                className={styles.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del niño/a"
                autoFocus
              />
            </div>

            <div className={styles.campo}>
              <label className={styles.campoLabel}>Fecha de nacimiento</label>
              <input
                className={styles.input}
                value={fechaDisplay}
                onChange={handleFechaChange}
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
              />
            </div>

            <div className={styles.campo}>
              <label className={styles.campoLabel}>Género</label>
              <div className={styles.generoRow}>
                {[['m', 'Niño'], ['f', 'Niña'], ['nb', 'Otro']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`${styles.generoBtn} ${genero === val ? styles.generoBtnActivo : ''}`}
                    onClick={() => setGenero((g) => g === val ? '' : val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {errorCrear && <p className={styles.formError}>{errorCrear}</p>}

            <button
              type="submit"
              className={styles.guardarBtn}
              disabled={!nombre.trim() || loadingCrear}
            >
              {loadingCrear ? 'Guardando…' : 'Crear hijo/a'}
            </button>
          </form>
        </Card>
      </div>
    )
  }

  // ── Modo vista vacía ──────────────────────────────────────────────────────
  if (!hijo) {
    return (
      <div className={styles.page}>
        <div className={styles.vacio}>
          <span style={{ fontSize: 48 }}>👶</span>
          <p>Configura el perfil de tu hijo/a para ver esta página.</p>
          <button className={styles.editarBtn} onClick={() => navigate('/perfil')}>
            Ir al perfil →
          </button>
        </div>
      </div>
    )
  }

  // ── Modo stats ────────────────────────────────────────────────────────────
  const racha        = calcularRacha(episodios, hitos)
  const evolucion    = calcularEvolucion(episodios)
  const logros       = calcularLogrosRecientes({ episodios, hitos, estrategias })
  const ultimosHitos = [...hitos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5)
  const nombreMesActual = MESES[new Date().getMonth()]

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <button className={styles.editarIconBtn} onClick={() => navigate('/perfil')} title="Editar perfil">
          <Settings size={16} />
        </button>
        <div className={styles.avatarWrap}>
          {hijo.avatarUrl
            ? <img src={hijo.avatarUrl} alt={hijo.nombre} className={styles.avatar} />
            : <div className={styles.avatarPlaceholder}>{hijo.nombre?.[0]?.toUpperCase() || '?'}</div>
          }
        </div>
        <h1 className={styles.nombre}>{hijo.nombre}</h1>
        {hijo.edad != null && (
          <p className={styles.edad}>{hijo.edad} {hijo.edad === 1 ? 'año' : 'años'}</p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${seccion === 'perfil' ? styles.tabActivo : ''}`}
          onClick={() => setSeccion('perfil')}
        >
          Perfil
        </button>
        <button
          className={`${styles.tab} ${seccion === 'rutina' ? styles.tabActivo : ''}`}
          onClick={() => setSeccion('rutina')}
        >
          Rutina diaria
        </button>
      </div>

      {seccion === 'rutina' && <RutinaDiaria />}

      {seccion === 'perfil' && <>

      {/* ── Racha ── */}
      <div className={styles.rachaCard}>
        <div className={styles.rachaTop}>
          <span className={styles.rachaNumero}>{racha}</span>
          <span className={styles.rachaDias}>{racha === 1 ? 'día' : 'días'} seguidos</span>
          <span className={styles.rachaFlama}>🔥</span>
        </div>
        <p className={styles.rachaFrase}>{frasePorRacha(racha, hijo.nombre)}</p>
      </div>

      {/* ── Evolución ── */}
      <Card>
        <p className={styles.seccionLabel}>Episodios en {nombreMesActual}</p>
        <div className={styles.evolucionRow}>
          <div className={styles.evolucionNum}>
            <span className={styles.evolucionCifra}>{evolucion.este}</span>
            <span className={styles.evolucionSub}>este mes</span>
          </div>
          <div className={styles.evolucionSep} />
          <div className={styles.evolucionNum}>
            <span className={styles.evolucionCifra} style={{ color: 'var(--color-text-muted)' }}>{evolucion.anterior}</span>
            <span className={styles.evolucionSub}>mes anterior</span>
          </div>
          <div className={styles.evolucionTendencia}>
            {evolucion.diff === 0 || evolucion.anterior === 0 ? (
              <><Minus size={18} color="var(--color-text-muted)" /><span className={styles.evolucionPct} style={{ color: 'var(--color-text-muted)' }}>sin cambio</span></>
            ) : evolucion.diff < 0 ? (
              <><ArrowDown size={18} color="var(--color-success)" /><span className={styles.evolucionPct} style={{ color: 'var(--color-success)' }}>{evolucion.pct != null ? `${evolucion.pct}% menos` : 'bajó'}</span></>
            ) : (
              <><ArrowUp size={18} color="var(--color-danger)" /><span className={styles.evolucionPct} style={{ color: 'var(--color-danger)' }}>{evolucion.pct != null ? `${evolucion.pct}% más` : 'subió'}</span></>
            )}
          </div>
        </div>
        {evolucion.diff < 0 && (
          <p className={styles.evolucionMsg}>📉 Menos episodios que el mes pasado. Algo está funcionando.</p>
        )}
        {evolucion.diff > 0 && evolucion.anterior > 0 && (
          <p className={styles.evolucionMsg}>Sigue registrando para identificar qué está pasando.</p>
        )}
      </Card>

      {/* ── Logros recientes ── */}
      {logros.length > 0 && (
        <div>
          <p className={styles.seccionTitulo}>Logros recientes</p>
          <div className={styles.logrosRow}>
            {logros.map((b, i) => (
              <div key={i} className={styles.logroChip}>
                <span className={styles.logroEmoji}>{b.emoji}</span>
                <span className={styles.logroTitulo}>{b.titulo}</span>
                <span className={styles.logroFecha}>{new Date(b.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Línea de tiempo de hitos ── */}
      {ultimosHitos.length > 0 && (
        <div>
          <p className={styles.seccionTitulo}>Avances positivos</p>
          <Card className={styles.timelineCard}>
            {ultimosHitos.map((h, i) => (
              <div key={h.id} className={`${styles.timelineItem} ${i === ultimosHitos.length - 1 ? styles.timelineLast : ''}`}>
                <span className={styles.timelineEmoji}>{HITO_EMOJIS[h.categoria] || '⭐'}</span>
                <div className={styles.timelineTexto}>
                  <p className={styles.timelineDesc}>{h.descripcion}</p>
                  <p className={styles.timelineFecha}>{new Date(h.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {hitos.length === 0 && (
        <Card className={styles.hitoVacioCard}>
          <p>Aún no hay avances registrados. Cuando notes algo positivo en {hijo.nombre}, regístralo en Logros.</p>
        </Card>
      )}

      {/* ── Álbum de momentos ── */}
      {(() => {
        const momentos = [...hitos]
          .filter((h) => h.foto_url)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        if (momentos.length === 0) return null
        return (
          <div>
            <p className={styles.seccionTitulo}>Álbum de crecimiento</p>
            <div className={styles.albumGrid}>
              {momentos.map((h) => (
                <div key={h.id} className={styles.albumItem}>
                  <img src={h.foto_url} alt={h.descripcion} className={styles.albumImg} />
                  <div className={styles.albumMeta}>
                    <span className={styles.albumFecha}>
                      {new Date(h.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                    </span>
                    {h.descripcion && (
                      <span className={styles.albumDesc}>{h.descripcion}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      </>}

    </div>
  )
}
