import React from 'react'
import { motion } from 'framer-motion'
import { tokensMovimiento, useMovimientoReducido } from '../motion/MotionPrimitives'
import { diaChile, ultimosDiasChile } from '../../utils/fechaChile'
import styles from './BarrasSemana.module.css'

// La semana en 7 columnas. Salió de TarjetaCerebro para vivir en la card
// "Esta semana" del Home. Las barras crecen desde abajo al montar; los días sin
// registro quedan como una marca mínima para que la semana se lea completa.
//
// Color: la semana normal se lee en pistacho y SOLO el día alto sale en
// terracota. Así el naranjo deja de ser el único color de la vista y pasa a
// significar algo — "acá pasó lo fuerte" — en vez de ser el relleno por
// defecto. Un día se considera alto si empata con el máximo de la semana Y ese
// máximo es de al menos 2: una semana plana de un registro por día no tiene
// día alto, y marcarla entera de naranjo sería mentir.
const MIN_DIA_ALTO = 2

// Momentos por día de los últimos 7 días en Chile: episodios Y avances, por la
// fecha del momento (no la de registro). Antes contaba solo episodios, y una
// semana de puros avances se veía vacía al lado de un análisis que sí los leía.
export function contarMomentosPorDia(episodios, hitos, ahora = new Date()) {
  const dias = ultimosDiasChile(7, ahora)
  const porFecha = new Map(dias.map((d) => [d.fecha, 0]))
  for (const m of [...(episodios || []), ...(hitos || [])]) {
    const f = diaChile(m.fecha)
    if (porFecha.has(f)) porFecha.set(f, porFecha.get(f) + 1)
  }
  return dias.map((d) => ({ day: d.dia, count: porFecha.get(d.fecha) }))
}

export default function BarrasSemana({ data }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className={styles.semana}>
      <div className={styles.barras}>
        {data.map((d, i) => {
          const alto = d.count === 0 ? 4 : 8 + (d.count / max) * 40
          const esAlto = d.count === max && max >= MIN_DIA_ALTO
          const tono = d.count === 0
            ? styles.barraVacia
            : esAlto ? styles.barraAlta : ''
          return (
            <span key={i} className={styles.columna}>
              <motion.i
                className={`${styles.barra} ${tono}`}
                initial={{ height: reducido ? alto : 0 }}
                animate={{ height: alto }}
                transition={{
                  duration: reducido ? 0 : t.lenta,
                  ease: t.easeEntrada,
                  delay: reducido ? 0 : i * 0.045,
                }}
              />
            </span>
          )
        })}
      </div>
      <div className={styles.dias} aria-hidden="true">
        {data.map((d, i) => <span key={i}>{d.day}</span>)}
      </div>
    </div>
  )
}
