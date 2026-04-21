import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Target, Plus, ChevronRight, CheckCircle, Lock, Sprout, Circle, CheckCircle2 } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { generarEstrategia, generarTareas } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import CitaLoader from '../../components/ui/CitaLoader'
import styles from './EstrategiasPage.module.css'

const CONTEXTOS = {
  'Calmarse cuando explota':            { texto: 'La autorregulación emocional es la base de todas las demás habilidades sociales y relacionales.', emoji: '🌊' },
  'Aceptar el "no" sin crisis':         { texto: 'Tolerar la frustración construye resiliencia duradera. Es una de las habilidades más valiosas en la vida adulta.', emoji: '💪' },
  'Manejar los cambios de rutina':      { texto: 'La flexibilidad ante los cambios reduce el estrés y mejora la adaptación en todo contexto.', emoji: '🔄' },
  'Relacionarse mejor con otros niños': { texto: 'Las conexiones positivas tempranas son el mayor predictor de bienestar emocional adulto.', emoji: '🤝' },
  'Manejar el miedo y la angustia':     { texto: 'Aprender a regular el miedo desde pequeño protege la salud mental a largo plazo.', emoji: '🛡️' },
  'Concentrarse y calmarse':            { texto: 'La calma y el foco son habilidades entrenables con práctica constante, no rasgos fijos.', emoji: '🧘' },
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
  { label: 'Calmarse cuando explota',               tecnico: 'Autorregulación emocional',       emoji: '🌊' },
  { label: 'Aceptar el "no" sin crisis',            tecnico: 'Resiliencia ante la frustración', emoji: '💪' },
  { label: 'Manejar los cambios de rutina',         tecnico: 'Tolerancia a los cambios',        emoji: '🔄' },
  { label: 'Relacionarse mejor con otros niños',    tecnico: 'Habilidades sociales',             emoji: '🤝' },
  { label: 'Manejar el miedo y la angustia',        tecnico: 'Manejo del miedo',                emoji: '🛡️' },
  { label: 'Concentrarse y calmarse',               tecnico: 'Concentración y calma',           emoji: '🧘' },
]

function parsePlan(texto) {
  if (!texto) return { intro: '', semanas: [] }
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
        estrategia: estrategiaMatch ? estrategiaMatch[1].trim() : contenido,
        indicador: indicadorMatch ? indicadorMatch[1].trim() : null,
      }
    }),
  }
}

export default function EstrategiasPage() {
  const { state, addEstrategia, updateEstrategia } = useHuella()
  const location = useLocation()
  const navigate = useNavigate()
  const initNueva = location.state?.nueva === true
  const initHabilidad = location.state?.habilidad || ''
  const [vista, setVista] = useState(initNueva ? 'nueva' : 'lista')
  const [selectedId, setSelectedId] = useState(null)
  const [habilidad, setHabilidad] = useState(initHabilidad)
  const [descripcion, setDescripcion] = useState('')
  const [plan, setPlan] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingTareas, setLoadingTareas] = useState(false)
  const [loadingAvanzar, setLoadingAvanzar] = useState(false)
  const [checkinVisible, setCheckinVisible] = useState(false)
  const [checkinTexto, setCheckinTexto] = useState('')
  const [loadingRegen, setLoadingRegen] = useState(false)

  // Derive from context so it auto-updates after updateEstrategia
  const estrategiaSeleccionada = selectedId
    ? state.estrategias.find((e) => e.id === selectedId) ?? null
    : null

  function abrirDetalle(e) {
    setSelectedId(e.id)
    setVista('detalle')
  }

  async function handleCrearPlan() {
    if (!habilidad) return
    setLoadingPlan(true)
    try {
      const habilidadObj = HABILIDADES.find((h) => h.label === habilidad)
      const habilidadIA = habilidadObj?.tecnico ?? habilidad
      // Generar plan y tareas en paralelo — ambos se guardan juntos en el insert inicial
      const [texto, tareasJson] = await Promise.all([
        generarEstrategia({ hijo: state.hijo, habilidad: habilidadIA, descripcion }),
        generarTareas({ hijo: state.hijo, habilidad: habilidadIA, descripcion }),
      ])
      setPlan(texto)
      await addEstrategia({
        id: Date.now().toString(),
        habilidad,
        descripcion,
        plan: texto,
        tareas: tareasJson ?? {},
        fechaInicio: new Date().toISOString(),
        semanaActual: 1,
      })
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
      const texto = await generarEstrategia({
        hijo: state.hijo,
        habilidad: habilidadIA,
        descripcion: estrategiaSeleccionada.descripcion,
      })
      await updateEstrategia({ id: estrategiaSeleccionada.id, plan: texto })
    } catch (e) {
      // silencioso — el usuario puede reintentar
    } finally {
      setLoadingRegen(false)
    }
  }

  async function handleAvanzarSemana() {
    if (!estrategiaSeleccionada || estrategiaSeleccionada.semanaActual >= 4) return
    setCheckinVisible(false)
    setCheckinTexto('')
    setLoadingAvanzar(true)
    const nextSemana = estrategiaSeleccionada.semanaActual + 1
    await updateEstrategia({ id: estrategiaSeleccionada.id, semanaActual: nextSemana })
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
          <div className={styles.habilidadesGrid}>
            {HABILIDADES.map((h) => (
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
        </Card>

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

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleCrearPlan}
          disabled={!habilidad}
          loading={loadingPlan}
        >
          Generar plan de 4 semanas
        </Button>

        {(plan || loadingPlan) && (
          <RespuestaIA
            texto={plan}
            loading={loadingPlan}
            mensajeCarga="Diseñando tu plan de 4 semanas..."
            categoria="estrategia"
          />
        )}
      </div>
    )
  }

  // ── VISTA: DETALLE ────────────────────────────────────────────────────────
  if (vista === 'detalle' && estrategiaSeleccionada) {
    const planValido = estrategiaSeleccionada.plan &&
      !estrategiaSeleccionada.plan.includes('VITE_ANTHROPIC') &&
      estrategiaSeleccionada.plan.trim().length > 50
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
            <p className={styles.introTexto}>{intro}</p>
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
                        {semana.estrategia && (
                          <div className={styles.semanaItem}>
                            <span className={styles.semanaItemLabel}>Qué hacer esta semana</span>
                            <p>{semana.estrategia}</p>
                          </div>
                        )}
                        {semana.indicador && (
                          <div className={styles.semanaItem}>
                            <span className={styles.semanaItemLabel}>Cómo saber si está funcionando</span>
                            <p>{semana.indicador}</p>
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
            : <RespuestaIA texto={estrategiaSeleccionada.plan} />
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
        <h2 className={styles.titulo}>Estrategias</h2>
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
        state.estrategias.map((e) => (
          <Card key={e.id} onClick={() => abrirDetalle(e)}>
            <div className={styles.estrategiaHeader}>
              <h4 className={styles.estrategiaNombre}>{e.habilidad}</h4>
              <div className={styles.estrategiaHeaderRight}>
                <span className={`${styles.semanaTag} ${e.semanaActual >= 4 ? styles.semanaTagCompletada : ''}`}>
                  {e.semanaActual >= 4 ? 'Completado' : `Semana ${e.semanaActual}/4`}
                </span>
                <ChevronRight size={16} color="var(--color-text-muted)" />
              </div>
            </div>
            <p className={styles.estrategiaFecha}>
              Iniciada el {new Date(e.fechaInicio).toLocaleDateString('es-CL')}
            </p>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(Math.min(e.semanaActual, 4) / 4) * 100}%` }}
              />
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
