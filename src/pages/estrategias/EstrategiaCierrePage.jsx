import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useHuella } from '../../context/HuellaContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { analizarCierreCiclo, generarCicloN } from '../../services/anthropic'
import { retryAsync, esErrorIAReintentable } from '../../utils/retryAsync'
import LoadingDignificado from './components/LoadingDignificado'
import Pantalla3_Cierre from './Pantalla3_Cierre'

// EstrategiaCierrePage.jsx · Bloque 3 de Fase 5 P3 Cierre.
// Contenedor con toda la lógica: carga del plan y ciclo, generación
// del análisis IA con retryAsync, persistencia en
// estrategia_ciclos.cierre_analisis, manejo de estados (inicial /
// cargando / listo / error / abandonado), guarda por
// motivo === 'abandonado' e idempotencia con yaGenerado.
// El estado 'listo' renderiza <Pantalla3_Cierre /> que es la UI
// visual entregada por Claude Design.

const PASOS_LOADING_CIERRE = [
  'Releyendo tus reflexiones',
  'Revisando los episodios del ciclo',
  'Conectando con bibliografía pediátrica',
  'Escribiendo tu análisis'
]

const PASOS_LOADING_CICLO_NUEVO = [
  'Releyendo el cierre del ciclo anterior',
  'Adaptando las próximas semanas',
  'Conectando con bibliografía pediátrica',
  'Escribiendo tu nuevo ciclo'
]

export default function EstrategiaCierrePage() {
  const { id, cicloNumero } = useParams()
  const navigate = useNavigate()
  const { state, reloadEstrategias } = useHuella()
  const { user } = useAuth()
  const generadoRef = useRef(false)
  const creandoRef = useRef(false)

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
  const [procesando, setProcesando] = useState(false)

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

  const handleIniciarNuevoCiclo = async () => {
    if (!plan || !ciclo || !hijo) return
    // Candado de idempotencia: el ref bloquea el doble-tap sincrónico
    // (el estado es async y se colaría antes del re-render). Evita
    // intentar crear dos veces el mismo ciclo.
    if (creandoRef.current) return
    creandoRef.current = true
    setProcesando(true)
    setEstado('creando_ciclo')
    try {
      console.log('[P3 Cierre] iniciando creación de ciclo N+1')
      const resultado = await retryAsync(
        () => generarCicloN({
          hijo: { nombre: hijo.nombre, edad: hijo.edad, genero: hijo.genero },
          habilidad: plan.habilidad_nombre || plan.habilidad,
          descripcion: '',
          usar_memoria_ia: true,
          ciclo_anterior: { plan: ciclo.plan, cierre_analisis: ciclo.cierre_analisis },
          numero_ciclo: ciclo.numero_ciclo + 1,
        }),
        { esReintentable: esErrorIAReintentable }
      )
      if (!resultado) throw new Error('generarCicloN retornó null')
      console.log('[P3 Cierre] generarCicloN OK, normalizando...')

      // Normalización idéntica al patrón de EstrategiaNuevaPage
      const planNormalizado = {
        porQueImporta: resultado.porQueImporta || '',
        duracion_semanas: resultado.duracion_semanas,
        semanas: (resultado.semanas || []).map((s, si) => ({
          numero: s.numero ?? si + 1,
          titulo: s.titulo || '',
          descripcion: s.accion || s.descripcion || '',
          tareas: (s.tareas || []).map((t, ti) =>
            typeof t === 'string'
              ? { id: `s${si + 1}t${ti + 1}`, texto: t, completada: false }
              : t
          ),
        })),
      }

      // Insert del nuevo ciclo
      const { error: dbErr } = await supabase
        .from('estrategia_ciclos')
        .insert({
          estrategia_id: plan.id,
          user_id: user?.id ?? plan.userId,
          hijo_id: plan.hijo_id,
          numero_ciclo: ciclo.numero_ciclo + 1,
          estado: 'activo',
          plan: planNormalizado,
          semana_actual: 1,
          duracion_semanas: planNormalizado.duracion_semanas,
          usar_memoria_ia: true,
        })
      if (dbErr) throw new Error(dbErr.message)
      console.log('[P3 Cierre] insert OK, recargando estado')

      await reloadEstrategias()
      navigate(`/estrategias/${id}`, { replace: true })
    } catch (err) {
      console.error('handleIniciarNuevoCiclo failed:', err)
      creandoRef.current = false
      setProcesando(false)
      setEstado('error_ciclo')
    }
  }

  const handleTrabajarLibre = () => {
    navigate('/estrategias')
  }

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
      <>
        <LoadingDignificado
          titulo="Estamos cerrando tu ciclo."
          sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
          pasos={PASOS_LOADING_CIERRE}
          pasoActual={0}
          habilidadId={plan.habilidad_id}
          hijoEdad={hijo?.edad}
        />
        <EscapeHatch navigate={navigate} />
      </>
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

  if (estado === 'creando_ciclo') {
    return (
      <>
        <LoadingDignificado
          titulo="Estamos armando tu próximo ciclo."
          sub="Tarda menos de un minuto. Quédate por acá mientras tanto."
          pasos={PASOS_LOADING_CICLO_NUEVO}
          pasoActual={0}
          habilidadId={plan?.habilidad_id || plan?.habilidad}
          hijoEdad={hijo?.edad}
        />
        <EscapeHatch navigate={navigate} />
      </>
    )
  }

  if (estado === 'error_ciclo') {
    return (
      <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
        <p>No pudimos crear el nuevo ciclo. Intenta de nuevo.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={handleIniciarNuevoCiclo}>Reintentar</button>
          <button onClick={() => setEstado('listo')}>Volver al cierre</button>
        </div>
      </div>
    )
  }

  // estado === 'listo'
  return (
    <Pantalla3_Cierre
      plan={{
        habilidad_nombre: plan.habilidad_nombre || plan.habilidad,
        habilidad_id: plan.habilidad_id || plan.habilidad,
        total_semanas: ciclo.duracion_semanas,
        notas_count: notas_bitacora.length,
        episodios_count: episodios_vinculados.length,
      }}
      cierreAnalisis={analisis}
      hijoNombre={hijo?.nombre ?? 'tu hijo'}
      cicloNumero={ciclo.numero_ciclo}
      onIniciarNuevoCiclo={handleIniciarNuevoCiclo}
      onTrabajarLibre={handleTrabajarLibre}
      procesando={procesando}
    />
  )
}

// Salida visible bajo cualquier loader de P3. El cierre del ciclo ya
// quedó persistido en estrategia_ciclos antes de llegar acá, así que
// salir es seguro: el papá vuelve a la lista, ve su plan en "Lo que
// ya trabajaste", y puede volver al detalle cuando quiera.
function EscapeHatch({ navigate }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
      <button
        type="button"
        onClick={() => navigate('/estrategias')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontSize: 13,
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: '8px 12px',
        }}
      >
        Volver a Estrategias
      </button>
    </div>
  )
}
