import React, { useState } from 'react'
import { Target, Plus, ChevronRight, CheckCircle, Lock, ArrowRight } from 'lucide-react'
import { useHuella } from '../../context/HuellaContext'
import { generarEstrategia } from '../../services/anthropic'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import RespuestaIA from '../../components/ui/RespuestaIA'
import styles from './EstrategiasPage.module.css'

const HABILIDADES = [
  'Autorregulación emocional',
  'Resiliencia ante la frustración',
  'Tolerancia a los cambios',
  'Habilidades sociales',
  'Manejo del miedo',
  'Concentración y calma',
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
  const [vista, setVista] = useState('lista')
  const [selectedId, setSelectedId] = useState(null)
  const [habilidad, setHabilidad] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [plan, setPlan] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [loadingAvanzar, setLoadingAvanzar] = useState(false)

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
      const texto = await generarEstrategia({ hijo: state.hijo, habilidad, descripcion })
      setPlan(texto)
      await addEstrategia({
        id: Date.now().toString(),
        habilidad,
        descripcion,
        plan: texto,
        fechaInicio: new Date().toISOString(),
        semanaActual: 1,
      })
    } catch (e) {
      setPlan('Error al generar el plan: ' + e.message)
    } finally {
      setLoadingPlan(false)
    }
  }

  async function handleAvanzarSemana() {
    if (!estrategiaSeleccionada || estrategiaSeleccionada.semanaActual >= 4) return
    setLoadingAvanzar(true)
    await updateEstrategia({
      id: estrategiaSeleccionada.id,
      semanaActual: estrategiaSeleccionada.semanaActual + 1,
    })
    setLoadingAvanzar(false)
  }

  // ── VISTA: NUEVA ──────────────────────────────────────────────────────────
  if (vista === 'nueva') {
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => setVista('lista')}>← Volver</button>
        <h2 className={styles.titulo}>Nueva estrategia</h2>

        <Card>
          <p className={styles.label}>¿Qué habilidad quieres fortalecer?</p>
          <div className={styles.habilidadesGrid}>
            {HABILIDADES.map((h) => (
              <button
                key={h}
                className={`${styles.habilidadBtn} ${habilidad === h ? styles.habilidadSelected : ''}`}
                onClick={() => setHabilidad(h)}
              >
                {h}
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

        {(plan || loadingPlan) && <RespuestaIA texto={plan} loading={loadingPlan} />}
      </div>
    )
  }

  // ── VISTA: DETALLE ────────────────────────────────────────────────────────
  if (vista === 'detalle' && estrategiaSeleccionada) {
    const { intro, semanas } = parsePlan(estrategiaSeleccionada.plan)
    const semanaActual = estrategiaSeleccionada.semanaActual

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
          {semanas.length > 0
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
                            <span className={styles.semanaItemLabel}>Estrategia</span>
                            <p>{semana.estrategia}</p>
                          </div>
                        )}
                        {semana.indicador && (
                          <div className={styles.semanaItem}>
                            <span className={styles.semanaItemLabel}>Indicador</span>
                            <p>{semana.indicador}</p>
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
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAvanzarSemana}
            loading={loadingAvanzar}
          >
            Avanzar a semana {semanaActual + 1}
          </Button>
        ) : (
          <Card className={styles.completadoBanner}>
            <CheckCircle size={28} color="var(--color-success)" />
            <p>¡Plan completado! Considera crear una nueva estrategia para seguir creciendo.</p>
          </Card>
        )}
      </div>
    )
  }

  // ── VISTA: LISTA ──────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Estrategias</h2>
        <Button variant="primary" size="sm" onClick={() => setVista('nueva')}>
          <Plus size={16} /> Nueva
        </Button>
      </div>

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
