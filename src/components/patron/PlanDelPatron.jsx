import React from 'react'
import { ChevronRight } from 'lucide-react'
import { estadoPlan } from '../../pages/estrategias/helpers'
import styles from './PlanDelPatron.module.css'

// El pie de la lectura de un patrón, en dos estados excluyentes:
//
//   SIN plan  → la invitación a armar uno.
//   CON plan  → dónde va ese plan, y la puerta para entrar.
//
// Es la pieza que convierte la lectura de "algo que leí una vez" en "algo que
// estoy trabajando". Antes acá solo había un botón "Ver el plan" que aparecía
// si existía `estrategia_id`, sin decir nada de en qué iba.
//
// REGLAS DE TONO: nunca rojo, nunca alarma, y la clasificación interna del
// patrón (esperable / instalado / derivar) JAMÁS aparece en pantalla.

const TOTAL_POR_DEFECTO = 4

// "abandonado" es un estado de la base, no una palabra que el padre deba leer.
// En pantalla siempre es "En pausa": dejar un plan a medias no es un fracaso, y
// nombrarlo así invita a retomarlo en vez de cerrar el tema.
const PILDORA = {
  activo:     'En curso',
  completado: 'Completado',
  abandonado: 'En pausa',
}

function Segmentos({ total, semanaActual, estado }) {
  return (
    <div className={styles.segmentos} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const semana = i + 1
        let tono = styles.segPendiente
        if (estado === 'completado') tono = styles.segLograda
        else if (semana < semanaActual) tono = styles.segLograda
        // En pausa no lleva segmento terracota: nada está "en curso" ahora
        // mismo, y pintarlo diría que hay algo andando que no anda.
        else if (semana === semanaActual && estado === 'activo') tono = styles.segEnCurso
        return <span key={semana} className={`${styles.segmento} ${tono}`} />
      })}
    </div>
  )
}

export default function PlanDelPatron({ plan, onCrear, onVer, creando = false, error = '' }) {
  // ── SIN PLAN: la invitación ──
  if (!plan) {
    return (
      <section className={styles.invitacion}>
        <h3 className={styles.invitacionTitulo}>¿Quieres trabajar esto con un plan?</h3>
        <p className={styles.invitacionCuerpo}>
          Cuatro semanas, un paso pequeño por semana. Lo llevas a tu ritmo y
          puedes pausarlo cuando quieras.
        </p>
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="button"
          className={styles.cta}
          onClick={onCrear}
          disabled={creando}
        >
          {creando ? 'Armando tu plan…' : 'Crear plan de 4 semanas'}
        </button>
      </section>
    )
  }

  // ── CON PLAN: el progreso ──
  //
  // El estado NO viene como campo: el objeto de estrategia del estado global no
  // tiene clave `estado`. Se deriva de los ciclos, y `estadoPlan` es el helper
  // canónico que ya usan Estrategias y el detalle del plan.
  //
  // Leerlo como `plan.estado` daba `undefined`, y eso hacía que la barra se
  // viera entera gris: la píldora caía al default "En curso" y parecía correcta,
  // pero ningún segmento matcheaba 'activo'.
  const estado = estadoPlan(plan)
  // El total sale del plan, no de un 4 fijo: si algún día un plan dura otra
  // cosa, la barra y el texto tienen que decir la verdad.
  const total = plan.total_semanas || TOTAL_POR_DEFECTO
  const semana = plan.semanaActual || 1

  const meta = estado === 'completado'
    ? `Terminaste las ${total} semanas`
    : estado === 'abandonado'
      ? `Quedó en la semana ${semana} · puedes retomarlo cuando quieras`
      : `Semana ${semana} de ${total}`

  return (
    <button type="button" className={`${styles.plan} ${styles['plan_' + estado] || ''}`} onClick={onVer}>
      <span className={styles.planCabeza}>
        <span className={styles.eyebrow}>Tu plan</span>
        <span className={styles.pildora}>{PILDORA[estado] || PILDORA.activo}</span>
      </span>

      <span className={styles.planNombre}>{plan.habilidad}</span>
      <span className={styles.planMeta}>{meta}</span>

      <Segmentos total={total} semanaActual={semana} estado={estado} />

      <span className={styles.planPie}>
        Ver el plan
        <ChevronRight size={16} />
      </span>
    </button>
  )
}
