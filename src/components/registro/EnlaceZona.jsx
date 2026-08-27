import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import styles from './EnlaceZona.module.css'

// Paso 8 — el enlace que cierra la orientacion y lleva al Cerebro Huella con la
// zona ya abierta.
//
// Es deliberadamente MAS CALLADO que el CTA del Home (`TarjetaCerebro`): alla el
// padre esta navegando y hay que invitarlo, con fondo propio y un punto que
// late. Aca viene leyendo algo que le costo contar, asi que el enlace es
// presencia y no anuncio: sin fondo, sin latido, tipografia de cuerpo, y el
// punto de color de la zona como unica seña visual.
//
// Si no hay zona no se renderiza nada. El silencio es una salida valida del
// paso 8, no un error: la IA devuelve "ninguna" cuando ninguna zona explica el
// episodio o cuando amerita mirada profesional, y los episodios anteriores a la
// migracion 014 tampoco tienen zona.

// La etiqueta corta de cada zona, en la forma en que cabe despues de "Ver".
//
// Vive aca y NO en `contenidoCerebro.js` a proposito: ese archivo es copy
// portado literal del prototipo congelado y su propia cabecera dice que no se
// reescribe ni se amplia desde el codigo. Los nombres largos que si viven alla
// ("La corteza prefrontal") no caben en una linea de cierre.
const ETIQUETAS = {
  amigdala:  'su amigdala',
  frontal:   'su corteza prefrontal',
  hipocampo: 'su hipocampo',
  cerebelo:  'su cerebelo',
  tronco:    'su tronco cerebral',
  corteza:   'su corteza cerebral',
}

export default function EnlaceZona({ zona }) {
  const navigate = useNavigate()
  const etiqueta = ETIQUETAS[zona]

  // Slug desconocido: se ignora en silencio. Puede pasar si el modelo inventa
  // una palabra que igual paso el filtro, o si algun dia se agrega una zona a
  // `contenidoCerebro.js` y se olvida esta tabla.
  if (!etiqueta) return null

  return (
    <button
      type="button"
      className={styles.enlace}
      onClick={() => navigate(`/cerebro?zona=${zona}`)}
    >
      {/* El color entra por el token gemelo de la zona, nunca por hex: es el
          mismo valor que usa el chip del cerebro y el material 3D. */}
      <span
        className={styles.punto}
        style={{ background: `var(--cerebro-zona-${zona})` }}
        aria-hidden="true"
      />
      <span className={styles.texto}>Ver {etiqueta}</span>
      <ChevronRight className={styles.flecha} size={14} aria-hidden="true" />
    </button>
  )
}
