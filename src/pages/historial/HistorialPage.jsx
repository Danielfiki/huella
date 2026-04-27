import React, { useState, useRef, useMemo } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import Card from '../../components/ui/Card'
import RespuestaIA from '../../components/ui/RespuestaIA'
import GenerarInformeBtn from '../../modules/pdf/GenerarInformeBtn'
import styles from './HistorialPage.module.css'

const TIPOS = {
  rabieta:     { label: 'Rabieta / explosión',              emoji: '💥' },
  llanto:      { label: 'Llanto intenso',                   emoji: '😭' },
  agresividad: { label: 'Golpes / agresividad',             emoji: '👊' },
  miedo:       { label: 'Miedo / angustia',                 emoji: '🫣' },
  sueño:       { label: 'No quiere dormir',                 emoji: '🛏️' },
  social:      { label: 'Se aisló / no quiso relacionarse', emoji: '🫥' },
  desconexion: { label: 'Se cerró / no respondía',          emoji: '🔇' },
  oposicion:   { label: 'Oposición / no coopera',           emoji: '🚫' },
  otro:        { label: 'Otro',                             emoji: '📝' },
}

const HABILIDAD_A_TIPOS = {
  'Calmarse cuando explota':            ['rabieta', 'agresividad', 'desconexion'],
  'Aceptar el "no" sin crisis':         ['oposicion'],
  'Manejar el miedo y la angustia':     ['miedo', 'llanto'],
  'Concentrarse y calmarse':            ['sueño'],
  'Relacionarse mejor con otros niños': ['social'],
  'Manejar los cambios de rutina':      ['rabieta', 'oposicion'],
}

function calcularImpacto(estrategia, episodios) {
  const inicio = new Date(estrategia.fechaInicio)
  const ahora = new Date()
  const diasDesde = Math.max(1, Math.floor((ahora - inicio) / 864e5))
  const ventanaAntes = new Date(inicio)
  ventanaAntes.setDate(ventanaAntes.getDate() - diasDesde)

  const tipos = HABILIDAD_A_TIPOS[estrategia.habilidad] || []
  const tipoLabel = tipos[0] ? (TIPOS[tipos[0]]?.label || estrategia.habilidad) : estrategia.habilidad

  const antes = episodios.filter((e) => {
    const f = new Date(e.fecha)
    return f >= ventanaAntes && f < inicio && tipos.includes(e.tipo)
  }).length
  const despues = episodios.filter((e) => {
    const f = new Date(e.fecha)
    return f >= inicio && tipos.includes(e.tipo)
  }).length

  // normalizar a tasa semanal para comparar períodos desiguales
  const ratAntes  = (antes  / diasDesde) * 7
  const ratDespues = (despues / diasDesde) * 7
  const diff = ratDespues - ratAntes

  let tendencia, mensaje, detalle
  if (diasDesde < 5) {
    tendencia = 'inicio'
    mensaje = `Llevas ${diasDesde} ${diasDesde === 1 ? 'día' : 'días'} con esta estrategia.`
    detalle = 'Sigue registrando para ver si hay cambios.'
  } else if (antes === 0 && despues === 0) {
    tendencia = 'sin_datos'
    mensaje = `Sin episodios de "${tipoLabel}" para comparar.`
    detalle = 'No hay datos suficientes todavía.'
  } else if (diff < -0.4) {
    tendencia = 'bajaron'
    mensaje = `Los episodios de "${tipoLabel}" bajaron.`
    detalle = `Antes: ${antes} · Después: ${despues}. Algo está funcionando. 💪`
  } else if (diff > 0.4) {
    tendencia = 'subieron'
    mensaje = `Los episodios de "${tipoLabel}" aumentaron.`
    detalle = `Antes: ${antes} · Después: ${despues}. Puede pasar al inicio — el cambio lleva tiempo.`
  } else {
    tendencia = 'igual'
    mensaje = `Los episodios de "${tipoLabel}" se mantuvieron similares.`
    detalle = `Antes: ${antes} · Después: ${despues}. Sigue registrando para ver el patrón.`
  }

  return { diasDesde, tendencia, mensaje, detalle }
}

