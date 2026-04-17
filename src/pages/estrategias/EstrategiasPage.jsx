import React, { useState } from 'react'
import { Target, Plus } from 'lucide-react'
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

export default function EstrategiasPage() {
  const { state, addEstrategia } = useHuella()
  const [vista, setVista] = useState('lista')
  const [habilidad, setHabilidad] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [plan, setPlan] = useState('')
  const [loadingPlan, setLoadingPlan] = useState(false)

  async function handleCrearPlan() {
    if (!habilidad) return
    setLoadingPlan(true)
    try {
      const texto = import.meta.env.VITE_ANTHROPIC_API_KEY
        ? await generarEstrategia({ hijo: state.hijo, habilidad, descripcion })
        : 'Configura tu VITE_ANTHROPIC_API_KEY para generar planes personalizados.'
      setPlan(texto)

      addEstrategia({
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
          <Card key={e.id}>
            <div className={styles.estrategiaHeader}>
              <h4 className={styles.estrategiaNombre}>{e.habilidad}</h4>
              <span className={styles.semanaTag}>Semana {e.semanaActual}/4</span>
            </div>
            <p className={styles.estrategiaFecha}>
              Iniciada el {new Date(e.fechaInicio).toLocaleDateString('es-CL')}
            </p>
          </Card>
        ))
      )}
    </div>
  )
}
