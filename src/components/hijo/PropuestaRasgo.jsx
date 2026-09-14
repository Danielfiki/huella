import React from 'react'
import Escarabajo from '../ui/Escarabajo'
import { palabrasGenero } from '../../utils/genero'
import s from './PropuestaRasgo.module.css'

// Colores por familia, en hex plano. Vienen del diseno aprobado de la Fase 1
// "el retrato que madura". Esta card YA NO los usa: desde el 14 sep toma
// entera el color de su familia con el par fondo/texto de las pildoras del
// sistema, que trae su version clara y oscura resuelta.
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

// Las 4 familias que la card sabe pintar. Cada una tiene su clase en el
// module.css, que define el par --fam-bg / --fam-tinta con tokens del
// sistema: tangerine y pistacho, cada uno pleno y suave.
const FAMILIAS_CARD = ['mueve', 'cuesta', 'fortalezas', 'calma']

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
  // Una familia desconocida no rompe la card: cae a `mueve`, el tangerine
  // pleno de la marca, igual que hace el historial con un gatillante que no
  // reconoce.
  const familia = FAMILIAS_CARD.includes(rasgo.familia) ? rasgo.familia : 'mueve'

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
    <article className={`${s.card} ${s[`card_${familia}`]}`}>
      <div className={s.head}>
        <div className={s.tile} aria-hidden="true">
          <Escarabajo className={s.bicho} />
        </div>
        <p className={s.intro}>Huella notó algo en {nombre}</p>
      </div>

      <h3 className={s.titulo}>
        <span className={s.dot} aria-hidden="true" />
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
    </article>
  )
}
