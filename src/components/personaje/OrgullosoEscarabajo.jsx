import React from 'react'
import BienvenidaEscarabajo from './BienvenidaEscarabajo'
import { marcarOrgulloso } from './orgulloso'
import styles from './OrgullosoEscarabajo.module.css'

// Visita de orgulloso: la misma capa, el mismo arranque en iOS y los mismos
// seguros que la bienvenida del Home (sube desde la barra, el tramo una vez y
// se desmonta en `ended`; si no puede correr, no aparece nada). Solo cambian
// las variantes y lo que se marca con el primer cuadro: la variante mostrada,
// para no repetirla la proxima vez.
// `izquierda`: pegado a la izquierda (sobre "Inicio") en vez de al centro.
export default function OrgullosoEscarabajo({ userId, variante, alTerminar, izquierda }) {
  const estilos = izquierda ? { ...styles, [variante.id]: `${styles[variante.id]} ${styles.izquierda}` } : styles
  return (
    <BienvenidaEscarabajo
      userId={userId}
      variante={variante}
      alTerminar={alTerminar}
      estilos={estilos}
      alPrimerCuadro={() => marcarOrgulloso(userId, variante.id)}
    />
  )
}
