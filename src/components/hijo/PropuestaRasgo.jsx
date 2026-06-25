import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import s from './PropuestaRasgo.module.css'

// Colores por familia (solo para el dot). Vienen del diseno aprobado de la
// Fase 1 "el retrato que madura"; van como constantes locales documentadas
// porque dependen del dato `familia` del rasgo. El texto del titulo SIEMPRE
// usa tinta calida del sistema; el color de familia es solo el punto.
// Regla del diseno: `cuesta` jamas en rojo (lavanda), para no estigmatizar.
const COLOR_FAMILIA = {
  mueve:      '#E56E26', // naranja
  fortalezas: '#8FA840', // verde
  cuesta:     '#6C8EF5', // lavanda — jamas rojo
  calma:      '#9B7B6A', // mocha
}

/**
 * Card de propuesta de rasgo. Huella propone UN rasgo candidato y el papa/mama
 * confirma o descarta. El componente no decide cual mostrar: solo renderiza el
 * rasgo que le pasan y delega la accion en onConfirmar / onDescartar.
 *
 * @param {Object}   rasgo         Rasgo en shape de app (id, familia, titulo, evidenciaCount...).
 * @param {string}   nombreHijo    Nombre del hijo/a para el encabezado.
 * @param {Function} onConfirmar   Se llama con rasgo.id al confirmar.
 * @param {Function} onDescartar   Se llama con rasgo.id al descartar.
 */
export default function PropuestaRasgo({ rasgo, nombreHijo, onConfirmar, onDescartar }) {
  if (!rasgo) return null

  const colorDot = COLOR_FAMILIA[rasgo.familia] ?? 'var(--color-text-muted)'
  const nombre = nombreHijo || 'tu hijo/a'

  return (
    <article className={s.card}>
      <div className={s.head}>
        <span className={s.avatar} aria-hidden="true">
          <Escarabajo className={s.bicho} />
        </span>
        <p className={s.intro}>Huella noto algo en {nombre}</p>
      </div>

      <h3 className={s.titulo}>
        <span className={s.dot} style={{ background: colorDot }} aria-hidden="true" />
        {rasgo.titulo}
      </h3>

      <p className={s.evidencia}>
        Notado <b>{rasgo.evidenciaCount}</b> {rasgo.evidenciaCount === 1 ? 'vez' : 'veces'}
      </p>

      <div className={s.acciones}>
        <button
          type="button"
          className={s.btnPrimario}
          onClick={() => onConfirmar?.(rasgo.id)}
        >
          Si, lo reconozco
        </button>
        <button
          type="button"
          className={s.btnSecundario}
          onClick={() => onDescartar?.(rasgo.id)}
        >
          Esto no lo veo en el
        </button>
      </div>
    </article>
  )
}
