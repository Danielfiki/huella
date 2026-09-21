import React from 'react'
import { motion } from 'framer-motion'
import Escarabajo from '../ui/Escarabajo'
import { NumeroQueCuenta, tokensMovimiento, useMovimientoReducido } from '../motion/MotionPrimitives'
import styles from './GuiaPrimerosPasos.module.css'

// La guía de primeros pasos de una cuenta nueva. Salió tal cual de
// TarjetaCerebro (su estado "primeros") para vivir en la card "Esta semana":
// es lo que esa card muestra mientras el hijo tiene menos de 3 momentos.
// Cuenta momentos (episodios + avances), igual que el Historial.
//
// El paso 3 no se marca nunca: cuando llegan los 3 momentos la card deja de
// mostrar la guía y pasa a leer la semana, que es justamente ese paso.
const PASOS = [
  { texto: () => 'Registra lo que pasó',   hecho: (n) => n >= 1 },
  { texto: () => 'Registra dos momentos más', hecho: (n) => n >= 3 },
  { texto: (nombre) => `Huella te muestra los patrones de ${nombre}`, hecho: () => false },
]

// Barra de N segmentos que se encienden en cascada al entrar.
function Segmentos({ total, encendidos }) {
  const t = tokensMovimiento()
  const reducido = useMovimientoReducido()
  return (
    <div className={styles.segmentos} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className={`${styles.segmento} ${i < encendidos ? styles.segmentoOn : ''}`}
          initial={{ opacity: reducido ? 1 : 0.25, scaleX: reducido ? 1 : 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: reducido ? 0 : t.media,
            ease: t.easeEntrada,
            delay: reducido ? 0 : i * 0.06,
          }}
        />
      ))}
    </div>
  )
}

export default function GuiaPrimerosPasos({ nombreHijo, totalMomentos }) {
  const pasosHechos = PASOS.filter((p) => p.hecho(totalMomentos)).length
  const pasoActual = PASOS.findIndex((p) => !p.hecho(totalMomentos))

  return (
    <div className={styles.cuerpo}>
      <div className={styles.filaDato}>
        <span className={styles.numeroGrande}>
          <NumeroQueCuenta valor={pasosHechos} />
        </span>
        <span className={styles.numeroLabel}>de 3 primeros pasos</span>
      </div>
      <Segmentos total={3} encendidos={pasosHechos} />
      <ul className={styles.pasos}>
        {PASOS.map((paso, i) => {
          const hecho = paso.hecho(totalMomentos)
          const actual = i === pasoActual
          return (
            <li key={i} className={styles.paso}>
              {hecho ? (
                <span className={styles.marcaHecha} aria-hidden="true">✓</span>
              ) : actual ? (
                <span className={styles.marcaActual}>
                  <Escarabajo className={styles.marcaActualIcon} />
                </span>
              ) : (
                <span className={styles.marcaPend} aria-hidden="true" />
              )}
              <span className={`${styles.pasoTexto} ${hecho ? styles.pasoTextoHecho : ''}`}>
                {paso.texto(nombreHijo)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
