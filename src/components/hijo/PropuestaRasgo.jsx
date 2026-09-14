import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import { palabrasGenero } from '../../utils/genero'
import s from './PropuestaRasgo.module.css'

// Colores por familia, en hex plano. Vienen del diseno aprobado de la Fase 1
// "el retrato que madura". Esta card YA NO los usa: desde el 14 sep dice la
// familia con la baldosa y la pildora del sistema de EpisodioCard, que traen
// su par de fondo y texto resuelto en claro y en oscuro.
//
// El mapa se mantiene porque lo consume la ficha de las 4 familias del
// retrato en HijoPage, que los pinta como punto de color.
// Regla del diseno: `cuesta` jamas en rojo (lavanda), para no estigmatizar.
export const COLOR_FAMILIA = {
  mueve:      '#E56E26', // naranja
  fortalezas: '#8FA840', // verde
  cuesta:     '#6C8EF5', // lavanda — jamas rojo
  calma:      '#9B7B6A', // mocha
}

// La familia se dice con color Y con palabra, igual que EpisodioCard dice el
// tipo del momento con la baldosa y la pildora. El color solo no alcanza:
// nadie nace sabiendo que el azul es "lo que le cuesta".
//
// Las pildoras son las mismas cinco del historial, que ya tienen su par de
// fondo y texto resuelto en claro y en oscuro. `calma` toma el mocha apagado
// de las pildoras de emocion, que es el unico neutro calido del juego y va
// con el sentido de la familia.
const PILL_FAMILIA = {
  mueve:      'tangerine',
  fortalezas: 'green',
  cuesta:     'blue',
  calma:      'emocion',
}

// El mismo texto que la ficha de familias del retrato en HijoPage, para que
// el papa lea lo mismo en los dos lugares.
const ETIQUETA_FAMILIA = {
  mueve:      'Lo que lo mueve',
  fortalezas: 'Sus fortalezas',
  cuesta:     'Lo que le cuesta',
  calma:      'Lo que lo calma',
}

/**
 * Card de propuesta de rasgo. Huella propone UN rasgo candidato y el papa/mama
 * confirma o descarta. El componente no decide cual mostrar: solo renderiza el
 * rasgo que le pasan y delega la accion en onConfirmar / onDescartar.
 *
 * @param {Object}   rasgo         Rasgo en shape de app (id, familia, titulo, evidenciaCount...).
 * @param {string}   nombreHijo    Nombre del hijo/a para el encabezado.
 * @param {Object}   hijo          Hijo en shape de app; solo se lee su genero.
 * @param {Function} onConfirmar   Se llama con rasgo.id al confirmar.
 * @param {Function} onDescartar   Se llama con rasgo.id al descartar.
 */
export default function PropuestaRasgo({ rasgo, nombreHijo, hijo, onConfirmar, onDescartar }) {
  if (!rasgo) return null

  const nombre = nombreHijo || 'tu hijo/a'
  // Una familia desconocida no rompe la card: cae al tangerine de la marca y
  // se queda sin pildora, que es lo mismo que hace el historial con un
  // gatillante que no reconoce.
  const pill = PILL_FAMILIA[rasgo.familia] ?? 'tangerine'
  const etiqueta = ETIQUETA_FAMILIA[rasgo.familia] ?? null

  // Descartar en la voz del hijo/a. Con genero no binario o sin genero
  // guardado NO se fuerza un pronombre: la frase se reformula para no nombrar
  // a nadie ("no lo veo asi"), que dice lo mismo sin inventarle un pronombre
  // al nino. Por eso aca no sirve el `pronombre` del helper para los cuatro
  // casos y se decide por `codigo`.
  const { codigo } = palabrasGenero(hijo)
  const textoDescartar =
    codigo === 'm' ? 'Esto no lo veo en él'
    : codigo === 'f' ? 'Esto no lo veo en ella'
    : 'Esto no lo veo así'

  return (
    <article className={s.card}>
      <div className={`${s.baldosa} ${s[`baldosa_${pill}`]}`} aria-hidden="true">
        <Escarabajo className={s.bicho} />
      </div>

      <div className={s.body}>
        <p className={s.intro}>Huella notó algo en {nombre}</p>

        <h3 className={s.titulo}>{rasgo.titulo}</h3>

        <div className={s.meta}>
          {etiqueta && (
            <span className={`${s.pill} ${s[`pill_${pill}`]}`}>{etiqueta}</span>
          )}
          <span className={s.evidencia}>
            Notado <b>{rasgo.evidenciaCount}</b> {rasgo.evidenciaCount === 1 ? 'vez' : 'veces'}
          </span>
        </div>

        <div className={s.acciones}>
          <button
            type="button"
            className={s.btnPrimario}
            onClick={() => onConfirmar?.(rasgo.id)}
          >
            Sí, lo reconozco
          </button>
          <button
            type="button"
            className={s.btnSecundario}
            onClick={() => onDescartar?.(rasgo.id)}
          >
            {textoDescartar}
          </button>
        </div>
      </div>
    </article>
  )
}
