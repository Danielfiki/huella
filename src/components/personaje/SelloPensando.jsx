import React, { useState, lazy, Suspense } from 'react'
import Escarabajo from '../ui/Escarabajo'
import styles from './SelloPensando.module.css'

// El sello de la pantalla de guardado ("huella te lee"). Mientras Huella genera
// la orientacion (`activo`), y solo si viene `pensando` (la cuenta de Daniel,
// sin movimiento reducido), el escarabajo pensando ocupa la misma caja del
// sello. El sello se va recien cuando el video ya pinto un cuadro: si nunca
// llega, queda el sello y nunca hay un hueco en blanco. Al terminar la
// orientacion, fundido de 150 ms de vuelta al sello.
const PensandoEscarabajo = lazy(() => import('./PensandoEscarabajo'))

export default function SelloPensando({ pensando, activo, className }) {
  const [dibujado, setDibujado] = useState(false)
  const [fuera, setFuera] = useState(false)
  const conEscarabajo = !!pensando && !fuera

  return (
    <div className={styles.sello}>
      <span className={`${styles.bicho} ${conEscarabajo && dibujado && activo ? styles.oculto : ''}`}>
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
