import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Settings, ArrowLeft, ArrowRight,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import PropuestaRasgo from '../../components/hijo/PropuestaRasgo'
import Escarabajo from '../../components/ui/Escarabajo'
import s from './HijoPage.module.css'
import RutinaDiaria from './RutinaDiaria'

// ── Helpers ───────────────────────────────────────────────────────────────

// Nitidez del retrato (motor de rasgos · 4B-1): la foto del niño "madura" (se
// revela) a medida que el papá confirma rasgos. 5 niveles. Cortes iniciales
// (calibrables con datos de la beta): 0 confirmados -> N1, 1 -> N2, 2 -> N3,
// 3-4 -> N4, 5+ -> N5.
function nivelNitidez(rasgosConfirmados) {
  if (rasgosConfirmados >= 5) return 5
  if (rasgosConfirmados >= 3) return 4
  if (rasgosConfirmados === 2) return 3
  if (rasgosConfirmados === 1) return 2
  return 1
}

// Filtros CSS por nivel (valores exactos del diseño). El revelado "respira"
// con transition: filter 1.2s ease (definida en .retratoImg).
const FILTRO_NITIDEZ = {
  1: 'grayscale(1) saturate(.20) contrast(.92) brightness(.97)',
  2: 'grayscale(.72) saturate(.45) contrast(.96)',
  3: 'grayscale(.45) saturate(.70) contrast(1)',
  4: 'grayscale(.18) saturate(.92) contrast(1.02)',
  5: 'grayscale(0) saturate(1.10) contrast(1.05)',
}

// ── Rastro del escarabajo (motor de rasgos · 4B-1 + adelanto 4B-2) ──────────
// Un anillo de marcas sobre un arco de 314° (hueco de 46° abajo, donde nace el
// camino). Avanza UNA marca por cada rasgo confirmado; el escarabajo se posa en
// la última marca recorrida. Solo avanza, nunca retrocede. Coordenadas en el
// viewBox de 190x190 (1:1 con los px del contenedor).
const RASTRO_N     = 14            // total de marcas del anillo (calibrable)
const RASTRO_C     = 95            // centro (190 / 2)
const RASTRO_R     = 86            // radio del anillo (la foto es 150 → r 75)
const RASTRO_GAP   = 46            // grados de hueco, centrado abajo
const RASTRO_START = 90 + RASTRO_GAP / 2   // 113° = borde izquierdo del hueco
const RASTRO_SPAN  = 360 - RASTRO_GAP      // 314° de arco recorrible

function rastroPunto(i) {
  const angDeg = RASTRO_START + RASTRO_SPAN * (i / (RASTRO_N - 1))
  const ang = (angDeg * Math.PI) / 180
  return {
    x: RASTRO_C + RASTRO_R * Math.cos(ang),
    y: RASTRO_C + RASTRO_R * Math.sin(ang),
    angDeg,
  }
}

