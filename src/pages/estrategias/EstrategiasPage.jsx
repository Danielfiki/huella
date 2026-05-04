import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Target, Plus, ChevronRight, CheckCircle, Lock, Sprout, Circle, CheckCircle2, Trash2 } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { generarEstrategia, generarTareas } from '../../services/anthropic'
import { subscribeToPush } from '../../services/pushNotifications'
import { renderMarkdown } from '../../utils/renderMarkdown'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import CitaLoader from '../../components/ui/CitaLoader'
import TooltipAyuda from '../../components/ui/TooltipAyuda'
import styles from './EstrategiasPage.module.css'

const CONTEXTOS = {
  'Calmarse cuando explota':                      { texto: 'La autorregulación emocional es la base de todas las demás habilidades sociales y relacionales.', emoji: '🌊' },
  'Aceptar el "no" sin crisis':                   { texto: 'Tolerar la frustración construye resiliencia duradera. Es una de las habilidades más valiosas en la vida adulta.', emoji: '💪' },
  'Manejar los cambios de rutina':                { texto: 'La flexibilidad ante los cambios reduce el estrés y mejora la adaptación en todo contexto.', emoji: '🔄' },
  'Relacionarse mejor con otros niños':           { texto: 'Las conexiones positivas tempranas son el mayor predictor de bienestar emocional adulto.', emoji: '🤝' },
  'Manejar el miedo y la angustia':               { texto: 'Aprender a regular el miedo desde pequeño protege la salud mental a largo plazo.', emoji: '🛡️' },
  'Concentrarse y calmarse':                      { texto: 'La calma y el foco son habilidades entrenables con práctica constante, no rasgos fijos.', emoji: '🧘' },
  'Mejorar la atención y concentración':          { texto: 'La atención sostenida se entrena como un músculo — pequeños ejercicios diarios generan cambios duraderos.', emoji: '🎯' },
  'Desarrollar autonomía e independencia':        { texto: 'Cada pequeño paso que hace solo construye confianza en sí mismo y en el mundo.', emoji: '💪' },
  'Establecer rutinas que funcionen':             { texto: 'Las rutinas predecibles reducen la ansiedad y liberan energía mental para aprender y crecer.', emoji: '📅' },
  'Motivación y autoestima':                      { texto: 'Un niño que se siente capaz intenta cosas nuevas. La autoestima se construye en los pequeños logros de cada día.', emoji: '🌟' },
  'Dificultades en el colegio':                   { texto: 'El colegio es un entorno exigente. Con las estrategias correctas, los desafíos se vuelven oportunidades de crecer.', emoji: '🏫' },
}

function EstrategiaActivaCard({ estrategia, onAbrir }) {
  const ctx = CONTEXTOS[estrategia.habilidad] || { texto: 'Cada semana de práctica sostenida genera cambios reales.', emoji: '🎯' }
  const semana = Math.min(estrategia.semanaActual, 4)
  return (
    <button className={styles.activaCard} onClick={onAbrir}>
      <p className={styles.activaLabel}>Esta semana trabajas</p>
      <div className={styles.activaTop}>
        <span className={styles.activaEmoji}>{ctx.emoji}</span>
        <h3 className={styles.activaTitulo}>{estrategia.habilidad}</h3>
      </div>
      <p className={styles.activaContexto}>{ctx.texto}</p>
      <div className={styles.activaFooter}>
        <div className={styles.progressBar} style={{ marginTop: 0 }}>
          <div className={styles.progressFill} style={{ width: `${(semana / 4) * 100}%` }} />
        </div>
        <span className={styles.activaSemanaTag}>Semana {semana}/4</span>
      </div>
    </button>
  )
}