const INTENSIDAD_LABEL = ['', 'Muy leve', 'Leve', 'Moderado', 'Intenso', 'Muy intenso']
const INTENSIDAD_COLOR = ['', '#a8d5b5', '#c4e0a8', '#f0dfa0', '#f5c4a8', '#e87878']

function formatHora(fechaStr) {
  return new Date(fechaStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function labelDia(fechaStr) {
  const fecha = new Date(fechaStr)
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)
  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy'
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer'
  return fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}

const CATEGORIAS_HITO = {
  autorregulacion: { label: 'Se calmó solo',   emoji: '🌱' },
  empatia:         { label: 'Mostró empatía',  emoji: '💛' },
  disculpa:        { label: 'Pidió disculpas', emoji: '🤝' },
  frustration:     { label: 'Toleró un "no"',  emoji: '💪' },
  social:          { label: 'Avance social',   emoji: '👫' },
  otro:            { label: 'Otro avance',     emoji: '⭐' },
}

function agruparPorDia(episodios) {
  const grupos = new Map()
  for (const ep of episodios) {
    const key = new Date(ep.fecha).toDateString()
    if (!grupos.has(key)) grupos.set(key, { label: labelDia(ep.fecha), episodios: [] })
    grupos.get(key).episodios.push(ep)
  }
  return Array.from(grupos.values())
}

function agruparItemsPorDia(items) {
  const grupos = new Map()
  for (const item of items) {
    const key = new Date(item.fecha).toDateString()
    if (!grupos.has(key)) grupos.set(key, { label: labelDia(item.fecha), items: [] })
    grupos.get(key).items.push(item)
  }
  return Array.from(grupos.values())
}

function HitoHistorialCard({ hito }) {
  const cat = CATEGORIAS_HITO[hito.categoria] || { label: hito.categoria || 'Avance', emoji: '⭐' }
  return (
    <Card className={styles.card}>
      <div className={styles.hitoCardTop}>
        <span className={styles.hitoEmoji}>{cat.emoji}</span>
        <div>
          <p className={styles.tipoLabel}>{cat.label}</p>
          <p className={styles.hora}>
            {new Date(hito.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={styles.hitoBadge}>avance</span>
      </div>
      {hito.descripcion ? (
        <p className={styles.contexto}>{hito.descripcion}</p>
      ) : null}
      {hito.foto_url ? (
        <img
          src={hito.foto_url}
          alt="Foto del avance"
          className={styles.hitoFoto}
          onClick={() => window.open(hito.foto_url, '_blank')}
        />
      ) : null}
    </Card>
  )
}

function EpisodioCard({ ep, onDelete, onUpdate, conEstrategia }) {
  const [expandido, setExpandido] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [reflexion, setReflexion] = useState(ep.reflexion ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const guardadoTimerRef = useRef(null)
  const tipo = TIPOS[ep.tipo] || { label: ep.tipo, emoji: '📝' }

  const reflexionDirty = reflexion !== (ep.reflexion ?? '')

  async function handleEliminar() {
    setEliminando(true)
    try {
      await onDelete(ep.id)
    } catch {
      setEliminando(false)
      setConfirmando(false)
    }
  }

  async function handleGuardarReflexion() {
    setGuardando(true)
    try {
      await onUpdate({ id: ep.id, reflexion: reflexion || null })
      clearTimeout(guardadoTimerRef.current)
      setGuardado(true)
      guardadoTimerRef.current = setTimeout(() => setGuardado(false), 2500)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.tipoWrap}>
          <span className={styles.emoji}>{tipo.emoji}</span>
          <div>
            <p className={styles.tipoLabel}>{tipo.label}</p>
            <div className={styles.horaRow}>
              <p className={styles.hora}>{formatHora(ep.fecha)}</p>
              {conEstrategia && (
                <span className={styles.estrategiaBadge}>con estrategia activa</span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.cardTopRight}>
          <span
            className={styles.intensidadBadge}
            style={{ background: INTENSIDAD_COLOR[ep.intensidad] }}
          >
            {INTENSIDAD_LABEL[ep.intensidad]}
          </span>
          {!confirmando ? (
            <button
              className={styles.deleteBtn}
              onClick={() => setConfirmando(true)}
              title="Eliminar episodio"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className={styles.confirmWrap}>
              <button
                className={styles.confirmSiBtn}
                onClick={handleEliminar}
                disabled={eliminando}
              >
                {eliminando ? '...' : 'Eliminar'}
              </button>
              <button
                className={styles.confirmNoBtn}
                onClick={() => setConfirmando(false)}
                disabled={eliminando}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {ep.contexto ? (
        <p className={styles.contexto}>{ep.contexto}</p>
      ) : null}

      {ep.gatillantes?.length > 0 ? (
        <div className={styles.gatillantes}>
          {ep.gatillantes.map((g) => (
            <span key={g} className={styles.gatillante}>{g}</span>
          ))}
        </div>
      ) : null}

      {(ep.emocion || ep.estadoPadre) ? (
        <div className={styles.emocionEstadoRow}>
          {ep.emocion && (
            <span className={styles.emocionPill}>
              <span className={styles.emocionPillLabel}>niño/a</span>
              {ep.emocion}
            </span>
          )}
          {ep.estadoPadre && (
            <span className={styles.estadoPill}>
              <span className={styles.estadoPillLabel}>yo</span>
              {ep.estadoPadre}
            </span>
          )}
        </div>
      ) : null}

      {ep.descripcionLibre ? (
        <div className={styles.descripcionLibreWrap}>
          <span className={styles.descripcionLibreLabel}>Relato del momento</span>
          <p className={styles.descripcionLibre}>{ep.descripcionLibre}</p>
        </div>
      ) : null}

      {ep.orientacionIA ? (
        <>
          <button
            className={styles.toggleBtn}
            onClick={() => setExpandido(!expandido)}
          >
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandido ? 'Ocultar orientación' : 'Ver orientación de Huella'}
          </button>
          {expandido && <RespuestaIA texto={ep.orientacionIA} compact />}
        </>
      ) : null}

      <div className={styles.reflexionWrap}>
        <span className={styles.reflexionLabel}>Mi reflexión</span>
        <textarea
          className={styles.reflexionTextarea}
          placeholder="¿Qué aprendiste de este momento? ¿Qué harías diferente?"
          value={reflexion}
          onChange={(e) => { setReflexion(e.target.value); setGuardado(false) }}
          rows={reflexion ? undefined : 2}
        />
        {(reflexionDirty || guardado) && (
          <div className={styles.reflexionActions}>
            {guardado ? (
              <span className={styles.reflexionGuardado}>✓ Guardado</span>
            ) : (
              <button
                className={styles.reflexionBtn}
                onClick={handleGuardarReflexion}
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : 'Guardar reflexión'}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

const PESTANAS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'episodios', label: 'Episodios' },
  { id: 'avances',   label: 'Avances' },
]

export default function HistorialPage() {
  const { state, deleteEpisodio, updateEpisodio } = useHuella()
  const { episodios, estrategias, hitos, hijo } = state
  const [pestaña, setPestaña] = useState('todos')
  const [filtroTipos, setFiltroTipos] = useState(() => new Set())
  const [filtroIntensidad, setFiltroIntensidad] = useState(null)

  function toggleFiltroTipo(tipo) {
    setFiltroTipos((prev) => {
      const next = new Set(prev)
      next.has(tipo) ? next.delete(tipo) : next.add(tipo)
      return next
    })
  }
  function limpiarFiltros() {
    setFiltroTipos(new Set())
    setFiltroIntensidad(null)
  }
  const hayFiltros = filtroTipos.size > 0 || filtroIntensidad !== null

  const estrategiaActiva = useMemo(
    () => (estrategias || []).find((e) => e.semanaActual < 4) ?? null,
    [estrategias]
  )

  const impacto = useMemo(
    () => estrategiaActiva ? calcularImpacto(estrategiaActiva, episodios) : null,
    [estrategiaActiva, episodios]
  )

  const episodiosConEstrategia = useMemo(() => {
    const set = new Set()
    for (const ep of episodios) {
      const fEp = new Date(ep.fecha)
      for (const est of (estrategias || [])) {
        const fIni = new Date(est.fechaInicio)
        const fFin = new Date(est.fechaInicio)
        fFin.setDate(fFin.getDate() + 28)
        if (fEp >= fIni && fEp <= fFin) { set.add(ep.id); break }
      }
    }
    return set
  }, [episodios, estrategias])

  const gruposTodos = useMemo(() => {
    const items = [
      ...episodios.map((ep) => ({ kind: 'episodio', fecha: ep.fecha, data: ep })),
      ...hitos.map((h)  => ({ kind: 'hito',     fecha: h.fecha,  data: h  })),
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    return agruparItemsPorDia(items)
  }, [episodios, hitos])

  const episodiosFiltrados = useMemo(() => episodios.filter((ep) => {
    if (filtroTipos.size > 0 && !filtroTipos.has(ep.tipo)) return false
    if (filtroIntensidad !== null && ep.intensidad !== filtroIntensidad) return false
    return true
  }), [episodios, filtroTipos, filtroIntensidad])

  const gruposEpisodios = useMemo(() => agruparPorDia(episodiosFiltrados), [episodiosFiltrados])

  const hitosOrdenados = useMemo(
    () => [...hitos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [hitos]
  )

  const ImpactoIcon = impacto?.tendencia === 'bajaron'
    ? TrendingDown
    : impacto?.tendencia === 'subieron'
    ? TrendingUp
    : Minus

  const hace7 = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d }, [])
  const epSemana = useMemo(() => episodios.filter((e) => new Date(e.fecha) >= hace7), [episodios, hace7])
  const totalSemana = epSemana.length

  const totalRegistros = episodios.length + hitos.length
  const countLabel =
    pestaña === 'todos'
      ? `${totalRegistros} registro${totalRegistros !== 1 ? 's' : ''}`
      : pestaña === 'episodios'
      ? hayFiltros
        ? `${episodiosFiltrados.length} de ${episodios.length} episodio${episodios.length !== 1 ? 's' : ''}`
        : `${episodios.length} episodio${episodios.length !== 1 ? 's' : ''}`
      : `${hitos.length} avance${hitos.length !== 1 ? 's' : ''}`

  if (totalRegistros === 0) {
    return (
      <div className={styles.page}>
        <h2 className={styles.titulo}>Historial</h2>
        <Card className={styles.emptyCard}>
          <BookOpen size={36} color="var(--color-primary-light)" />
          <h3>Sin registros aún</h3>
          <p>Aquí aparecerán tus episodios y avances cuando empieces a registrar.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Historial</h2>
        <span className={styles.count}>{countLabel}</span>
      </div>

      {/* ── Resumen semanal ── */}
      {episodios.length > 0 && (
        <div className={styles.semanaCard}>
          <span className={styles.semanaEmoji}>
            {totalSemana === 0 ? '🌱' : totalSemana >= 5 ? '💪' : '✨'}
          </span>
          <div className={styles.semanaInfo}>
            <p className={styles.semanaTexto}>
              {totalSemana === 0
                ? 'Sin episodios esta semana'
                : `${totalSemana} ${totalSemana === 1 ? 'episodio' : 'episodios'} esta semana`}
            </p>
            <p className={styles.semanaDetalle}>
              {totalSemana === 0
                ? 'Las semanas tranquilas también cuentan.'
                : totalSemana >= 5
                ? 'Que los hayas anotado ya es un gran paso.'
                : 'Seguís registrando — eso construye el patrón.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Pestañas ── */}
      <div className={styles.tabs}>
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            className={`${styles.tab} ${pestaña === p.id ? styles.tabActive : ''}`}
            onClick={() => setPestaña(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Impacto estrategia (solo en episodios) ── */}
      {pestaña === 'episodios' && impacto && estrategiaActiva && (
        <Card className={`${styles.impactoCard} ${styles[`impacto_${impacto.tendencia}`]}`}>
          <div className={styles.impactoHeader}>
            <ImpactoIcon size={16} className={styles.impactoIcon} />
            <p className={styles.impactoLabel}>
              Estrategia activa · hace {impacto.diasDesde} {impacto.diasDesde === 1 ? 'día' : 'días'}
            </p>
          </div>
          <p className={styles.impactoNombre}>"{estrategiaActiva.habilidad}"</p>
          <p className={styles.impactoMensaje}>{impacto.mensaje}</p>
          <p className={styles.impactoDetalle}>{impacto.detalle}</p>
        </Card>
      )}

      {/* ── TODOS ── */}
      {pestaña === 'todos' && (
        totalRegistros === 0 ? (
          <Card className={styles.emptyCard}>
            <p>Sin registros aún.</p>
          </Card>
        ) : (
          gruposTodos.map((grupo) => (
            <div key={grupo.label} className={styles.grupo}>
              <p className={styles.grupoLabel}>{grupo.label}</p>
              {grupo.items.map((item) =>
                item.kind === 'episodio' ? (
                  <EpisodioCard
                    key={item.data.id}
                    ep={item.data}
                    onDelete={deleteEpisodio}
                    onUpdate={updateEpisodio}
                    conEstrategia={episodiosConEstrategia.has(item.data.id)}
                  />
                ) : (
                  <HitoHistorialCard key={item.data.id} hito={item.data} />
                )
              )}
            </div>
          ))
        )
      )}

      {/* ── Filtros (solo pestaña episodios) ── */}
      {pestaña === 'episodios' && episodios.length > 0 && (
        <div className={styles.filtros}>
          <div className={styles.filtroSection}>
            <span className={styles.filtroLabel}>Tipo</span>
            <div className={styles.filtroChips}>
              {Object.entries(TIPOS).map(([id, { emoji, label }]) => (
                <button
                  key={id}
                  className={`${styles.filtroChip} ${filtroTipos.has(id) ? styles.filtroChipActive : ''}`}
                  onClick={() => toggleFiltroTipo(id)}
                  title={label}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filtroSection}>
            <span className={styles.filtroLabel}>Intensidad</span>
            <div className={styles.filtroChips}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`${styles.filtroChip} ${filtroIntensidad === n ? styles.filtroChipActive : ''}`}
                  onClick={() => setFiltroIntensidad((prev) => prev === n ? null : n)}
                  type="button"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {hayFiltros && (
            <button className={styles.limpiarFiltros} onClick={limpiarFiltros} type="button">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── EPISODIOS ── */}
      {pestaña === 'episodios' && (
        episodios.length === 0 ? (
          <Card className={styles.emptyCard}>
            <p>Sin episodios registrados.</p>
          </Card>
        ) : (
          <>
            {gruposEpisodios.map((grupo) => (
              <div key={grupo.label} className={styles.grupo}>
                <p className={styles.grupoLabel}>{grupo.label}</p>
                {grupo.episodios.map((ep) => (
                  <EpisodioCard
                    key={ep.id}
                    ep={ep}
                    onDelete={deleteEpisodio}
                    onUpdate={updateEpisodio}
                    conEstrategia={episodiosConEstrategia.has(ep.id)}
                  />
                ))}
              </div>
            ))}
            <GenerarInformeBtn
              hijo={hijo}
              episodios={episodios}
              estrategias={estrategias}
              hitos={hitos}
            />
          </>
        )
      )}

      {/* ── AVANCES ── */}
      {pestaña === 'avances' && (
        hitos.length === 0 ? (
          <Card className={styles.emptyCard}>
            <p>Sin avances registrados aún.</p>
          </Card>
        ) : (
          <div className={styles.grupo}>
            {hitosOrdenados.map((h) => (
              <HitoHistorialCard key={h.id} hito={h} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
