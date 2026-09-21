import React, { useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'
import styles from './CardPlegable.module.css'

// Card plegable: chip con ícono, título (y subtítulo opcional) y un chevron en
// disco. Nació como la "Orientación completa" del post-guardado del episodio
// (RegistroPage) y se sacó acá para reusarla en el análisis semanal del Home
// sin cambiar cómo se ve allá.
//
// Controlada o no: si llega `abierto`, manda el padre (RegistroPage espera a
// que termine el stream antes de dejar abrirla); si no, lleva su propio
// estado y arranca cerrada.
//
// `icono` reemplaza el libro del chip (el análisis Free pone un candado).
// `className` se suma a la card, para cuando vive dentro de otra card y no
// necesita borde ni sombra propios.
// `cabecera` reemplaza chip + título por lo que quiera el que la usa (el
// análisis semanal pone el escarabajo y su eyebrow); el chevron se mantiene.
// `resumen` se ve SIEMPRE, abierta o cerrada, entre la cabecera y lo plegado.
export default function CardPlegable({
  titulo,
  subtitulo,
  icono,
  cabecera,
  resumen,
  abierto: abiertoControlado,
  onToggle,
  className = '',
  children,
}) {
  const [abiertoPropio, setAbiertoPropio] = useState(false)
  const controlada = abiertoControlado !== undefined
  const abierto = controlada ? abiertoControlado : abiertoPropio

  function alternar() {
    if (onToggle) onToggle()
    if (!controlada) setAbiertoPropio((v) => !v)
  }

  return (
    <section className={`${styles.card} ${className}`}>
      <button
        className={styles.head}
        onClick={alternar}
        aria-expanded={abierto}
        type="button"
      >
        {cabecera ? (
          <span className={styles.textos}>{cabecera}</span>
        ) : (
          <>
            <span className={styles.chip} aria-hidden="true">
              {icono ?? <BookOpen size={14} />}
            </span>
            <span className={styles.textos}>
              <span className={styles.titulo}>{titulo}</span>
              {subtitulo && <span className={styles.sub}>{subtitulo}</span>}
            </span>
          </>
        )}
        <span className={styles.chevronDisco} aria-hidden="true">
          <ChevronDown
            size={15}
            className={`${styles.chevron} ${abierto ? styles.chevronAbierto : ''}`}
          />
        </span>
      </button>
      {resumen}
      {abierto && children}
    </section>
  )
}