const HABILIDADES = [
  { label: 'Calmarse cuando explota',               tecnico: 'Autorregulación emocional',                emoji: '🌊' },
  { label: 'Aceptar el "no" sin crisis',            tecnico: 'Resiliencia ante la frustración',          emoji: '💪' },
  { label: 'Manejar los cambios de rutina',         tecnico: 'Tolerancia a los cambios',                 emoji: '🔄' },
  { label: 'Relacionarse mejor con otros niños',    tecnico: 'Habilidades sociales',                     emoji: '🤝' },
  { label: 'Manejar el miedo y la angustia',        tecnico: 'Manejo del miedo',                         emoji: '🛡️' },
  { label: 'Concentrarse y calmarse',               tecnico: 'Concentración y calma',                    emoji: '🧘' },
  { label: 'Mejorar la atención y concentración',   tecnico: 'Atención y concentración',                 emoji: '🎯' },
  { label: 'Desarrollar autonomía e independencia', tecnico: 'Autonomía e independencia',                emoji: '💪' },
  { label: 'Establecer rutinas que funcionen',      tecnico: 'Rutinas y estructura diaria',              emoji: '📅' },
  { label: 'Motivación y autoestima',               tecnico: 'Motivación y autoestima',                  emoji: '🌟' },
  { label: 'Dificultades en el colegio',            tecnico: 'Adaptación y rendimiento escolar',         emoji: '🏫' },
]

function extraerTareasDePlan(planObj) {
  if (!planObj?.semanas) return {}
  const result = {}
  for (const s of planObj.semanas) {
    result[String(s.numero)] = (s.tareas || []).map((texto, i) => ({
      id: `s${s.numero}t${i + 1}`,
      texto,
      completada: false,
    }))
  }
  return result
}

function parsePlan(texto) {
  if (!texto) return { intro: '', semanas: [] }

  // DEBUG TEMPORAL — eliminar tras diagnóstico
  console.log('[parsePlan] typeof texto:', typeof texto)
  console.log('[parsePlan] primeros 200 chars:', String(texto).slice(0, 200))
  console.log('[parsePlan] estructura JSON:', JSON.stringify(texto).slice(0, 300))

  // JSON format (new)
  try {
    let raw = typeof texto === 'string' ? JSON.parse(texto) : texto
    // Doble serialización: JSON.parse devolvió un string en vez de un objeto
    if (typeof raw === 'string') raw = JSON.parse(raw)
    if (raw?.semanas?.length) {
      return {
        intro: raw.porQueImporta || '',
        semanas: raw.semanas.map((s) => ({
          numero: s.numero,
          titulo: s.titulo,
          accion: s.accion,
          indicador: s.indicador,
        })),
      }
    }
  } catch (err) {
    console.warn('[parsePlan] No se pudo parsear el plan como JSON:', err.message)
  }

  // Fallback: legacy markdown parser
  const lines = texto.split('\n')
  const introLines = []
  const semanas = []
  let current = null

  for (const line of lines) {
    const match = line.match(/\*\*Semana (\d+)(?:\s*[—–-]\s*(.+?))?\*\*/)
    if (match) {
      if (current) semanas.push(current)
      current = { numero: parseInt(match[1]), titulo: match[2]?.trim() || `Semana ${match[1]}`, lineas: [] }
    } else if (current) {
      current.lineas.push(line)
    } else if (!line.match(/\*\*Por qué.+importa.+ahora\*\*/i)) {
      introLines.push(line)
    }
  }
  if (current) semanas.push(current)

  return {
    intro: introLines.join('\n').trim(),
    semanas: semanas.map((s) => {
      const contenido = s.lineas.join('\n').trim()
      const estrategiaMatch = contenido.match(/[-•*]\s*Estrategia:\s*(.+)/i)
      const indicadorMatch = contenido.match(/[-•*]\s*Indicador:\s*(.+)/i)
      return {
        numero: s.numero,
        titulo: s.titulo,
        accion: estrategiaMatch ? estrategiaMatch[1].trim() : contenido,
        indicador: indicadorMatch ? indicadorMatch[1].trim() : null,
      }
    }),
  }
}