function construirRastro(confirmados) {
  const recorridas = Math.max(0, Math.min(confirmados, RASTRO_N))
  const marcas = Array.from({ length: RASTRO_N }, (_, i) => {
    const p = rastroPunto(i)
    return { x: p.x, y: p.y, on: i < recorridas }
  })
  // Con 0 confirmados el escarabajo arranca al inicio del arco; si no, va en la
  // última marca recorrida. Rotación tangente al anillo (+90°, calibrable).
  const idxBicho = recorridas === 0 ? 0 : recorridas - 1
  const pb = rastroPunto(idxBicho)
  return { marcas, bicho: { x: pb.x, y: pb.y, rot: pb.angDeg + 90 } }
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
  const { state, setHijo, confirmarRasgo, descartarRasgo } = useHuella()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hijo, episodios, hitos, estrategias, rasgos } = state

  const esNuevo = searchParams.get('nuevo') === 'true'

  // Estados del formulario de creación (siempre declarados — regla de hooks)
  const [nombre, setNombre]               = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [fechaDisplay, setFechaDisplay]   = useState('')
  const [genero, setGenero]               = useState('')
  const [loadingCrear, setLoadingCrear]   = useState(false)
  const [errorCrear, setErrorCrear]       = useState('')

  // Card de propuesta de rasgo (motor de rasgos · 4A) — "uno por sesion".
  // Se fija UN candidato al entrar a la pantalla y NO se reemplaza aunque el
  // papa lo resuelva: al confirmar/descartar la card desaparece y el resto de
  // los candidatos espera a la proxima visita (no se siente a "examen").
  const [rasgoPropuesto, setRasgoPropuesto] = useState(null)

  // Fija el candidato UNA sola vez (cuando los rasgos terminan de cargar). La
  // guarda "solo si esta en null" evita que salte al siguiente tras resolver.
  useEffect(() => {
    if (rasgoPropuesto !== null) return
    if (!hijo) return
    const candidato = (rasgos || []).find(
      (r) => r.estado === 'candidato' && r.hijoId === hijo.id
    )
    if (candidato) setRasgoPropuesto(candidato)
  }, [rasgos, hijo?.id, rasgoPropuesto])

  // Al cambiar de hijo activo, reinicia para que la nueva pantalla fije su
  // propio candidato.
  useEffect(() => {
    setRasgoPropuesto(null)
  }, [hijo?.id])

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

  // Sin historial = el hijo no tiene episodios ni hitos todavía (antes salía de
  // la racha, eliminada en 4B-1). Solo alimenta el texto del lede del retrato.
  const sinHistorial = episodios.length === 0 && hitos.length === 0

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

  // El candidato fijado para esta visita se busca en el estado vivo. La card
  // solo se muestra mientras ese rasgo siga siendo 'candidato'; al resolverlo
  // (confirmado/descartado) se oculta y NO aparece otro en esta visita.
  const rasgoVivo = rasgoPropuesto
    ? (rasgos || []).find((r) => r.id === rasgoPropuesto.id)
    : null
  const mostrarPropuesta = !!rasgoVivo && rasgoVivo.estado === 'candidato'

  // Nitidez del retrato: cuántos rasgos del hijo activo ya confirmó el papá.
  const rasgosConfirmados = (rasgos || []).filter(
    (r) => r.estado === 'confirmado' && r.hijoId === hijo.id
  ).length
  const nivel = nivelNitidez(rasgosConfirmados)
  const rastro = construirRastro(rasgosConfirmados)

  return (
    <div className={s.page}>
      <div className={s.heroBlock}>
        <header className={s.hero}>
          <button
            className={s.heroIconBtn}
            onClick={() => navigate('/perfil')}
            aria-label="Ajustes de perfil"
          >
            <Settings size={18} />
          </button>

          <div className={s.retratoWrap}>
            <div className={s.rastroAnillo}>
              <svg className={s.rastroSvg} viewBox="0 0 190 190" aria-hidden="true">
                {rastro.marcas.map((m, i) => (
                  <circle
                    key={i}
                    cx={m.x}
                    cy={m.y}
                    r="3"
                    className={m.on ? s.rastroMarcaOn : s.rastroMarca}
                  />
                ))}
              </svg>

              <div className={s.retratoFoto} aria-hidden="true">
                {hijo.avatarUrl
                  ? (
                    <img
                      src={hijo.avatarUrl}
                      alt={hijo.nombre}
                      className={s.retratoImg}
                      style={{ filter: FILTRO_NITIDEZ[nivel] }}
                    />
                  )
                  : <Escarabajo className={s.retratoBicho} />
                }
              </div>

              <span
                className={s.rastroBicho}
                style={{
                  left: `${rastro.bicho.x}px`,
                  top: `${rastro.bicho.y}px`,
                  transform: `translate(-50%, -50%) rotate(${rastro.bicho.rot}deg)`,
                }}
                aria-hidden="true"
              >
                <Escarabajo className={s.rastroBichoSvg} />
              </span>
            </div>
            <span className={s.nitidezPill}>Nitidez {nivel}/5</span>
          </div>

          <div className={s.heroWho}>
            <h1 className={s.heroName}>{hijo.nombre}</h1>
            {hijo.edad != null && (
              <div className={s.heroAge}>
                {hijo.edad} {hijo.edad === 1 ? 'año' : 'años'}
              </div>
            )}
            <p className={s.heroLede}>
              {sinHistorial
                ? `La huella de ${hijo.nombre} empieza con tu primer registro.`
                : `La huella que ${hijo.nombre} va dejando, día tras día.`}
            </p>
          </div>
        </header>
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
          {mostrarPropuesta && (
            <PropuestaRasgo
              rasgo={rasgoVivo}
              nombreHijo={hijo.nombre}
              onConfirmar={confirmarRasgo}
              onDescartar={descartarRasgo}
            />
          )}
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
                    <span className={s.emo} aria-hidden="true" />
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
