// MotionLab.jsx
// Laboratorio interno del sistema de movimiento. NO esta en ninguna ruta de
// usuario: se llega solo desde /mockups, que es la pantalla de revision.
//
// Existe para dos cosas:
//   1. Ver las tres primitivas de MotionPrimitives.jsx antes de meterlas al Home.
//   2. Probar `prefers-reduced-motion` sin adivinar: muestra en pantalla si el
//      sistema lo tiene activo y que duraciones quedaron vigentes.

import React, { useState } from 'react'
import {
  TarjetaEntrada,
  BarraProgreso,
  NumeroQueCuenta,
  tokensMovimiento,
  useMovimientoReducido,
} from '../components/motion/MotionPrimitives'
import s from './MotionLab.module.css'

export default function MotionLab() {
  // `remonte` fuerza el remount de la seccion para volver a ver las entradas
  // sin recargar la pagina (las animaciones son `once: true`).
  const [remonte, setRemonte] = useState(0)
  const reducido = useMovimientoReducido()
  const t = tokensMovimiento()

  return (
    <div className={s.lab}>
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>Laboratorio de movimiento</p>
          <h1 className={s.titulo}>Base del Home nuevo</h1>
        </div>
        <button className={s.repetir} onClick={() => setRemonte((n) => n + 1)}>
          Repetir animaciones
        </button>
      </header>

      <div className={s.estado}>
        <span className={`${s.chip} ${reducido ? s.chipOn : ''}`}>
          {reducido ? 'Movimiento reducido: ACTIVO' : 'Movimiento reducido: apagado'}
        </span>
        <span className={s.chipInfo}>
          rapida {Math.round(t.rapida * 1000)}ms · media {Math.round(t.media * 1000)}ms · lenta {Math.round(t.lenta * 1000)}ms
        </span>
      </div>

      <div key={remonte} className={s.stack}>
        {/* ── 1. Entrada de tarjeta ── */}
        <section className={s.bloque}>
          <p className={s.bloqueTtl}>1 · Entrada de tarjeta</p>
          <div className={s.tarjetas}>
            {['Resumen semanal', 'Ultimo avance', 'Lo que acompanas'].map((txt, i) => (
              <TarjetaEntrada key={txt} delay={i * 0.06} className={s.tarjeta}>
                <span className={s.tarjetaTxt}>{txt}</span>
              </TarjetaEntrada>
            ))}
          </div>
        </section>

        {/* ── 2. Barra que crece ── */}
        <section className={s.bloque}>
          <p className={s.bloqueTtl}>2 · Barra que crece</p>
          <div className={s.barras}>
            <div className={s.barraFila}>
              <span className={s.barraLbl}>Medallas · 12 de 33</span>
              <BarraProgreso valor={12} max={33} etiqueta="Medallas desbloqueadas" />
            </div>
            <div className={s.barraFila}>
              <span className={s.barraLbl}>Rasgos · 5 de 12</span>
              <BarraProgreso
                valor={5}
                max={12}
                color="var(--color-accent-green)"
                etiqueta="Rasgos confirmados"
              />
            </div>
            <div className={s.barraFila}>
              <span className={s.barraLbl}>Plan · semana 3 de 4</span>
              <BarraProgreso
                valor={3}
                max={4}
                color="var(--color-accent-mocha)"
                etiqueta="Semanas del plan"
              />
            </div>
          </div>
        </section>

        {/* ── 3. Numero que cuenta ── */}
        <section className={s.bloque}>
          <p className={s.bloqueTtl}>3 · Numero que cuenta</p>
          <div className={s.numeros}>
            <div className={s.numeroCelda}>
              <NumeroQueCuenta valor={14} className={s.numero} />
              <span className={s.numeroLbl}>Episodios</span>
            </div>
            <div className={s.numeroCelda}>
              <NumeroQueCuenta valor={2.8} decimales={1} className={`${s.numero} ${s.numeroTang}`} />
              <span className={s.numeroLbl}>Intensidad media</span>
            </div>
            <div className={s.numeroCelda}>
              <NumeroQueCuenta valor={31} sufijo="%" className={`${s.numero} ${s.numeroVerde}`} />
              <span className={s.numeroLbl}>Menos que la semana pasada</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