export default function EstrategiasPage() {
  const { state, addEstrategia, updateEstrategia, deleteEstrategia } = useHuella()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const initNueva = location.state?.nueva === true
  const initHabilidad = location.state?.habilidad || ''
  const initEpisodioOrigenId = location.state?.episodioOrigenId || null
  const [vista, setVista] = useState(initNueva ? 'nueva' : 'lista')
  const [selectedId, setSelectedId] = useState(null)
  const [habilidad, setHabilidad] = useState(initHabilidad)
  const [descripcion, setDescripcion] = useState('')
  const [otraDescripcion, setOtraDescripcion] = useState('')
  const [plan, setPlan] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingTareas, setLoadingTareas] = useState(false)
  const [loadingAvanzar, setLoadingAvanzar] = useState(false)
  const [checkinVisible, setCheckinVisible] = useState(false)
  const [checkinTexto, setCheckinTexto] = useState('')
  const [loadingRegen, setLoadingRegen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // Derive from context so it auto-updates after updateEstrategia
  const estrategiaSeleccionada = selectedId
    ? state.estrategias.find((e) => e.id === selectedId) ?? null
    : null

  function abrirDetalle(e) {
    setSelectedId(e.id)
    setVista('detalle')
  }

  async function handleCrearPlan() {
    const efectivaHabilidad = habilidad === '__otra__' ? otraDescripcion.trim() : habilidad
    if (!efectivaHabilidad) return
    setLoadingPlan(true)
    try {
      const habilidadObj = HABILIDADES.find((h) => h.label === habilidad)
      const habilidadIA = habilidadObj?.tecnico ?? efectivaHabilidad
      const efectivaDesc = habilidad === '__otra__' ? '' : descripcion
      const planObj = await generarEstrategia({ hijo: state.hijo, habilidad: habilidadIA, descripcion: efectivaDesc })
      const planStr = typeof planObj === 'string' ? planObj : JSON.stringify(planObj)
      const tareas = typeof planObj === 'object' ? extraerTareasDePlan(planObj) : {}
      const realId = await addEstrategia({
        id: Date.now().toString(),
        habilidad: efectivaHabilidad,
        descripcion: efectivaDesc,
        plan: planStr,
        tareas,
        fechaInicio: new Date().toISOString(),
        semanaActual: 1,
        episodioOrigenId: initEpisodioOrigenId,
      })
      setSelectedId(realId)
      setVista('detalle')
      // Solicitar permiso push al crear la primera estrategia (fire-and-forget)
      if (user) subscribeToPush(user.id, state.hijoActivoId).catch(() => {})
    } catch (e) {
      setPlan('Error al generar el plan: ' + e.message)
    } finally {
      setLoadingPlan(false)
    }
  }

  async function handleToggleTarea(semanaNum, tareaId) {
    if (!estrategiaSeleccionada) return
    const tareas = JSON.parse(JSON.stringify(estrategiaSeleccionada.tareas || {}))
    const key = String(semanaNum)
    tareas[key] = (tareas[key] || []).map((t) =>
      t.id === tareaId ? { ...t, completada: !t.completada } : t
    )
    await updateEstrategia({ id: estrategiaSeleccionada.id, tareas })
  }

  async function handleGenerarTareas() {
    if (!estrategiaSeleccionada) return
    setLoadingTareas(true)
    try {
      const habilidadObj = HABILIDADES.find((h) => h.label === estrategiaSeleccionada.habilidad)
      const habilidadIA = habilidadObj?.tecnico ?? estrategiaSeleccionada.habilidad
      const tareasJson = await generarTareas({ hijo: state.hijo, habilidad: habilidadIA, descripcion: estrategiaSeleccionada.descripcion })
      if (tareasJson) await updateEstrategia({ id: estrategiaSeleccionada.id, tareas: tareasJson })
    } catch { /* silencioso */ }
    finally { setLoadingTareas(false) }
  }

  async function handleRegenerarPlan() {
    if (!estrategiaSeleccionada) return
    setLoadingRegen(true)
    try {
      const habilidadObj = HABILIDADES.find((h) => h.label === estrategiaSeleccionada.habilidad)
      const habilidadIA = habilidadObj?.tecnico ?? estrategiaSeleccionada.habilidad
      const planObj = await generarEstrategia({
        hijo: state.hijo,
        habilidad: habilidadIA,
        descripcion: estrategiaSeleccionada.descripcion,
      })
      const planStr = typeof planObj === 'string' ? planObj : JSON.stringify(planObj)
      const tareas = typeof planObj === 'object' ? extraerTareasDePlan(planObj) : estrategiaSeleccionada.tareas
      await updateEstrategia({ id: estrategiaSeleccionada.id, plan: planStr, tareas })
    } catch {
      // silencioso — el usuario puede reintentar
    } finally {
      setLoadingRegen(false)
    }
  }

  async function handleDeleteEstrategia(id) {
    await deleteEstrategia(id)
    setConfirmDeleteId(null)
    if (selectedId === id) { setSelectedId(null); setVista('lista') }
  }

  async function handleAvanzarSemana() {
    if (!estrategiaSeleccionada || estrategiaSeleccionada.semanaActual >= 4) return
    setLoadingAvanzar(true)
    const nextSemana = estrategiaSeleccionada.semanaActual + 1
    const updates = { id: estrategiaSeleccionada.id, semanaActual: nextSemana }
    if (checkinTexto.trim()) {
      const checkins = { ...(estrategiaSeleccionada.checkins ?? {}) }
      checkins[String(estrategiaSeleccionada.semanaActual)] = checkinTexto.trim()
      updates.checkins = checkins
    }
    await updateEstrategia(updates)
    setCheckinVisible(false)
    setCheckinTexto('')
    setLoadingAvanzar(false)

    // Si la siguiente semana no tiene tareas guardadas, generarlas ahora
    const tareasExistentes = estrategiaSeleccionada.tareas || {}
    const nextTareas = tareasExistentes[String(nextSemana)]
    if (!nextTareas || nextTareas.length === 0) {
      setLoadingTareas(true)
      const habilidadObj = HABILIDADES.find((h) => h.label === estrategiaSeleccionada.habilidad)
      const habilidadIA = habilidadObj?.tecnico ?? estrategiaSeleccionada.habilidad
      generarTareas({ hijo: state.hijo, habilidad: habilidadIA, descripcion: estrategiaSeleccionada.descripcion })
        .then((tareasJson) => {
          if (tareasJson) {
            // Mezclar: preservar semanas ya existentes (con su progreso) y rellenar las que faltan
            const merged = { ...tareasJson }
            for (const [week, tasks] of Object.entries(tareasExistentes)) {
              if (tasks && tasks.length > 0) merged[week] = tasks
            }
            updateEstrategia({ id: estrategiaSeleccionada.id, tareas: merged })
          }
        })
        .catch(() => {})
        .finally(() => setLoadingTareas(false))
    }
  }

  // ── VISTA: NUEVA ──────────────────────────────────────────────────────────
  if (vista === 'nueva') {
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => setVista('lista')}>← Volver</button>
        <h2 className={styles.titulo}>Nueva estrategia</h2>

        <Card>
          <p className={styles.label}>¿En qué quieres trabajar?</p>

          <p className={styles.categoriaHeader}>Regulación emocional</p>
          <div className={styles.habilidadesGrid}>
            {HABILIDADES.slice(0, 6).map((h) => (
              <button
                key={h.label}
                className={`${styles.habilidadBtn} ${habilidad === h.label ? styles.habilidadSelected : ''}`}
                onClick={() => setHabilidad(h.label)}
              >
                <span className={styles.habilidadEmoji}>{h.emoji}</span>
                <span>{h.label}</span>
              </button>
            ))}
          </div>

          <p className={styles.categoriaHeader}>Desarrollo y aprendizaje</p>
          <div className={styles.habilidadesGrid}>
            {HABILIDADES.slice(6).map((h) => (
              <button
                key={h.label}
                className={`${styles.habilidadBtn} ${habilidad === h.label ? styles.habilidadSelected : ''}`}
                onClick={() => setHabilidad(h.label)}
              >
                <span className={styles.habilidadEmoji}>{h.emoji}</span>
                <span>{h.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.habilidadesGrid}>
            <button
              className={`${styles.habilidadBtn} ${styles.habilidadOtra} ${habilidad === '__otra__' ? styles.habilidadSelected : ''}`}
              onClick={() => setHabilidad('__otra__')}
            >
              <span className={styles.habilidadEmoji}>✍️</span>
              <span>Otra situación...</span>
            </button>
          </div>
          {habilidad === '__otra__' && (
            <div className={styles.otraExpand}>
              <textarea
                className={styles.otraTextarea}
                placeholder="Descríbela con tus palabras, eso es suficiente para crear tu estrategia."
                value={otraDescripcion}
                onChange={(e) => setOtraDescripcion(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          )}
        </Card>

        {habilidad !== '__otra__' && (
          <Card>
            <p className={styles.label}>Contexto adicional (opcional)</p>
            <textarea
              className={styles.textarea}
              placeholder="Algo específico que quieras trabajar..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </Card>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleCrearPlan}
          disabled={!habilidad || (habilidad === '__otra__' && !otraDescripcion.trim())}
          loading={loadingPlan}
        >
          Generar plan de 4 semanas
        </Button>

        {loadingPlan && (
          <RespuestaIA
            loading={true}
            mensajeCarga="Diseñando tu plan de 4 semanas..."
            categoria="estrategia"
          />
        )}
        {plan && plan.startsWith('Error') && (
          <p className={styles.regenTexto}>{plan}</p>
        )}
      </div>
    )
  }

  // ── VISTA: DETALLE ────────────────────────────────────────────────────────
  if (vista === 'detalle' && estrategiaSeleccionada) {
    const planComoString = typeof estrategiaSeleccionada.plan === 'string'
      ? estrategiaSeleccionada.plan
      : JSON.stringify(estrategiaSeleccionada.plan ?? '')
    const planValido = planComoString &&
      !planComoString.includes('VITE_ANTHROPIC') &&
      planComoString.trim().length > 50
    const { intro, semanas } = planValido ? parsePlan(estrategiaSeleccionada.plan) : { intro: '', semanas: [] }
    const semanaActual = estrategiaSeleccionada.semanaActual
    const tareas = estrategiaSeleccionada.tareas || {}
    const tareasActuales = tareas[String(semanaActual)] || []
    const tieneTareas = tareasActuales.length > 0
    const completadas = tareasActuales.filter((t) => t.completada).length
    const todasCompletadas = !tieneTareas || completadas === tareasActuales.length

    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => setVista('lista')}>← Volver</button>

        <div className={styles.detalleHeader}>
          <h2 className={styles.titulo}>{estrategiaSeleccionada.habilidad}</h2>
          <span className={`${styles.semanaTag} ${semanaActual >= 4 ? styles.semanaTagCompletada : ''}`}>
            {semanaActual >= 4 ? 'Completado' : `Semana ${semanaActual}/4`}
          </span>
        </div>

        {intro ? (
          <Card>
            <p className={styles.introLabel}>Por qué importa ahora</p>
            <div className={styles.introTexto}>{renderMarkdown(intro)}</div>
          </Card>
        ) : null}

        <div className={styles.semanasLista}>
          {!planValido ? (
            <Card className={styles.regenCard}>
              <p className={styles.regenTexto}>
                Este plan fue generado con una versión anterior de Huella y ya no es compatible.
                Puedes regenerarlo ahora — tarda unos segundos.
              </p>
              <Button
                variant="primary"
                fullWidth
                onClick={handleRegenerarPlan}
                loading={loadingRegen}
              >
                Regenerar plan
              </Button>
            </Card>
          ) : semanas.length > 0
            ? semanas.map((semana) => {
                const esActual = semana.numero === semanaActual
                const esCompletada = semana.numero < semanaActual
                const esProxima = semana.numero > semanaActual
                return (
                  <div
                    key={semana.numero}
                    className={[
                      styles.semanaCard,
                      esActual ? styles.semanaActual : '',
                      esCompletada ? styles.semanaCompletada : '',
                      esProxima ? styles.semanaProxima : '',
                    ].join(' ')}
                  >
                    <div className={styles.semanaCardHeader}>
                      <div className={styles.semanaNumeroWrap}>
                        <span className={styles.semanaNumero}>Semana {semana.numero}</span>
                        <span className={styles.semanaTitulo}>{semana.titulo}</span>
                      </div>
                      {esCompletada && <CheckCircle size={18} color="var(--color-success)" />}
                      {esActual && <span className={styles.activaBadge}>Activa</span>}
                      {esProxima && <Lock size={15} color="var(--color-text-light)" />}
                    </div>

                    {!esProxima && (
                      <div className={styles.semanaContenido}>
                        {semana.accion && (
                          <div className={styles.semanaItem}>
                            <span className={styles.semanaItemLabel}>Qué hacer esta semana</span>
                            <div>{renderMarkdown(semana.accion)}</div>
                          </div>
                        )}
                        {semana.indicador && (
                          <div className={styles.semanaItem}>
                            <span className={styles.semanaItemLabel}>Cómo saber si está funcionando</span>
                            <div>{renderMarkdown(semana.indicador)}</div>
                          </div>
                        )}
                        {esCompletada && estrategiaSeleccionada.checkins?.[String(semana.numero)] && (
                          <div className={styles.checkinGuardado}>
                            <span className={styles.checkinGuardadoLabel}>Tu reflexión</span>
                            <p className={styles.checkinGuardadoTexto}>
                              {estrategiaSeleccionada.checkins[String(semana.numero)]}
                            </p>
                          </div>
                        )}
                        {esActual && (
                          <div className={styles.tareasSeccion}>
                            {loadingTareas ? (
                              <CitaLoader categoria="estrategia" compact />
                            ) : !tieneTareas ? (
                              <Button variant="secondary" size="sm" fullWidth onClick={handleGenerarTareas}>
                                Generar tareas de esta semana
                              </Button>
                            ) : (
                              <>
                                <div className={styles.tareasHeader}>
                                  <span className={styles.tareasLabel}>Tareas de esta semana</span>
                                  <span className={styles.tareasProgress}>{completadas}/{tareasActuales.length}</span>
                                </div>
                                <div className={styles.tareasLista}>
                                  {tareasActuales.map((tarea) => (
                                    <button
                                      key={tarea.id}
                                      className={`${styles.tareaItem} ${tarea.completada ? styles.tareaCompletada : ''}`}
                                      onClick={() => handleToggleTarea(semanaActual, tarea.id)}
                                    >
                                      {tarea.completada
                                        ? <CheckCircle2 size={20} color="var(--color-success)" className={styles.tareaCheck} />
                                        : <Circle size={20} color="var(--color-text-muted)" className={styles.tareaCheck} />
                                      }
                                      <span className={styles.tareaTexto}>{tarea.texto}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {esProxima && (
                      <p className={styles.proximaTexto}>Disponible al avanzar de semana</p>
                    )}
                  </div>
                )
              })
            : (
              <Card className={styles.regenCard}>
                <p className={styles.regenTexto}>
                  Este plan fue generado con una versión anterior de Huella y ya no es compatible.
                  Puedes regenerarlo ahora — tarda unos segundos.
                </p>
                <Button variant="primary" fullWidth onClick={handleRegenerarPlan} loading={loadingRegen}>
                  Regenerar plan
                </Button>
              </Card>
            )
          }
        </div>

        {semanaActual < 4 ? (
          checkinVisible ? (
            <Card className={styles.checkinCard}>
              <p className={styles.checkinPregunta}>¿Cómo fue la semana? ¿Notaste algún cambio?</p>
              <textarea
                className={styles.textarea}
                placeholder="Opcional — lo que observaste esta semana..."
                value={checkinTexto}
                onChange={(e) => setCheckinTexto(e.target.value)}
                rows={3}
              />
              <div className={styles.checkinBtns}>
                <Button
                  variant="secondary"
                  onClick={() => { setCheckinVisible(false); setCheckinTexto('') }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAvanzarSemana}
                  loading={loadingAvanzar}
                >
                  Confirmar avance
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setCheckinVisible(true)}
                disabled={!todasCompletadas}
              >
                Avanzar a semana {semanaActual + 1}
              </Button>
              {!todasCompletadas && (
                <p className={styles.tareasHint}>
                  Completa {tareasActuales.length - completadas} tarea{tareasActuales.length - completadas !== 1 ? 's' : ''} para avanzar
                </p>
              )}
            </>
          )
        ) : (
          <Card className={styles.completadoBanner}>
            <CheckCircle size={28} color="var(--color-success)" />
            <div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>¡Completaste las 4 semanas!</p>
              <p>Eso ya es un logro. ¿Quieres trabajar otra habilidad?</p>
            </div>
            <div className={styles.badgeDesbloqueado}>
              <span className={styles.badgeDesbloqueadoEmoji}>🏆</span>
              <div>
                <p className={styles.badgeDesbloqueadoLabel}>Medalla desbloqueada</p>
                <p className={styles.badgeDesbloqueadoTitulo}>4 semanas</p>
                <p className={styles.badgeDesbloqueadoFrase}>"Cuatro semanas sostenidas. Eso es transformación real."</p>
              </div>
            </div>
            <Button variant="ghost" fullWidth onClick={() => navigate('/hitos')}>
              Ver en Logros →
            </Button>
            <Button variant="primary" fullWidth onClick={() => setVista('nueva')}>
              Crear nueva estrategia
            </Button>
          </Card>
        )}
      </div>
    )
  }

  // ── VISTA: LISTA ──────────────────────────────────────────────────────────
  const estrategiaActiva = state.estrategias.find((e) => e.semanaActual < 4) ?? null
  const nombreHijo = state.hijo?.nombre || 'tu hijo/a'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Estrategias<TooltipAyuda texto="Elige una habilidad a trabajar y Huella diseña un plan concreto de 4 semanas." /></h2>
        <Button variant="primary" size="sm" onClick={() => setVista('nueva')}>
          <Plus size={16} /> Nueva
        </Button>
      </div>

      <Card className={styles.explicativaCard}>
        <div className={styles.explicativaHeader}>
          <Sprout size={18} className={styles.explicativaIcon} />
          <h3 className={styles.explicativaTitulo}>Tu plan de crianza</h3>
        </div>
        <p className={styles.explicativaTexto}>
          Aquí construyes estrategias concretas para trabajar habilidades específicas con {nombreHijo}.
          Cada plan dura 4 semanas — una acción por semana, sin presión.
        </p>
        <p className={styles.explicativaTexto}>
          No es terapia ni teoría: son pasos reales que puedes hacer hoy, en casa, con lo que tienes.
        </p>
      </Card>

      {estrategiaActiva && (
        <EstrategiaActivaCard
          estrategia={estrategiaActiva}
          onAbrir={() => abrirDetalle(estrategiaActiva)}
        />
      )}

      {state.estrategias.length === 0 ? (
        <Card className={styles.emptyCard}>
          <Target size={36} color="var(--color-primary-light)" />
          <h3>Sin estrategias activas</h3>
          <p>Elige una habilidad a fortalecer y Huella diseña un plan concreto de 4 semanas.</p>
          <Button variant="primary" onClick={() => setVista('nueva')}>
            Crear primera estrategia
          </Button>
        </Card>
      ) : (
        state.estrategias.map((e, i) => (
          <Card key={e.id} onClick={() => abrirDetalle(e)} staggerDelay={i * 60}>
            <div className={styles.estrategiaHeader}>
              <h4 className={styles.estrategiaNombre}>{e.habilidad}</h4>
              <div className={styles.estrategiaHeaderRight}>
                <span className={`${styles.semanaTag} ${e.semanaActual >= 4 ? styles.semanaTagCompletada : ''}`}>
                  {e.semanaActual >= 4 ? 'Completado' : `Semana ${e.semanaActual}/4`}
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id) }}
                  aria-label="Eliminar estrategia"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <p className={styles.estrategiaFecha}>
              Iniciada el {new Date(e.fechaInicio).toLocaleDateString('es-CL')}
            </p>
            {e.episodioOrigenId && (() => {
              const ep = state.episodios.find((ep) => ep.id === e.episodioOrigenId)
              if (!ep) return null
              return (
                <p className={styles.episodioOrigen}>
                  Originada desde: {ep.tipo} · {new Date(ep.fecha).toLocaleDateString('es-CL')}
                </p>
              )
            })()}
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(Math.min(e.semanaActual, 4) / 4) * 100}%` }}
              />
            </div>
          </Card>
        ))
      )}

      {confirmDeleteId && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.modalCard} onClick={(ev) => ev.stopPropagation()}>
            <p className={styles.modalTitulo}>¿Estás seguro?</p>
            <p className={styles.modalTexto}>Esta estrategia y su progreso se eliminarán permanentemente.</p>
            <div className={styles.modalBtns}>
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => handleDeleteEstrategia(confirmDeleteId)}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
