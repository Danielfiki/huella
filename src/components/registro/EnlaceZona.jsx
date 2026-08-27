import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import styles from './EnlaceZona.module.css'

// Paso 8 — el enlace que cierra la orientacion y lleva al Cerebro Huella con la
// zona ya abierta.
//
// La primera version era una linea de texto pelada, deliberadamente callada. El
// QA de Daniel la descarto: quedaba camuflada entre los parrafos y nadie la iba
// a tocar. Asi que sube a FILA CTA, de la misma familia que `.ctaCerebro` del
// Home — fondo suave, radio, padding comodo de tap y el punto latiendo al mismo
// ritmo. Aca ya no estorba: llega despues de que el padre termino de leer, y es
// justo el momento en que ofrecer algo mas tiene sentido.
//
// El copy NO nombra la zona. La representa el punto de color, que es el mismo
// que va a ver encendido al otro lado — la pantalla del cerebro se encarga de
// ponerle nombre. Para lectores de pantalla el nombre si viaja, en el
// aria-label: un punto de color no dice nada en voz alta.
//
// Si no hay zona no se renderiza nada. El silencio es una salida valida del
// paso 8, no un error: la IA devuelve "ninguna" cuando ninguna zona explica el
// episodio o cuando amerita mirada profesional, y los episodios anteriores a la
// migracion 014 tampoco tienen zona.

// Solo para el aria-label. El texto visible es el mismo para las seis zonas.
const NOMBRES = {
  amigdala:  'la amigdala',
  frontal:   'la corteza prefrontal',
  hipocampo: 'el hipocampo',
  cerebelo:  'el cerebelo',
  tronco:    'el tronco cerebral',
  corteza:   'la corteza cerebral',
}

export default function EnlaceZona({ zona }) {
  const navigate = useNavigate()
  const nombre = NOMBRES[zona]

  // Slug desconocido: se ignora en silencio. Puede pasar si el modelo inventa
  // una palabra que igual paso el filtro, o si algun dia se agrega una zona a
  // `contenidoCerebro.js` y se olvida esta tabla.
  if (!nombre) return null

  return (
    <button
      type="button"
      className={styles.enlace}
      onClick={() => navigate(`/cerebro?zona=${zona}`)}
      aria-label={`Mira lo que se encendio en su cerebro: ${nombre}`}
    >
      {/* El color entra por el token gemelo de la zona, nunca por hex: es el
          mismo valor que usa el chip del cerebro y el material 3D. */}
      <span
        className={styles.punto}
        style={{ background: `var(--cerebro-zona-${zona})` }}
        aria-hidden="true"
      />
      <span className={styles.texto}>Mira lo que se encendió en su cerebro</span>
      <ChevronRight className={styles.flecha} size={16} aria-hidden="true" />
    </button>
  )
}
