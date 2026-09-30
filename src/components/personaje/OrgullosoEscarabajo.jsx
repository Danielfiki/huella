import React from 'react'
import BienvenidaEscarabajo from './BienvenidaEscarabajo'
import { marcarOrgulloso } from './orgulloso'
import styles from './OrgullosoEscarabajo.module.css'

// Visita de orgulloso: la misma capa, el mismo arranque en iOS y los mismos
// seguros que la bienvenida del Home (sube desde la barra, el tramo una vez y
// se desmonta en `ended`; si no puede correr, no aparece nada). Solo cambian
// las variantes y lo que se marca con el primer cuadro: la variante mostrada,
// para no repetirla la proxima vez.
export default function OrgullosoEscarabajo({ userId, variante, alTerminar }) {
  return (
    <BienvenidaEscarabajo
      userId={userId}
      variante={variante}
      alTerminar={alTerminar}
      estilos={styles}
      alPrimerCuadro={() => marcarOrgulloso(userId, variante.id)}
    />
  )
}
