import React, { useState, useEffect, lazy, Suspense } from 'react'
import Escarabajo from '../ui/Escarabajo'
import styles from './SelloPensando.module.css'

// El sello de la pantalla de guardado ("huella te lee"). Mientras Huella genera
// la orientacion (`activo`), y solo si viene `pensando` (todos los usuarios,
// sin movimiento reducido), el escarabajo pensando ocupa la misma caja del
// sello. Mientras el video carga la caja queda vacia (los puntitos siguen
// abajo): el escarabajo entra con fundido cuando pinta su primer cuadro, y si
// no pinta en 2,5 s entra el sello con el mismo fundido. Nunca se ven los dos.
// Al terminar la orientacion, fundido de 150 ms de vuelta al sello. La variante
// se anota como la ultima mostrada al pintar el primer cuadro (`alMostrar`).
const PensandoEscarabajo = lazy(() => import('./PensandoEscarabajo'))
const TOPE_CUADRO = 2500

export default function SelloPensando({ pensando, activo, alMostrar, className }) {
  const [dibujado, setDibujado] = useState(false)
  const [fuera, setFuera] = useState(false)
  const [visto, setVisto] = useState(activo)
  const conEscarabajo = !!pensando && !fuera

  useEffect(() => { if (activo) setVisto(true) }, [activo])

  // primer cuadro de verdad: recien ahi cuenta como la ultima mostrada
  useEffect(() => { if (dibujado) alMostrar?.() }, [dibujado]) // eslint-disable-line react-hooks/exhaustive-deps

  // tope: sin primer cuadro en 2,5 s, el escarabajo sale y entra el sello
  useEffect(() => {
    if (!conEscarabajo || dibujado) return undefined
    const id = setTimeout(() => setFuera(true), TOPE_CUADRO)
    return () => clearTimeout(id)
  }, [conEscarabajo, dibujado])

  return (
    <div className={styles.sello}>
      <span className={`${styles.bicho} ${conEscarabajo && (activo || !visto) ? styles.oculto : ''}`}>
        <Escarabajo className={className} />
      </span>
      {conEscarabajo && (
        <Suspense fallback={null}>
          <PensandoEscarabajo
            variante={pensando}
            visible={activo}
            className={styles.enSello}
            alDibujar={() => setDibujado(true)}
            alFallar={() => setFuera(true)}
            alTerminar={() => setFuera(true)}
          />
        </Suspense>
      )}
    </div>
  )
}
