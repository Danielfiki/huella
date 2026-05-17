import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { supabase } from '../../lib/supabase'
import { analizarCierreCiclo } from '../../services/anthropic'
import { retryAsync, esErrorIAReintentable } from '../../utils/retryAsync'
import LoadingDignificado from './components/LoadingDignificado'

// Bloque 2 de Fase 5 P3 Cierre. Render crudo a propósito: la UI bonita
// (mockup Pantalla3_Cierre) llega en el Bloque 3. Aquí solo verificamos
// el flujo de punta a punta: montar tras el cierre, generar el análisis
// con la IA, persistirlo en estrategia_ciclos.cierre_analisis y mostrarlo.

const PASOS_LOADING_CIERRE = [
  'Releyendo tus reflexiones',
  'Revisando los episodios del ciclo',
  'Conectando con bibliografía pediátrica',
  'Escribiendo tu análisis'
]

export default function EstrategiaCierrePage() {
  const { id, cicloNumero } = useParams()
  const navigate = useNavigate()
  const { state, reloadEstrategias } = useHuella()
  const generadoRef = useRef(false)

  const plan = useMemo(
    () => (state.estrategias || []).find((p) => p.id === id),
    [state.estrategias, id]
  )
  const ciclo = useMemo(() => {
    if (!plan) return null
    return (plan.ciclos || []).find(
      (c) => String(c.numero_ciclo) === String(cicloNumero)
    )
  }, [plan, cicloNumero])

  // Validación defensiva: si el ciclo no existe o no está cerrado,
  // volvemos al detalle de la estrategia.
  useEffect(() => {
    if (!plan) return
    if (!ciclo || ciclo.estado !== 'cerrado') {
      navigate(`/estrategias/${id}`, { replace: true })
    }
  }, [plan, ciclo, id, navigate])

  const fueAbandonado = ciclo?.cierre_analisis?.motivo === 'abandonado'

  const [estado, setEstado] = useState('inicial')
  const [analisis, setAnalisis] = useState(null)

  const yaGenerado = Boolean(ciclo?.cierre_analisis?.que_cambio)

  const hijo = useMemo(
    () => (state.hijos || []).find((h) => h.id === plan?.hijo_id),
    [state.hijos, plan?.hijo_id]
  )

  const notas_bitacora = useMemo(() => {
    return (ciclo?.checkins_legacy || [])
      .map((c) => ({
        contenido: c.reflexion || '',
        created_at: c.completada_at,
        semana_numero: c.semana_numero
      }))
      .filter((n) => n.contenido.trim().length > 0)
  }, [ciclo?.checkins_legacy])

  const episodios_vinculados = useMemo(() => {
    if (!ciclo?.fecha_inicio) return []
    const inicio = new Date(ciclo.fecha_inicio)
    const fin = ciclo.fecha_cierre ? new Date(ciclo.fecha_cierre) : new Date()
    return (state.episodios || []).filter((e) => {
      const f = new Date(e.fecha)
      return f >= inicio && f <= fin
    })
  }, [ciclo?.fecha_inicio, ciclo?.fecha_cierre, state.episodios])

  useEffect(() => {
    if (!plan || !ciclo) return
    if (fueAbandonado) return
    // Idempotencia: si ya hay análisis IA persistido, no re-llamamos.
    if (yaGenerado) {
      setAnalisis(ciclo.cierre_analisis)
      setEstado('listo')
      return
    }
    if (generadoRef.current) return

    let cancelado = false
    generadoRef.current = true

    async function generar() {
      setEstado('cargando')
      console.log('[P3 Cierre] generar() iniciado para ciclo', ciclo?.id)
      try {
        console.log('[P3 Cierre] llamando analizarCierreCiclo...')
        const resultado = await retryAsync(
          () => analizarCierreCiclo({
            hijo: hijo
              ? { nombre: hijo.nombre, edad: hijo.edad, genero: hijo.genero }
              : { nombre: '' },
            ciclo: {
              numero_ciclo: ciclo.numero_ciclo,
              plan: ciclo.plan,
              fecha_inicio: ciclo.fecha_inicio,
              fecha_cierre: ciclo.fecha_cierre,
              duracion_semanas: ciclo.duracion_semanas
            },
            notas_bitacora,
            episodios_vinculados
          }),
          { esReintentable: esErrorIAReintentable }
        )
        console.log('[P3 Cierre] analizarCierreCiclo respondió:', resultado)
        if (cancelado) return

        const { error: dbErr } = await supabase
          .from('estrategia_ciclos')
          .update({ cierre_analisis: resultado })
          .eq('id', ciclo.id)
        if (dbErr) throw new Error(dbErr.message)

        if (cancelado) return
        setAnalisis(resultado)
        setEstado('listo')

        // Refrescar estado global sin bloquear el render del análisis.
        reloadEstrategias().catch((err) =>
          console.error('reloadEstrategias post-cierre:', err)
        )
      } catch (err) {
        console.error('EstrategiaCierrePage.generar failed:', err)
        generadoRef.current = false
        if (!cancelado) setEstado('error')
      }
    }

    generar()
    return () => { cancelado = true }
  }, [plan?.id, ciclo?.id, fueAbandonado, yaGenerado])

  if (!plan || !ciclo) {
    return <div style={{ padding: 24 }}>Cargando…</div>
  }

  if (fueAbandonado) {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <p>Este plan fue abandonado{ciclo.cierre_analisis?.abandonado_at
          ? ` el ${new Date(ciclo.cierre_analisis.abandonado_at).toLocaleDateString('es-CL')}`
          : ''}. No hay análisis disponible.</p>
        <button onClick={() => navigate(`/estrategias/${id}`)}>Volver al detalle</button>
      </div>
    )
  }

  if (estado === 'cargando' || estado === 'inicial') {
    return (
      <LoadingDignificado
        titulo="Estamos cerrando tu ciclo."
        sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
        pasos={PASOS_LOADING_CIERRE}
        pasoActual={0}
        habilidadId={plan.habilidad_id}
        hijoEdad={hijo?.edad}
      />
    )
  }

  if (estado === 'error') {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <p>No pudimos generar el análisis. Intenta de nuevo.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={() => { generadoRef.current = false; setEstado('inicial') }}>Reintentar</button>
          <button onClick={() => navigate(`/estrategias/${id}`)}>Volver al detalle</button>
        </div>
      </div>
    )
  }

  // estado === 'listo'
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: '0 auto', fontFamily: 'inherit' }}>
      <h2>Cierre del ciclo {ciclo.numero_ciclo} (BLOQUE 2 — render crudo)</h2>
      <p><strong>Plan:</strong> {plan.habilidad_nombre || plan.habilidad}</p>
      <p><strong>Hijo/a:</strong> {hijo?.nombre || '—'}</p>
      <p><strong>Duración:</strong> {ciclo.duracion_semanas} semanas</p>
      <p><strong>Notas:</strong> {notas_bitacora.length}</p>
      <p><strong>Episodios vinculados:</strong> {episodios_vinculados.length}</p>

      <h3>Qué cambió</h3>
      <p>{analisis?.que_cambio || '(vacío)'}</p>

      <h3>Qué quedó pendiente</h3>
      <p>{analisis?.que_quedo_pendiente || '(vacío)'}</p>

      <h3>Recomendaciones</h3>
      {analisis?.recomendaciones?.length > 0 ? (
        <ul>{analisis.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}</ul>
      ) : <p>(vacío)</p>}

      <div style={{ marginTop: 32 }}>
        <button onClick={() => navigate(`/estrategias/${id}`)}>Volver al detalle</button>
      </div>
    </div>
  )
}
