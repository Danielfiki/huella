import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Settings, ArrowLeft, ArrowRight,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import s from './HijoPage.module.css'
import RutinaDiaria from './RutinaDiaria'

// ── Helpers ───────────────────────────────────────────────────────────────

function toDateStr(fecha) {
  return new Date(fecha).toISOString().slice(0, 10)
}

function calcularRacha(episodios, hitos) {
  // Permite 1 "día de gracia" por racha: un gap de 1 día no rompe la
  // racha. Un gap de 2 días seguidos sí la rompe. Una vez gastado el
  // freeze (sea porque hoy no hay actividad pero ayer sí, sea porque
  // saltamos un gap interno), cualquier gap adicional la rompe.
  const set = new Set([
    ...episodios.map((e) => toDateStr(e.fecha)),
    ...hitos.map((h) => toDateStr(h.fecha)),
  ])
  if (set.size === 0) return { streak: 0, usedFreeze: false }

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  let freezeUsed = false
  if (!set.has(toDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!set.has(toDateStr(cursor))) return { streak: 0, usedFreeze: false }
    freezeUsed = true
  }

  let streak = 0
  while (true) {
    if (set.has(toDateStr(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (!freezeUsed) {
      const peek = new Date(cursor)
      peek.setDate(cursor.getDate() - 1)
      if (set.has(toDateStr(peek))) {
        freezeUsed = true
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    } else {
      break
    }
  }
  return { streak, usedFreeze: freezeUsed }
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

// Mapeo de título de badge → tono semántico (paleta de Logros).
// Se aplica solo a la presentación; la lógica de calcularLogrosRecientes
// queda intacta. La unificación con NIVELES de HitosPage es trabajo
// futuro registrado como deuda.
const TONO_POR_TITULO = {
  'Primer paso':    'base',
  'Observador':     'base',
  'Analista':       'base',
  'Primer avance':  'celebracion',
  'Coleccionista': 'celebracion',
  'Estratega':      'constancia',
  '4 semanas':      'estrella',
  'Un mes':         'constancia',
  'Semana activa':  'constancia',
  'Multihabilidad': 'estrella',
  'Experto':        'base',
  'Mentor':         'celebracion',
}

// ── Componente ────────────────────────────────────────────────────────────

export default function HijoPage() {
  const { state, setHijo } = useHuella()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hijo, episodios, hitos, estrategias } = state

  const esNuevo = searchParams.get('nuevo') === 'true'

  // Estados del formulario de creación (siempre declarados — regla de hooks)
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
      <div className={s.page}>
        <div className={s.formHeader}>
          <button
            type="button"
            className={s.backBtn}
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className={s.formTitulo}>Nuevo hijo/a</h2>
        </div>

        <Card>
          <form onSubmit={handleCrear} className={s.form}>
            <div className={s.campo}>
              <label className={s.campoLabel}>
                Nombre <span className={s.required}>*</span>
              </label>
              <input
                className={s.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del niño/a"
                autoFocus
              />
            </div>

            <div className={s.campo}>
              <label className={s.campoLabel}>Fecha de nacimiento</label>
              <input
                className={s.input}
                value={fechaDisplay}
                onChange={handleFechaChange}
                placeholder="DD/MM/AAAA"
                inputMode="numeric"
              />
            </div>

            <div className={s.campo}>
              <label className={s.campoLabel}>Género</label>
              <div className={s.generoRow}>
                {[['m', 'Niño'], ['f', 'Niña'], ['nb', 'Otro']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    className={`${s.generoBtn} ${genero === val ? s.generoBtnActivo : ''}`}
                    onClick={() => setGenero((g) => g === val ? '' : val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {errorCrear && <p className={s.formError}>{errorCrear}</p>}

            <button
              type="submit"
              className={s.guardarBtn}
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
      <div className={s.page}>
        <div className={s.vacio}>
          <span style={{ fontSize: 48 }}>👶</span>
          <p>Configura el perfil de tu hijo/a para ver esta página.</p>
          <button className={s.editarBtn} onClick={() => navigate('/perfil')}>
            Ir al perfil →
          </button>
        </div>
      </div>
    )
  }

  // ── Modo stats (Refugio) ──────────────────────────────────────────────────
  const { streak: diasRacha, usedFreeze: rachaUsoFreeze } = calcularRacha(episodios, hitos)
  const evolBase = calcularEvolucion(episodios)
  const logrosBase = calcularLogrosRecientes({ episodios, hitos, estrategias })
  const ultimosHitos = [...hitos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 3)

  // Derivar shape esperado por el JSX (sin tocar selectores).
  const mesActualIdx = new Date().getMonth()
  const mesAnteriorIdx = mesActualIdx === 0 ? 11 : mesActualIdx - 1
  const evolucion = {
    actual: evolBase.este,
    anterior: evolBase.anterior > 0 ? evolBase.anterior : null,
    mesActualLabel: MESES[mesActualIdx],
    mesAnteriorLabel: MESES[mesAnteriorIdx],
    interpretacion: evolBase.diff < 0
      ? '📉 Menos episodios que el mes pasado. Algo está funcionando.'
      : (evolBase.diff > 0 && evolBase.anterior > 0
          ? 'Sigue registrando para identificar qué está pasando.'
          : ''),
  }

  // rachaInicio derivado: hoy - (diasRacha - 1).
  const rachaInicio = (() => {
    if (diasRacha === 0) return null
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (diasRacha - 1))
    return d.toISOString()
  })()

  // calcularRacha no expone la fecha del freeze. Queda null y el chip
  // omite la parte "· {fecha}" cuando no hay dato.
  const rachaUltimoFreezeDate = null

  const logrosRecientes = logrosBase.map((b) => ({
    id: b.titulo,
    emoji: b.emoji,
    nombre: b.titulo,
    fecha: b.fecha,
    tono: TONO_POR_TITULO[b.titulo] || 'base',
  }))

  const avancesPositivos = ultimosHitos.map((h) => ({
    id: h.id,
    emoji: HITO_EMOJIS[h.categoria] || '⭐',
    descripcion: h.descripcion,
    fecha: h.fecha,
  }))

  const sinHistorial = diasRacha === 0
  const frase = frasePorRacha(diasRacha, hijo.nombre)

  // trendInfo inline (usa los iconos lucide ya importados).
  const trend = (() => {
    const a = evolucion.actual, p = evolucion.anterior
    if (p == null || p === 0) return { cls: s.flat, label: '±0%', Icon: Minus }
    const pct = Math.round(((a - p) / p) * 100)
    if (pct < 0) return { cls: s.down, label: `${Math.abs(pct)}%`, Icon: TrendingDown }
    if (pct > 0) return { cls: s.up,   label: `${pct}%`,           Icon: TrendingUp }
    return { cls: s.flat, label: '±0%', Icon: Minus }
  })()

  const chipToneCls = {
    estrella:    s.cEstrella,
    celebracion: s.cCelebracion,
    calma:       s.cCalma,
    constancia:  s.cConstancia,
    base:        s.cBase,
  }

  const tabActiva = searchParams.get('tab') ?? 'perfil'

  return (
    <div className={s.page}>
      <div className={s.heroBlock}>
        <header className={s.hero}>
          <div className={s.heroTop}>
            <div className={s.heroAvatar} aria-hidden="true">
              {hijo.avatarUrl
                ? <img src={hijo.avatarUrl} alt={hijo.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : (hijo.nombre?.[0]?.toUpperCase() ?? '·')
              }
            </div>
            <div className={s.heroWho}>
              <h1 className={s.heroName}>{hijo.nombre}</h1>
              {hijo.edad != null && (
                <div className={s.heroAge}>
                  {hijo.edad} {hijo.edad === 1 ? 'año' : 'años'}
                </div>
              )}
            </div>
            <button
              className={s.heroIconBtn}
              onClick={() => navigate('/perfil')}
              aria-label="Ajustes de perfil"
            >
              <Settings size={18} />
            </button>
          </div>

          <p className={s.heroLede}>
            {sinHistorial
              ? `La huella de ${hijo.nombre} empieza con tu primer registro.`
              : `La huella que ${hijo.nombre} va dejando, día tras día.`}
          </p>
        </header>

        <section
          className={[s.rachaShelf, sinHistorial && s.empty].filter(Boolean).join(' ')}
          aria-labelledby="shelf-lbl"
        >
          <div className={s.shelfTopRow}>
            <span id="shelf-lbl" className={s.shelfLbl}>
              {sinHistorial ? (
                'Sin racha aún'
              ) : (
                <><span className={s.fire}>🔥</span> Racha activa</>
              )}
            </span>
            <span className={s.shelfSince}>
              {sinHistorial || !rachaInicio
                ? '·'
                : `desde el ${new Date(rachaInicio).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`}
            </span>
          </div>

          <div className={s.shelfNumLine}>
            <span className={s.shelfNum}>
              {diasRacha}<small>{sinHistorial ? 'días' : 'días seguidos'}</small>
            </span>
          </div>

          <p className={s.shelfFrase}>{frase}</p>

          {rachaUsoFreeze && !sinHistorial && (
            <span className={s.graceChip}>
              🌿 Día de gracia usado
              {rachaUltimoFreezeDate
                ? ` · ${new Date(rachaUltimoFreezeDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`
                : ''}
            </span>
          )}
        </section>
      </div>

      <div className={s.tabs} role="tablist">
        <button
          role="tab"
          className={[s.tab, tabActiva === 'perfil' && s.on].filter(Boolean).join(' ')}
          onClick={() => setSearchParams({})}
        >
          Perfil
        </button>
        <button
          role="tab"
          className={[s.tab, tabActiva === 'rutina' && s.on].filter(Boolean).join(' ')}
          onClick={() => setSearchParams({ tab: 'rutina' })}
        >
          Rutina diaria
        </button>
      </div>

      {tabActiva === 'perfil' && (
        <div className={s.body}>
          <article className={s.card}>
            <div className={s.cardHd}>
              <h2 className={s.cardTtl}>Episodios en {evolucion.mesActualLabel}</h2>
              <span className={[s.evolTrend, trend.cls].join(' ')}>
                <trend.Icon size={14} /> {trend.label}
              </span>
            </div>
            <div className={s.evolNums}>
              <span className={s.evolNow}>
                {evolucion.actual}<small>episodios</small>
              </span>
              <span className={s.evolPrev}>
                {evolucion.anterior == null
                  ? 'aún sin historial previo'
                  : <>vs. <b>{evolucion.anterior}</b> en {evolucion.mesAnteriorLabel}</>}
              </span>
            </div>
            {evolucion.interpretacion && (
              <p className={s.evolInterp}>{evolucion.interpretacion}</p>
            )}
          </article>

          <article className={s.card}>
            <div className={s.cardHd}>
              <h2 className={s.cardTtl}>Logros recientes</h2>
              <span className={s.cardSub}>
                {logrosRecientes.length === 0 ? 'Por desbloquear' : `${logrosRecientes.length} últimos`}
              </span>
            </div>
            {logrosRecientes.length > 0 && (
              <div className={s.logroChips}>
                {logrosRecientes.map((logro) => (
                  <div
                    key={logro.id}
                    className={[s.logroChip, chipToneCls[logro.tono] ?? s.cBase].join(' ')}
                  >
                    <span className={s.emo} aria-hidden="true">{logro.emoji ?? '●'}</span>
                    <span className={s.tx}>
                      <span className={s.cnm}>{logro.nombre}</span>
                      <span className={s.cdt}>
                        {new Date(logro.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={s.card}>
            <div className={s.cardHd}>
              <h2 className={s.cardTtl}>Avances positivos</h2>
              <span className={s.cardSub}>
                {avancesPositivos.length === 0 ? 'Aún sin hitos' : 'Últimos 3'}
              </span>
            </div>

            {avancesPositivos.length === 0 ? (
              <p className={s.evolInterp}>
                El primer hito de {hijo.nombre} aparecerá aquí en cuanto lo guardes.
              </p>
            ) : (
              <>
                <ol className={s.timeline}>
                  {avancesPositivos.map((h) => (
                    <li key={h.id} className={s.timelineRow}>
                      <span className={s.timelineDot} aria-hidden="true">{h.emoji ?? '·'}</span>
                      <div>
                        <p className={s.timelineDesc}>{h.descripcion}</p>
                        <span className={s.timelineDt}>
                          {new Date(h.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <button
                  className={s.verAlbum}
                  onClick={() => navigate('/hitos?tab=album')}
                >
                  Ver todos en Álbum <ArrowRight size={14} />
                </button>
              </>
            )}
          </article>
        </div>
      )}

      {tabActiva === 'rutina' && <RutinaDiaria />}
    </div>
  )
}
